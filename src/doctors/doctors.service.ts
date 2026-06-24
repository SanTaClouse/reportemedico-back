import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Prisma, DoctorStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { RevalidationService } from '../revalidation/revalidation.service'
import { EmailService } from '../email/email.service'
import { stripAllHtml } from '../utils/sanitize.util'
import slugify from 'slugify'
import { randomBytes } from 'crypto'
import { CreateDoctorDto } from './dto/create-doctor.dto'
import { UpdateDoctorDto } from './dto/update-doctor.dto'
import {
  UpdateDoctorStatusDto, UpdateDoctorPlanDto, UpdateDoctorVerificationDto,
  CreateDoctorBenefitDto, UpdateDoctorBenefitDto, MergeDoctorsDto,
} from './dto/doctor-admin.dtos'

const CLAIM_TOKEN_DAYS = 14

// Campos escalares que el admin puede elegir conservar del duplicado al fusionar (07 §2)
const MERGEABLE_FIELDS = [
  'title', 'firstName', 'lastName', 'email', 'phonePublic', 'phoneInternal', 'phoneOffice',
  'instagram', 'bio', 'photoUrl', 'videoUrl', 'exequatur', 'languages', 'telehealth',
] as const
type MergeableField = (typeof MERGEABLE_FIELDS)[number]

@Injectable()
export class DoctorsService {
  private readonly logger = new Logger(DoctorsService.name)

  constructor(
    private prisma: PrismaService,
    private revalidation: RevalidationService,
    private emailService: EmailService,
  ) {}

  private readonly fullInclude = {
    specialties: { include: { specialty: true }, orderBy: { order: 'asc' as const } },
    clinics: { include: { clinic: { include: { city: true } } } },
    insurances: { include: { insurance: true } },
  }

  // ─── Lectura pública ────────────────────────────────────────────────────────

