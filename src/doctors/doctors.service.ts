import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { Prisma, DoctorStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { RevalidationService } from '../revalidation/revalidation.service'
import { stripAllHtml } from '../utils/sanitize.util'
import slugify from 'slugify'
import { randomBytes } from 'crypto'
import { CreateDoctorDto } from './dto/create-doctor.dto'
import { UpdateDoctorDto } from './dto/update-doctor.dto'
import {
  UpdateDoctorStatusDto, UpdateDoctorPlanDto, UpdateDoctorVerificationDto,
  CreateDoctorBenefitDto, UpdateDoctorBenefitDto,
} from './dto/doctor-admin.dtos'

const CLAIM_TOKEN_DAYS = 14

@Injectable()
export class DoctorsService {
  constructor(
    private prisma: PrismaService,
    private revalidation: RevalidationService,
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
      include: this.fullInclude,
    })
    if (!doctor || doctor.status !== DoctorStatus.PUBLISHED) {
      throw new NotFoundException('Médico no encontrado')
    }
    // Los campos internos no salen al público
    const { phoneInternal, planNotes, auth0Sub, email, ...publicDoctor } = doctor
    return publicDoctor
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

  /** Conteo para el badge del nav del admin (07 §8) */
  async countPending() {
    const count = await this.prisma.doctor.count({ where: { status: DoctorStatus.PENDING } })
    return { count }
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

  async update(id: string, dto: UpdateDoctorDto) {
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
        return tx.doctor.update({ where: { id }, data, include: this.fullInclude })
      })

      if (doctor.status === DoctorStatus.PUBLISHED) {
        void this.revalidation.revalidateDoctorPaths(id, pathsBefore)
      }
      return doctor
    } catch (e) {
      this.handlePrismaError(e, dto.email)
    }
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
      data: { isVerified: dto.isVerified, ...(dto.exequatur !== undefined ? { exequatur: dto.exequatur } : {}) },
      include: this.fullInclude,
    })
    if (doctor.status === DoctorStatus.PUBLISHED) {
      void this.revalidation.revalidateDoctorPaths(id)
    }
    return doctor
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