  /** Ficha pública: solo PUBLISHED (04 §2 — DRAFT/PENDING/INACTIVE → 404) */
  async findPublicBySlug(slug: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { slug },
      include: {
        ...this.fullInclude,
        // Artículos del médico (04 §1.7) — solo publicados
        articles: {
          where: { status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
          take: 4,
          select: {
            id: true, title: true, slug: true, excerpt: true,
            featuredImage: true, publishedAt: true, type: true,
          },
        },
      },
    })
    if (!doctor || doctor.status !== DoctorStatus.PUBLISHED) {
      throw new NotFoundException('Médico no encontrado')
    }
    const related = await this.findRelated(doctor)
    // Los campos internos no salen al público
    const { phoneInternal, planNotes, auth0Sub, email, plan, needsReverify, ...publicDoctor } = doctor
    return { ...publicDoctor, related }
  }

  /**
   * Médicos relacionados (✅ confirmado por el cliente — 04 §1.9):
   * misma especialidad principal + alguna ciudad en común, solo PUBLISHED, máx 4.
   */
  private async findRelated(doctor: {
    id: string
    specialties: { order: number; specialty: { id: string } }[]
    clinics: { clinic: { city: { id: string } } }[]
  }) {
    const principal = doctor.specialties.find((s) => s.order === 0) ?? doctor.specialties[0]
    const cityIds = [...new Set(doctor.clinics.map((c) => c.clinic.city.id))]
    if (!principal || !cityIds.length) return []

    const related = await this.prisma.doctor.findMany({
      where: {
        id: { not: doctor.id },
        status: DoctorStatus.PUBLISHED,
        specialties: { some: { specialtyId: principal.specialty.id } },
        clinics: { some: { clinic: { cityId: { in: cityIds } } } },
      },
      include: this.fullInclude,
      take: 4,
    })
    return related.map((d) => this.toPublicCard(d))
  }

  /**
   * Listado público para programáticas y página de clínica: solo PUBLISHED,
   * orden confirmado por el cliente (05 §3): premium → verificado →
   * completitud → rotación estable con semilla diaria.
   * El plan NO se expone en la respuesta (el plan es invisible al paciente, 04).
   */
  async findPublicList(params: { specialtySlug?: string; citySlug?: string; clinicSlug?: string }) {
    const { specialtySlug, citySlug, clinicSlug } = params
    const doctors = await this.prisma.doctor.findMany({
      where: {
        status: DoctorStatus.PUBLISHED,
        ...(specialtySlug ? { specialties: { some: { specialty: { slug: specialtySlug } } } } : {}),
        ...(citySlug ? { clinics: { some: { clinic: { city: { slug: citySlug } } } } } : {}),
        ...(clinicSlug ? { clinics: { some: { clinic: { slug: clinicSlug } } } } : {}),
      },
      include: this.fullInclude,
    })

    const seed = new Date().toISOString().slice(0, 10) // rotación estable por día
    const ranked = doctors
      .map((d) => ({
        doctor: d,
        premium: d.plan === 'PREMIUM' ? 1 : 0,
        verified: d.isVerified ? 1 : 0,
        completeness: [d.photoUrl, d.bio, d.phonePublic, d.insurances.length > 0, d.clinics.some((c) => c.schedule)]
          .filter(Boolean).length,
        rotation: this.stableHash(d.id + seed),
      }))
      .sort(
        (a, b) =>
          b.premium - a.premium ||
          b.verified - a.verified ||
          b.completeness - a.completeness ||
          a.rotation - b.rotation,
      )

    return ranked.map((r) => this.toPublicCard(r.doctor))
  }

  /**
   * Búsqueda pública (05 §2, §8): filtros componibles, SIEMPRE sobre PUBLISHED.
   * Con geolocalización: ordena por distancia mínima a las clínicas del médico
   * (Haversine; con catálogos de cientos de filas se resuelve en memoria sobre
   * el set ya filtrado). Sin geo: el orden confirmado (premium → verificado →
   * completitud → rotación diaria).
   */
  async search(params: {
    insurance?: string
    specialty?: string
    city?: string
    clinic?: string
    q?: string
    telehealth?: boolean
    lat?: number
    lng?: number
    page?: number
    limit?: number
  }) {
    const { insurance, specialty, city, clinic, q, telehealth, lat, lng } = params
    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(50, Math.max(1, params.limit ?? 20))

    const doctors = await this.prisma.doctor.findMany({
      where: {
        status: DoctorStatus.PUBLISHED,
        ...(insurance ? { insurances: { some: { insurance: { slug: insurance } } } } : {}),
        ...(specialty ? { specialties: { some: { specialty: { slug: specialty } } } } : {}),
        ...(city ? { clinics: { some: { clinic: { city: { slug: city } } } } } : {}),
        ...(clinic ? { clinics: { some: { clinic: { slug: clinic } } } } : {}),
        ...(telehealth ? { telehealth: true } : {}),
      },
      include: this.fullInclude,
    })

    // Búsqueda por nombre insensible a tildes ("perez" matchea "Pérez") —
    // mismo patrón en memoria que tags.checkExists de V1; con cientos de
    // médicos no justifica unaccent/tsvector todavía
    const normalizedQ = q ? this.stripAccents(q) : null
    const filtered = normalizedQ
      ? doctors.filter((d) =>
          this.stripAccents(`${d.firstName} ${d.lastName}`).includes(normalizedQ),
        )
      : doctors

    const useGeo = typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)
    const seed = new Date().toISOString().slice(0, 10)

    const ranked = filtered
      .map((d) => ({
        doctor: d,
        premium: d.plan === 'PREMIUM' ? 1 : 0,
        verified: d.isVerified ? 1 : 0,
        completeness: [d.photoUrl, d.bio, d.phonePublic, d.insurances.length > 0, d.clinics.some((c) => c.schedule)]
          .filter(Boolean).length,
        rotation: this.stableHash(d.id + seed),
        distanceKm: useGeo
          ? Math.min(
              ...d.clinics
                .filter((c) => c.clinic.latitude != null && c.clinic.longitude != null)
                .map((c) => this.haversineKm(lat!, lng!, c.clinic.latitude!, c.clinic.longitude!)),
              Infinity,
            )
          : null,
      }))
      .sort((a, b) => {
        // Con geo, la distancia mínima manda; el resto desempata (05 §3)
        if (useGeo && a.distanceKm !== b.distanceKm) return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
        return (
          b.premium - a.premium ||
          b.verified - a.verified ||
          b.completeness - a.completeness ||
          a.rotation - b.rotation
        )
      })

    const total = ranked.length
    const items = ranked.slice((page - 1) * limit, page * limit).map((r) => ({
      ...this.toPublicCard(r.doctor),
      distanceKm: r.distanceKm !== null && isFinite(r.distanceKm) ? Math.round(r.distanceKm * 10) / 10 : null,
    }))

    return { items, total, page, limit }
  }

  /** Typeahead (05 §2): médicos publicados + clínicas con médicos publicados */
  async suggest(q: string) {
    const query = this.stripAccents(q.trim())
    if (query.length < 2) return []

    // Filtro insensible a tildes en memoria (escala actual: cientos de filas)
    const [allDoctors, allClinics] = await Promise.all([
      this.prisma.doctor.findMany({
        where: { status: DoctorStatus.PUBLISHED },
        select: {
          slug: true, title: true, firstName: true, lastName: true, photoUrl: true,
          specialties: {
            orderBy: { order: 'asc' }, take: 1,
            select: { specialty: { select: { name: true } } },
          },
        },
      }),
      this.prisma.clinic.findMany({
        where: { doctors: { some: { doctor: { status: DoctorStatus.PUBLISHED } } } },
        select: { slug: true, name: true, city: { select: { name: true } } },
      }),
    ])

    const doctors = allDoctors
      .filter((d) => this.stripAccents(`${d.firstName} ${d.lastName}`).includes(query))
      .slice(0, 5)
    const clinics = allClinics
      .filter((c) => this.stripAccents(c.name).includes(query))
      .slice(0, 3)

    return [
      ...doctors.map((d) => ({
        type: 'doctor' as const,
        slug: d.slug,
        label: `${d.title ?? ''} ${d.firstName} ${d.lastName}`.trim(),
        sublabel: d.specialties[0]?.specialty.name ?? null,
        photoUrl: d.photoUrl,
      })),
      ...clinics.map((c) => ({
        type: 'clinic' as const,
        slug: c.slug,
        label: c.name,
        sublabel: c.city.name,
        photoUrl: null,
      })),
    ]
  }

  /** Quita acentos y pasa a minúsculas (mismo helper que tags de V1) */
  private stripAccents(str: string): string {
    return str
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  /** Card pública: solo los campos que el paciente ve (sin plan ni internos) */
  private toPublicCard(d: {
    id: string; slug: string; title: string | null; firstName: string; lastName: string
    photoUrl: string | null; isVerified: boolean; telehealth: boolean; languages: string[]
    phonePublic: string | null; bio: string | null
    specialties: { order: number; specialty: { slug: string; name: string } }[]
    clinics: { schedule: string | null; clinic: { slug: string; name: string; address: string; latitude: number | null; longitude: number | null; city: { slug: string; name: string } } }[]
    insurances: { insurance: { slug: string; name: string } }[]
  }) {
    return {
      id: d.id,
      slug: d.slug,
      title: d.title,
      firstName: d.firstName,
      lastName: d.lastName,
      photoUrl: d.photoUrl,
      isVerified: d.isVerified,
      telehealth: d.telehealth,
      languages: d.languages,
      phonePublic: d.phonePublic,
      excerpt: d.bio ? d.bio.slice(0, 160) : null,
      specialties: d.specialties
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ slug: s.specialty.slug, name: s.specialty.name })),
      clinics: d.clinics.map((c) => ({
        slug: c.clinic.slug,
        name: c.clinic.name,
        address: c.clinic.address,
        latitude: c.clinic.latitude,
        longitude: c.clinic.longitude,
        schedule: c.schedule,
        city: c.clinic.city,
      })),
      insurances: d.insurances.map((i) => ({ slug: i.insurance.slug, name: i.insurance.name })),
    }
  }

  private stableHash(input: string): number {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash)
  }

  /**
   * UMBRAL DE INDEXACIÓN P7 — única fuente de verdad (03 §1).
   * Devuelve solo entidades/combinaciones con ≥1 médico PUBLISHED.
   * La consumen: sitemap, páginas programáticas y generadores de links internos.
   */
  async getIndexableCombinations() {
    const publishedDoctor = { doctor: { status: DoctorStatus.PUBLISHED } }

    const [specialties, cities, clinics, pairs] = await Promise.all([
      this.prisma.specialty.findMany({
        where: { doctors: { some: publishedDoctor } },
        select: { slug: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.city.findMany({
        where: { clinics: { some: { doctors: { some: publishedDoctor } } } },
        select: { slug: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.clinic.findMany({
        where: { doctors: { some: publishedDoctor } },
        select: { slug: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.$queryRaw<{ specialtySlug: string; citySlug: string }[]>`
        SELECT DISTINCT s.slug AS "specialtySlug", ci.slug AS "citySlug"
        FROM "DoctorSpecialty" ds
        JOIN "Doctor" d   ON d.id = ds."doctorId" AND d.status = 'PUBLISHED'
        JOIN "Specialty" s ON s.id = ds."specialtyId"
        JOIN "DoctorClinic" dc ON dc."doctorId" = d.id
        JOIN "Clinic" c   ON c.id = dc."clinicId"
        JOIN "City" ci    ON ci.id = c."cityId"
        ORDER BY "specialtySlug", "citySlug"
      `,
    ])

    return { specialties, cities, clinics, pairs }
  }

  // ─── Admin: listado y detalle ───────────────────────────────────────────────

  async findAll(params: { status?: DoctorStatus; search?: string; page?: number; limit?: number }) {
    const { status, search, page = 1, limit = 20 } = params
    const where: Prisma.DoctorWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { exequatur: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
    const [items, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where,
        include: this.fullInclude,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.doctor.count({ where }),
    ])
    return { items, total, page, limit }
  }

  async findOne(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        ...this.fullInclude,
        benefits: { orderBy: { createdAt: 'desc' as const } },
        claimTokens: { orderBy: { createdAt: 'desc' as const } },
        _count: { select: { articles: true, whatsappClicks: true, sessions: true } },
      },
    })
    if (!doctor) throw new NotFoundException('Médico no encontrado')
    return doctor
  }

  /** Conteo para el badge del nav del admin (07 §8): pendientes + re-verificaciones */
  async countPending() {
    const [count, reverifyCount] = await Promise.all([
      this.prisma.doctor.count({ where: { status: DoctorStatus.PENDING } }),
      this.prisma.doctor.count({ where: { needsReverify: true } }),
    ])
    return { count, reverifyCount }
  }

  /** Médicos publicados que editaron su identidad y esperan re-verificación (06 §7) */
  findNeedingReverify() {
    return this.prisma.doctor.findMany({
      where: { needsReverify: true },
      include: this.fullInclude,
      orderBy: { updatedAt: 'desc' },
    })
  }

  /**
   * Posibles duplicados de un médico (07 §1, §2): otros perfiles con el mismo
   * nombre+apellido (insensible a mayúsculas) o el mismo exequátur. Pista para
   * que el admin decida si fusionar.
   */
  async findPotentialDuplicates(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, exequatur: true },
    })
    if (!doctor) throw new NotFoundException('Médico no encontrado')

    const orClauses: Prisma.DoctorWhereInput[] = [
      {
        firstName: { equals: doctor.firstName, mode: 'insensitive' },
        lastName: { equals: doctor.lastName, mode: 'insensitive' },
      },
    ]
    if (doctor.exequatur) orClauses.push({ exequatur: doctor.exequatur })

    return this.prisma.doctor.findMany({
      where: { id: { not: id }, OR: orClauses },
      include: this.fullInclude,
      orderBy: { createdAt: 'asc' },
    })
  }

  /**
   * Tabla de engagement del admin (07 §7): una fila por médico con última
   * conexión, sesiones y clics de WhatsApp (30d y total), y artículos.
   */
  async getEngagement() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const [doctors, clicks30, sessions30, viaEmail] = await Promise.all([
      this.prisma.doctor.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, slug: true, title: true, firstName: true, lastName: true,
          plan: true, status: true,
          _count: { select: { articles: true, whatsappClicks: true, sessions: true } },
          sessions: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
        },
      }),
      this.prisma.whatsAppClick.groupBy({
        by: ['doctorId'], where: { createdAt: { gte: since } }, _count: { _all: true },
      }),
      this.prisma.sessionLog.groupBy({
        by: ['doctorId'], where: { createdAt: { gte: since } }, _count: { _all: true },
      }),
      // Sesiones que entraron desde un email (atribución, 08 §2)
      this.prisma.sessionLog.groupBy({
        by: ['doctorId'], where: { viaEmailId: { not: null } }, _count: { _all: true },
      }),
    ])
    const clickMap = new Map(clicks30.map((c) => [c.doctorId, c._count._all]))
    const sessMap = new Map(sessions30.map((s) => [s.doctorId, s._count._all]))
    const emailMap = new Map(viaEmail.map((s) => [s.doctorId, s._count._all]))

    return doctors.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: `${d.title ?? ''} ${d.firstName} ${d.lastName}`.trim(),
      plan: d.plan,
      status: d.status,
      lastSession: d.sessions[0]?.createdAt ?? null,
      sessions30d: sessMap.get(d.id) ?? 0,
      sessionsTotal: d._count.sessions,
      whatsappClicks30d: clickMap.get(d.id) ?? 0,
      whatsappClicksTotal: d._count.whatsappClicks,
      viaEmailSessions: emailMap.get(d.id) ?? 0,
      articles: d._count.articles,
    }))
  }

  // ─── Recordatorios de wizard incompleto (cron, 06 §4) ──────────────────────

  /**
   * Cada 6h: a los médicos que se registraron pero dejaron el perfil en DRAFT,
   * les recuerda completarlo a las 48h y a los 7 días. Máximo 2 recordatorios,
   * después silencio. Solo a perfiles auto-registrados (auth0Sub) con email.
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async wizardRemindersCron() {
    const drafts = await this.prisma.doctor.findMany({
      where: {
        status: DoctorStatus.DRAFT,
        auth0Sub: { not: null },
        email: { not: null },
        wizardRemindersSent: { lt: 2 },
      },
      select: {
        id: true, email: true, title: true, firstName: true, lastName: true,
        createdAt: true, wizardRemindersSent: true,
      },
    })
    const now = Date.now()
    const H48 = 48 * 60 * 60 * 1000
    const D7 = 7 * 24 * 60 * 60 * 1000

    for (const d of drafts) {
      const age = now - d.createdAt.getTime()
      const due =
        (d.wizardRemindersSent === 0 && age >= H48) ||
        (d.wizardRemindersSent === 1 && age >= D7)
      if (!due || !d.email) continue

      const name = `${d.title ?? ''} ${d.firstName} ${d.lastName}`.trim()
      const ok = await this.emailService.sendWizardReminder(d.email, name)
      if (ok) {
        await this.prisma.doctor.update({
          where: { id: d.id },
          data: { wizardRemindersSent: { increment: 1 } },
        })
        this.logger.log(`[wizard-reminder] enviado #${d.wizardRemindersSent + 1} a ${d.email}`)
      }
    }
  }

  // ─── Área del médico (self-service, guard 'auth0' — 06 §4, §6) ─────────────

  /** Perfil propio del médico logueado (por auth0Sub); null si aún no existe */
  findOwn(auth0Sub: string) {
    return this.prisma.doctor.findUnique({
      where: { auth0Sub },
      include: { ...this.fullInclude, _count: { select: { articles: true } } },
    })
  }

  /**
   * Crea (DRAFT) o actualiza el perfil propio. El primer guardado crea el
   * registro con auth0Sub + email del token; los siguientes reusan update().
   */
  async upsertOwn(auth0Sub: string, tokenEmail: string | undefined, dto: UpdateDoctorDto) {
    const existing = await this.prisma.doctor.findUnique({ where: { auth0Sub }, select: { id: true } })
    if (existing) {
      // selfEdit: dispara la re-verificación si cambia la identidad estando publicado (06 §7)
      return this.update(existing.id, dto, { selfEdit: true })
    }
    const firstName = dto.firstName?.trim()
    const lastName = dto.lastName?.trim()
    if (!firstName || !lastName) {
      throw new BadRequestException('Nombre y apellido son obligatorios para crear tu perfil')
    }
    const { specialtyIds, clinics, insuranceIds, ...fields } = dto
    const data = this.sanitizeScalars(fields)
    const slug = await this.generateSlug(dto.title, firstName, lastName)
    try {
      return await this.prisma.doctor.create({
        data: {
          ...data,
          firstName: stripAllHtml(firstName),
          lastName: stripAllHtml(lastName),
          auth0Sub,
          email: tokenEmail ?? data.email ?? undefined,
          slug,
          status: DoctorStatus.DRAFT,
          specialties: specialtyIds?.length
            ? { create: specialtyIds.map((specialtyId, order) => ({ specialtyId, order })) }
            : undefined,
          clinics: clinics?.length
            ? { create: clinics.map((c) => ({ clinicId: c.clinicId, schedule: c.schedule })) }
            : undefined,
          insurances: insuranceIds?.length
            ? { create: insuranceIds.map((insuranceId) => ({ insuranceId })) }
            : undefined,
        },
        include: this.fullInclude,
      })
    } catch (e) {
      this.handlePrismaError(e, dto.email)
    }
  }

  /** Candidato a reclamo por email (B2, 06 §5): perfil sin dueño con el mismo email verificado */
  async findClaimCandidate(email: string | undefined, emailVerified: boolean | undefined) {
    if (!email || !emailVerified) return null
    const candidate = await this.prisma.doctor.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, auth0Sub: null },
      include: this.fullInclude,
    })
    if (!candidate) return null
    // No exponemos campos internos al front del médico
    const { phoneInternal, planNotes, ...safe } = candidate
    return safe
  }

  /** Reclamo por link de invitación (B1, 06 §5): liga el auth0Sub al Doctor del token */
  async claimByLink(auth0Sub: string, token: string) {
    const claim = await this.prisma.claimToken.findUnique({ where: { token }, include: { doctor: true } })
    if (!claim) throw new NotFoundException('El link de invitación no es válido')
    if (claim.usedAt) throw new ConflictException('Este link de invitación ya fue usado')
    if (claim.expiresAt < new Date()) throw new ConflictException('Este link de invitación expiró')
    if (claim.doctor.auth0Sub) throw new ConflictException('Este perfil ya fue reclamado')
    await this.ensureNoOwnProfile(auth0Sub)

    return this.prisma.$transaction(async (tx) => {
      await tx.claimToken.update({ where: { token }, data: { usedAt: new Date() } })
      const linked = await tx.doctor.update({
        where: { id: claim.doctorId },
        data: { auth0Sub },
        include: this.fullInclude,
      })
      // Otros tokens vigentes del mismo perfil quedan inservibles
      await tx.claimToken.updateMany({
        where: { doctorId: claim.doctorId, usedAt: null },
        data: { usedAt: new Date() },
      })
      return linked
    })
  }

  /** Reclamo por email verificado (B2): liga el perfil sin dueño cuyo email coincide */
  async claimByEmail(auth0Sub: string, email: string | undefined, emailVerified: boolean | undefined) {
    if (!email || !emailVerified) {
      throw new BadRequestException('Necesitas un email verificado para reclamar un perfil')
    }
    const candidate = await this.prisma.doctor.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, auth0Sub: null },
    })
    if (!candidate) throw new NotFoundException('No encontramos un perfil con tu email')
    await this.ensureNoOwnProfile(auth0Sub)
    return this.prisma.doctor.update({
      where: { id: candidate.id },
      data: { auth0Sub },
      include: this.fullInclude,
    })
  }

  private async ensureNoOwnProfile(auth0Sub: string) {
    const own = await this.prisma.doctor.findUnique({ where: { auth0Sub }, select: { id: true } })
    if (own) throw new ConflictException('Tu cuenta ya tiene un perfil asociado')
  }

  /** Envía el perfil propio a revisión (DRAFT → PENDING) + avisa al admin (07 §8) */
  async submitOwn(auth0Sub: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { auth0Sub } })
    if (!doctor) throw new NotFoundException('Todavía no tienes un perfil creado')
    if (doctor.status === DoctorStatus.PUBLISHED) {
      throw new ConflictException('Tu perfil ya está publicado')
    }
    if (!doctor.firstName || !doctor.lastName) {
      throw new BadRequestException('Completa al menos tu nombre y apellido antes de enviar')
    }
    const updated = await this.prisma.doctor.update({
      where: { auth0Sub },
      data: { status: DoctorStatus.PENDING },
      include: this.fullInclude,
    })
    const name = `${updated.title ?? ''} ${updated.firstName} ${updated.lastName}`.trim()
    void this.emailService.sendDoctorPendingToAdmin(name) // fire-and-forget
    return updated
  }

  // ─── Admin: creación manual (06 §5 — la vía comercial) ─────────────────────

  async create(dto: CreateDoctorDto) {
    const { specialtyIds, clinics, insuranceIds, ...fields } = dto
    const data = this.sanitizeScalars(fields)
    const slug = await this.generateSlug(dto.title, dto.firstName, dto.lastName)

    try {
      const doctor = await this.prisma.doctor.create({
        data: {
          ...data,
          slug,
          specialties: specialtyIds?.length
            ? { create: specialtyIds.map((specialtyId, order) => ({ specialtyId, order })) }
            : undefined,
          clinics: clinics?.length
            ? { create: clinics.map((c) => ({ clinicId: c.clinicId, schedule: c.schedule })) }
            : undefined,
          insurances: insuranceIds?.length
            ? { create: insuranceIds.map((insuranceId) => ({ insuranceId })) }
            : undefined,
        },
        include: this.fullInclude,
      })
      if (doctor.status === DoctorStatus.PUBLISHED) {
        void this.revalidation.revalidateDoctorPaths(doctor.id)
      }
      return doctor
    } catch (e) {
      this.handlePrismaError(e, dto.email)
    }
  }

  // ─── Admin: edición (slug inmutable) ────────────────────────────────────────

  async update(id: string, dto: UpdateDoctorDto, opts: { selfEdit?: boolean } = {}) {
    const existing = await this.prisma.doctor.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Médico no encontrado')

    // Paths ANTES del cambio: si se le quita una clínica/especialidad, esas
    // páginas también deben revalidarse (pueden caer del umbral P7)
    const pathsBefore =
      existing.status === DoctorStatus.PUBLISHED
        ? await this.revalidation.collectDoctorPaths(id)
        : []

    const { specialtyIds, clinics, insuranceIds, ...fields } = dto
    const data = this.sanitizeScalars(fields)

    // Re-verificación (06 §7): si el propio médico edita su identidad (nombre,
    // apellido, título o exequátur) estando PUBLISHED, se cae el sello ✓ y
    // queda marcado para que el admin re-verifique. La ficha sigue publicada
    // (SEO-first, P1) — solo pierde el badge hasta la confirmación del admin.
    const triggersReverify =
      opts.selfEdit === true &&
      existing.status === DoctorStatus.PUBLISHED &&
      this.identityChanged(existing, data)
    const reverifyData = triggersReverify ? { isVerified: false, needsReverify: true } : {}

    try {
      const doctor = await this.prisma.$transaction(async (tx) => {
        if (specialtyIds) {
          await tx.doctorSpecialty.deleteMany({ where: { doctorId: id } })
          await tx.doctorSpecialty.createMany({
            data: specialtyIds.map((specialtyId, order) => ({ doctorId: id, specialtyId, order })),
          })
        }
        if (clinics) {
          await tx.doctorClinic.deleteMany({ where: { doctorId: id } })
          await tx.doctorClinic.createMany({
            data: clinics.map((c) => ({ doctorId: id, clinicId: c.clinicId, schedule: c.schedule })),
          })
        }
        if (insuranceIds) {
          await tx.doctorInsurance.deleteMany({ where: { doctorId: id } })
          await tx.doctorInsurance.createMany({
            data: insuranceIds.map((insuranceId) => ({ doctorId: id, insuranceId })),
          })
        }
        return tx.doctor.update({ where: { id }, data: { ...data, ...reverifyData }, include: this.fullInclude })
      })

      if (doctor.status === DoctorStatus.PUBLISHED) {
        void this.revalidation.revalidateDoctorPaths(id, pathsBefore)
      }
      // Aviso al admin de que un médico publicado editó su identidad (fire-and-forget)
      if (triggersReverify) {
        const name = `${doctor.title ?? ''} ${doctor.firstName} ${doctor.lastName}`.trim()
        void this.emailService.sendDoctorReverifyToAdmin(name)
      }
      return doctor
    } catch (e) {
      this.handlePrismaError(e, dto.email)
    }
  }

  /** ¿Cambió algún campo de identidad (nombre, apellido, título, exequátur)? (06 §7) */
  private identityChanged(
    existing: { firstName: string; lastName: string; title: string | null; exequatur: string | null },
    data: { firstName?: string; lastName?: string; title?: string; exequatur?: string },
  ): boolean {
    const norm = (v?: string | null) => (v ?? '').trim().toLowerCase()
    const pairs: [string | undefined, string | null][] = [
      [data.firstName, existing.firstName],
      [data.lastName, existing.lastName],
      [data.title, existing.title],
      [data.exequatur, existing.exequatur],
    ]
    // Solo cuenta si el campo vino en el payload (undefined = "no tocar")
    return pairs.some(([incoming, current]) => incoming !== undefined && norm(incoming) !== norm(current))
  }

  // ─── Admin: estado, plan, verificación ──────────────────────────────────────

  async updateStatus(id: string, dto: UpdateDoctorStatusDto) {
    const existing = await this.prisma.doctor.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Médico no encontrado')

    // Paths previos: al despublicar, el perfil y sus programáticas deben
    // regenerarse (404 + fuera del sitemap si quedan en 0 médicos — P7)
    const pathsBefore =
      existing.status === DoctorStatus.PUBLISHED
        ? await this.revalidation.collectDoctorPaths(id)
        : []

    const doctor = await this.prisma.doctor.update({
      where: { id },
      data: { status: dto.status },
      include: this.fullInclude,
    })

    if (doctor.status === DoctorStatus.PUBLISHED || pathsBefore.length) {
      void this.revalidation.revalidateDoctorPaths(id, pathsBefore)
    }

    // Email de bienvenida al aprobar el perfil (08 §1) — solo en la transición
    // a PUBLISHED y si el médico tiene email. Fire-and-forget.
    const justPublished = existing.status !== DoctorStatus.PUBLISHED && doctor.status === DoctorStatus.PUBLISHED
    if (justPublished && doctor.email) {
      const name = `${doctor.title ?? ''} ${doctor.firstName} ${doctor.lastName}`.trim()
      void this.emailService.sendDoctorWelcome(doctor.email, name, doctor.slug)
    }

    return doctor
  }

  async updatePlan(id: string, dto: UpdateDoctorPlanDto) {
    await this.ensureExists(id)
    const doctor = await this.prisma.doctor.update({
      where: { id },
      data: { plan: dto.plan, planNotes: dto.planNotes },
      include: this.fullInclude,
    })
    // El plan afecta el orden en listados públicos (premium primero, 05 §3)
    if (doctor.status === DoctorStatus.PUBLISHED) {
      void this.revalidation.revalidateDoctorPaths(id)
    }
    return doctor
  }

  async updateVerification(id: string, dto: UpdateDoctorVerificationDto) {
    await this.ensureExists(id)
    const doctor = await this.prisma.doctor.update({
      where: { id },
      data: {
        isVerified: dto.isVerified,
        needsReverify: false, // el admin revisó la identidad → se limpia el pedido de re-verificación (06 §7)
        ...(dto.exequatur !== undefined ? { exequatur: dto.exequatur } : {}),
      },
      include: this.fullInclude,
    })
    if (doctor.status === DoctorStatus.PUBLISHED) {
      void this.revalidation.revalidateDoctorPaths(id)
    }
    return doctor
  }

  // ─── Admin: fusionar perfiles duplicados (07 §2) ────────────────────────────

  /**
   * Funde `sourceId` dentro de `targetId`: el destino conserva su slug e historia
   * (capital SEO); el duplicado cede su auth0Sub, sus relaciones (especialidades,
   * clínicas, seguros), su contenido y su historial (artículos, clics, sesiones,
   * emails, reviews, beneficios) y luego se elimina. `fromSource` indica qué
   * campos escalares gana el duplicado. Restricción: el destino NO puede tener
   * auth0Sub previo (nunca pisar una cuenta ya reclamada).
   */
  async mergeDoctors(dto: MergeDoctorsDto) {
    const { targetId, sourceId, fromSource = [] } = dto
    if (targetId === sourceId) {
      throw new BadRequestException('No se puede fusionar un perfil consigo mismo')
    }

    const [target, source] = await Promise.all([
      this.prisma.doctor.findUnique({ where: { id: targetId } }),
      this.prisma.doctor.findUnique({ where: { id: sourceId } }),
    ])
    if (!target || !source) throw new NotFoundException('Uno de los perfiles a fusionar no existe')
    if (target.auth0Sub) {
      throw new ConflictException(
        'El perfil que quieres conservar ya fue reclamado por un médico (tiene cuenta). Fusiona hacia el otro perfil.',
      )
    }

    // Paths públicos a revalidar: los de ambos perfiles si estaban publicados
    // (el duplicado, al desaparecer, debe salir del sitemap / dar 404).
    const pathsBefore = [
      ...(target.status === DoctorStatus.PUBLISHED ? await this.revalidation.collectDoctorPaths(targetId) : []),
      ...(source.status === DoctorStatus.PUBLISHED ? await this.revalidation.collectDoctorPaths(sourceId) : []),
    ]

    // Campos escalares elegidos del duplicado (el resto los conserva el destino)
    const scalarData: Prisma.DoctorUpdateInput = {}
    for (const field of fromSource) {
      if ((MERGEABLE_FIELDS as readonly string[]).includes(field)) {
        ;(scalarData as Record<string, unknown>)[field] = source[field as MergeableField]
      }
    }

    const merged = await this.prisma.$transaction(async (tx) => {
      // 1. Relaciones 1-N (onDelete Cascade / SetNull): reasignar al destino para
      //    no perder historial ni contenido cuando se borre el duplicado.
      const reassign = { where: { doctorId: sourceId }, data: { doctorId: targetId } }
      await tx.whatsAppClick.updateMany(reassign)
      await tx.sessionLog.updateMany(reassign)
      await tx.emailLog.updateMany(reassign)
      await tx.review.updateMany(reassign)
      await tx.article.updateMany(reassign)
      await tx.doctorBenefit.updateMany(reassign)

      // 2. Relaciones N-N: unir, evitando colisión de PK compuesta (el destino
      //    gana; del duplicado se suman solo las que el destino no tenía).
      const tSpec = new Set(
        (await tx.doctorSpecialty.findMany({ where: { doctorId: targetId }, select: { specialtyId: true } }))
          .map((r) => r.specialtyId),
      )
      let specOrder = tSpec.size
      const sSpec = await tx.doctorSpecialty.findMany({ where: { doctorId: sourceId }, select: { specialtyId: true } })
      for (const r of sSpec) {
        if (!tSpec.has(r.specialtyId)) {
          await tx.doctorSpecialty.create({ data: { doctorId: targetId, specialtyId: r.specialtyId, order: specOrder++ } })
          tSpec.add(r.specialtyId)
        }
      }

      const tClin = new Set(
        (await tx.doctorClinic.findMany({ where: { doctorId: targetId }, select: { clinicId: true } }))
          .map((r) => r.clinicId),
      )
      const sClin = await tx.doctorClinic.findMany({ where: { doctorId: sourceId } })
      for (const r of sClin) {
        if (!tClin.has(r.clinicId)) {
          await tx.doctorClinic.create({ data: { doctorId: targetId, clinicId: r.clinicId, schedule: r.schedule } })
          tClin.add(r.clinicId)
        }
      }

      const tIns = new Set(
        (await tx.doctorInsurance.findMany({ where: { doctorId: targetId }, select: { insuranceId: true } }))
          .map((r) => r.insuranceId),
      )
      const sIns = await tx.doctorInsurance.findMany({ where: { doctorId: sourceId }, select: { insuranceId: true } })
      for (const r of sIns) {
        if (!tIns.has(r.insuranceId)) {
          await tx.doctorInsurance.create({ data: { doctorId: targetId, insuranceId: r.insuranceId } })
          tIns.add(r.insuranceId)
        }
      }

      // 3. Borrar el duplicado (cascade limpia sus join sobrantes y claim tokens;
      //    libera sus campos únicos email/auth0Sub para el update siguiente).
      await tx.doctor.delete({ where: { id: sourceId } })

      // 4. Aplicar los campos elegidos + heredar el auth0Sub del duplicado
      return tx.doctor.update({
        where: { id: targetId },
        data: {
          ...scalarData,
          ...(source.auth0Sub ? { auth0Sub: source.auth0Sub } : {}),
        },
        include: this.fullInclude,
      })
    })

    if (merged.status === DoctorStatus.PUBLISHED || pathsBefore.length) {
      void this.revalidation.revalidateDoctorPaths(targetId, pathsBefore)
    }
    return merged
  }

  // ─── Admin: link de invitación para reclamar perfil (06 §5, 07 §3) ─────────

  async createClaimToken(doctorId: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } })
    if (!doctor) throw new NotFoundException('Médico no encontrado')
    if (doctor.auth0Sub) {
      throw new ConflictException('Este perfil ya fue reclamado por el médico')
    }
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + CLAIM_TOKEN_DAYS * 24 * 60 * 60 * 1000)
    const claimToken = await this.prisma.claimToken.create({
      data: { doctorId, token, expiresAt },
    })
    return {
      ...claimToken,
      url: `${process.env.FRONTEND_URL ?? ''}/reclamar-perfil?token=${token}`,
    }
  }

  // ─── Admin: beneficios premium (07 §3) ──────────────────────────────────────

  async addBenefit(doctorId: string, dto: CreateDoctorBenefitDto) {
    await this.ensureExists(doctorId)
    return this.prisma.doctorBenefit.create({
      data: {
        doctorId,
        type: dto.type,
        note: dto.note,
        deliveredAt: dto.deliveredAt ? new Date(dto.deliveredAt) : null,
      },
    })
  }

  async updateBenefit(doctorId: string, benefitId: string, dto: UpdateDoctorBenefitDto) {
    const benefit = await this.prisma.doctorBenefit.findFirst({
      where: { id: benefitId, doctorId },
    })
    if (!benefit) throw new NotFoundException('Beneficio no encontrado')
    return this.prisma.doctorBenefit.update({
      where: { id: benefitId },
      data: {
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.deliveredAt !== undefined
          ? { deliveredAt: dto.deliveredAt ? new Date(dto.deliveredAt) : null }
          : {}),
      },
    })
  }

  async removeBenefit(doctorId: string, benefitId: string) {
    const benefit = await this.prisma.doctorBenefit.findFirst({
      where: { id: benefitId, doctorId },
    })
    if (!benefit) throw new NotFoundException('Beneficio no encontrado')
    return this.prisma.doctorBenefit.delete({ where: { id: benefitId } })
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Slug SEO inmutable: dra-maria-perez; colisión → sufijo -2, -3… (04 §2) */
  private async generateSlug(title: string | undefined, firstName: string, lastName: string) {
    const base = slugify(`${title ?? ''} ${firstName} ${lastName}`, {
      lower: true, strict: true, locale: 'es',
    })
    let slug = base
    for (let i = 2; ; i++) {
      const exists = await this.prisma.doctor.findUnique({ where: { slug }, select: { id: true } })
      if (!exists) return slug
      slug = `${base}-${i}`
    }
  }

  /** La bio y los campos de texto entran como texto plano — sin HTML (XSS) */
  private sanitizeScalars<T extends Record<string, unknown>>(fields: T): T {
    const out = { ...fields } as Record<string, unknown>
    for (const key of ['firstName', 'lastName', 'title', 'bio', 'instagram', 'planNotes', 'exequatur']) {
      if (typeof out[key] === 'string') out[key] = stripAllHtml(out[key] as string).trim()
    }
    return out as T
  }

  private async ensureExists(id: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { id }, select: { id: true } })
    if (!doctor) throw new NotFoundException('Médico no encontrado')
  }

  private handlePrismaError(e: unknown, email?: string): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        throw new ConflictException(`Ya existe un médico con el email "${email}"`)
      }
      if (e.code === 'P2003') {
        throw new NotFoundException('Especialidad, clínica o seguro referenciado no existe')
      }
    }
    throw e
  }
}
