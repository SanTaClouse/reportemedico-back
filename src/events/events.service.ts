import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Prisma, type Event, type EventPart, type EventRegistration } from '@prisma/client'
import { randomBytes } from 'crypto'
import * as QRCode from 'qrcode'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import {
  eventRegistrationReceivedTemplate, eventAccessTemplate, EVENT_QR_CID,
  type AccessVariant, type EventEmailData,
} from '../email/event.templates'
import { stripAllHtml } from '../utils/sanitize.util'
import { RegisterEventDto } from './dto/register-event.dto'
import {
  CheckInDto, CreateTestRegistrationDto, SetRegistrationStatusDto, UpdateEventDto, type TestEmailType,
} from './dto/admin-event.dto'
import {
  SECTOR_LABELS, attendanceLabel, buildIcs, daysUntilEvent, formatWhen, googleCalendarUrl, isSendingHour,
  partInfo, partsOf, waNumber,
} from './event-format.util'

type RegistrationWithEvent = EventRegistration & { event: Event }

interface ScannerUser {
  sub: string
  name?: string
}

const clean = (s?: string | null) => {
  const v = s ? stripAllHtml(s).trim() : ''
  return v || null
}

/** Solo caracteres de base64url: lo que no calce no llega a la BD */
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name)
  private readonly frontendUrl: string
  private sendingQr = false
  private sendingReminders = false

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    config: ConfigService,
  ) {
    this.frontendUrl = config.get<string>('FRONTEND_URL') ?? 'https://reportemedico.com'
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async bySlug(slug: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({ where: { slug } })
    if (!event) throw new NotFoundException('Evento no encontrado')
    return event
  }

  private async byId(id: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({ where: { id } })
    if (!event) throw new NotFoundException('Evento no encontrado')
    return event
  }

  private eventUrl(event: Pick<Event, 'slug'>) {
    return `${this.frontendUrl}/eventos/${event.slug}`
  }

  /** Lo que codifica el QR: la URL de "Mi entrada" (si alguien lo escanea con la cámara, ve su pase) */
  private entryUrl(event: Pick<Event, 'slug'>, token: string) {
    return `${this.eventUrl(event)}/entrada/${token}`
  }

  private newToken() {
    return randomBytes(18).toString('base64url') // 24 caracteres, no adivinable
  }

  private emailData(reg: RegistrationWithEvent): EventEmailData {
    const eventUrl = this.eventUrl(reg.event)
    return {
      firstName: reg.firstName,
      lastName: reg.lastName,
      eventName: reg.event.name,
      eventUrl,
      frontendUrl: this.frontendUrl,
      parts: partsOf(reg.attendance).map((part) => {
        const info = partInfo(reg.event, part)
        return {
          title: info.title,
          when: formatWhen(info.startsAt, info.endsAt),
          where: info.where,
          googleUrl: googleCalendarUrl(reg.event.name, info, `Programa: ${eventUrl}`, reg.event.venueAddress),
        }
      }),
    }
  }

  private ics(reg: RegistrationWithEvent) {
    return buildIcs(reg.event, partsOf(reg.attendance), this.eventUrl(reg.event))
  }

  private qrPng(value: string) {
    return QRCode.toBuffer(value, { width: 480, margin: 2, errorCorrectionLevel: 'M' })
  }

  /**
   * Reserva el envío marcando la fecha ANTES de mandar: si dos procesos (cron +
   * aprobación, o dos instancias) intentan lo mismo, solo uno gana. Si el envío
   * falla, se libera para reintentar.
   */
  private async claim(id: string, field: 'approvalEmailSentAt' | 'qrEmailSentAt') {
    const where: Prisma.EventRegistrationWhereInput =
      field === 'approvalEmailSentAt' ? { id, approvalEmailSentAt: null } : { id, qrEmailSentAt: null }
    const data: Prisma.EventRegistrationUpdateManyMutationInput =
      field === 'approvalEmailSentAt' ? { approvalEmailSentAt: new Date() } : { qrEmailSentAt: new Date() }
    const res = await this.prisma.eventRegistration.updateMany({ where, data })
    return res.count === 1
  }

  private async release(id: string, field: 'approvalEmailSentAt' | 'qrEmailSentAt') {
    await this.prisma.eventRegistration.update({
      where: { id },
      data: field === 'approvalEmailSentAt' ? { approvalEmailSentAt: null } : { qrEmailSentAt: null },
    })
  }

  private async ensureToken(reg: EventRegistration): Promise<string> {
    if (reg.accessToken) return reg.accessToken
    const token = this.newToken()
    await this.prisma.eventRegistration.update({ where: { id: reg.id }, data: { accessToken: token } })
    return token
  }

  // ─── Público ───────────────────────────────────────────────────────────────

  async getPublic(slug: string) {
    const e = await this.bySlug(slug)
    return {
      id: e.id, slug: e.slug, name: e.name,
      venueName: e.venueName, venueAddress: e.venueAddress, mapsUrl: e.mapsUrl,
      dayTitle: e.dayTitle, dayStartsAt: e.dayStartsAt, dayEndsAt: e.dayEndsAt,
      eveningTitle: e.eveningTitle, eveningVenue: e.eveningVenue,
      eveningStartsAt: e.eveningStartsAt, eveningEndsAt: e.eveningEndsAt,
      registrationOpen: e.registrationOpen,
    }
  }

  /**
   * Inscripción pública. Endpoint SIN auth: todo el texto se limpia de HTML.
   * Reinscribirse con el mismo email actualiza los datos (no duplica ni reenvía
   * emails) y responde igual, así que tampoco revela quién ya está inscrito.
   */
  async register(slug: string, dto: RegisterEventDto) {
    const event = await this.bySlug(slug)
    if (!event.registrationOpen) throw new BadRequestException('Las inscripciones para este evento están cerradas')

    const ok = { ok: true, attendance: dto.attendance }
    if (dto.website) {
      this.logger.warn(`[eventos] honeypot activado — inscripción descartada (${dto.email})`)
      return ok
    }

    const email = dto.email.trim().toLowerCase()
    const doctor = await this.prisma.doctor.findUnique({ where: { email }, select: { id: true } })
    const data = {
      firstName: stripAllHtml(dto.firstName).trim(),
      lastName: stripAllHtml(dto.lastName).trim(),
      phone: stripAllHtml(dto.phone).trim(),
      sector: dto.sector,
      specialtyId: dto.sector === 'DOCTOR' ? dto.specialtyId ?? null : null,
      // El texto libre solo se guarda si no eligió una del catálogo
      specialtyOther:
        dto.sector === 'DOCTOR' && !dto.specialtyId ? clean(dto.specialtyOther) : null,
      institution: clean(dto.institution),
      position: clean(dto.position),
      attendance: dto.attendance,
      doctorId: doctor?.id ?? null,
    }

    const existing = await this.prisma.eventRegistration.findUnique({
      where: { eventId_email: { eventId: event.id, email } },
      select: { id: true },
    })
    if (existing) {
      await this.prisma.eventRegistration.update({ where: { id: existing.id }, data })
      return ok
    }

    let reg: RegistrationWithEvent & { specialty: { name: string } | null }
    try {
      reg = await this.prisma.eventRegistration.create({
        data: { ...data, eventId: event.id, email },
        include: { event: true, specialty: { select: { name: true } } },
      })
    } catch (e) {
      // Doble envío simultáneo del mismo form: el otro ya la creó
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return ok
      throw e
    }
    this.logger.log(`[eventos] inscripción nueva: ${reg.email} (${reg.sector}, ${reg.attendance})`)

    // Emails fire-and-forget: un fallo de correo NUNCA rompe la inscripción
    void this.sendReceived(reg).catch((e) => this.logger.error(`No se envió "recibida": ${e.message}`))
    void this.notifyTeam(reg).catch((e) => this.logger.error(`No se avisó al equipo: ${e.message}`))
    return ok
  }

  private async sendReceived(reg: RegistrationWithEvent) {
    return this.email.sendEventRegistrationReceived(reg.email, this.emailData(reg), { ics: this.ics(reg) })
  }

  private async notifyTeam(reg: RegistrationWithEvent & { specialty: { name: string } | null }) {
    const total = await this.prisma.eventRegistration.count({ where: { eventId: reg.eventId, isTest: false } })
    return this.email.sendEventRegistrationToTeam({
      eventName: reg.event.name,
      adminUrl: `${this.frontendUrl}/admin/eventos/${reg.eventId}`,
      firstName: reg.firstName,
      lastName: reg.lastName,
      email: reg.email,
      phone: reg.phone,
      waNumber: waNumber(reg.phone),
      sectorLabel: SECTOR_LABELS[reg.sector],
      specialtyName: reg.specialty?.name ?? reg.specialtyOther ?? null,
      institution: reg.institution,
      position: reg.position,
      attendanceLabel: attendanceLabel(reg.event, reg.attendance),
      totalRegistrations: total,
      inGuide: Boolean(reg.doctorId),
    })
  }

  async calendarIcs(slug: string, attendance: string | undefined) {
    const event = await this.bySlug(slug)
    const att = attendance === 'DAY' || attendance === 'EVENING' ? attendance : 'BOTH'
    return buildIcs(event, partsOf(att), this.eventUrl(event))
  }

  /** "Mi entrada": el pase con el QR. Solo existe para inscripciones aprobadas. */
  async getEntry(slug: string, token: string) {
    if (!TOKEN_RE.test(token)) throw new NotFoundException('Entrada no encontrada')
    const event = await this.bySlug(slug)
    const reg = await this.prisma.eventRegistration.findFirst({
      where: { eventId: event.id, accessToken: token, status: 'APPROVED' },
      select: { firstName: true, lastName: true, attendance: true, institution: true, isTest: true },
    })
    if (!reg) throw new NotFoundException('Entrada no encontrada')
    return {
      event: await this.getPublic(slug),
      registration: reg,
      qrValue: this.entryUrl(event, token),
    }
  }

  // ─── Admin: eventos ────────────────────────────────────────────────────────

  async listEvents() {
    const events = await this.prisma.event.findMany({ orderBy: { dayStartsAt: 'desc' } })
    return Promise.all(events.map(async (e) => ({ ...e, stats: await this.stats(e.id) })))
  }

  async getAdmin(id: string) {
    const event = await this.byId(id)
    return { ...event, stats: await this.stats(id) }
  }

  async updateEvent(id: string, dto: UpdateEventDto) {
    await this.byId(id)
    const dates = ['dayStartsAt', 'dayEndsAt', 'eveningStartsAt', 'eveningEndsAt', 'qrSendAt'] as const
    const data: Prisma.EventUpdateInput = { ...dto }
    for (const k of dates) if (dto[k]) data[k] = new Date(dto[k] as string)
    return this.prisma.event.update({ where: { id }, data })
  }

  /** Contadores del panel — las inscripciones de prueba no cuentan */
  async stats(eventId: string) {
    const [byStatusAttendance, bySector, checkIns] = await Promise.all([
      this.prisma.eventRegistration.groupBy({
        by: ['status', 'attendance'],
        where: { eventId, isTest: false },
        _count: { _all: true },
      }),
      this.prisma.eventRegistration.groupBy({
        by: ['sector'],
        where: { eventId, isTest: false, status: { not: 'REJECTED' } },
        _count: { _all: true },
      }),
      this.prisma.eventCheckIn.groupBy({
        by: ['part'],
        where: { registration: { eventId, isTest: false } },
        _count: { _all: true },
      }),
    ])

    const count = (status: string, parts: string[]) =>
      byStatusAttendance
        .filter((r) => r.status === status && parts.includes(r.attendance))
        .reduce((n, r) => n + r._count._all, 0)
    const all = ['DAY', 'EVENING', 'BOTH']

    return {
      total: byStatusAttendance.reduce((n, r) => n + r._count._all, 0),
      pending: count('PENDING', all),
      approved: count('APPROVED', all),
      rejected: count('REJECTED', all),
      // Por parte (BOTH suma en las dos)
      approvedDay: count('APPROVED', ['DAY', 'BOTH']),
      approvedEvening: count('APPROVED', ['EVENING', 'BOTH']),
      pendingDay: count('PENDING', ['DAY', 'BOTH']),
      pendingEvening: count('PENDING', ['EVENING', 'BOTH']),
      checkedInDay: checkIns.find((c) => c.part === 'DAY')?._count._all ?? 0,
      checkedInEvening: checkIns.find((c) => c.part === 'EVENING')?._count._all ?? 0,
      bySector: bySector
        .map((s) => ({ sector: s.sector, count: s._count._all }))
        .sort((a, b) => b.count - a.count),
    }
  }

  // ─── Admin: inscripciones ──────────────────────────────────────────────────

  async listRegistrations(
    eventId: string,
    f: { status?: string; sector?: string; part?: string; q?: string; vip?: boolean; tests?: boolean; page: number; limit: number },
  ) {
    await this.byId(eventId)
    const where: Prisma.EventRegistrationWhereInput = { eventId, isTest: f.tests ?? false }
    if (f.status === 'PENDING' || f.status === 'APPROVED' || f.status === 'REJECTED') where.status = f.status
    if (f.sector && f.sector in SECTOR_LABELS) where.sector = f.sector as keyof typeof SECTOR_LABELS
    if (f.part === 'DAY') where.attendance = { in: ['DAY', 'BOTH'] }
    if (f.part === 'EVENING') where.attendance = { in: ['EVENING', 'BOTH'] }
    if (f.vip) where.isVip = true
    if (f.q?.trim()) {
      const q = f.q.trim()
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { institution: { contains: q, mode: 'insensitive' } },
        { specialtyOther: { contains: q, mode: 'insensitive' } },
      ]
    }
    const limit = Math.min(Math.max(f.limit, 1), 5000) // 5000 = exportación CSV completa
    const [items, total] = await Promise.all([
      this.prisma.eventRegistration.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Math.max(f.page, 1) - 1) * limit,
        take: limit,
        include: {
          specialty: { select: { name: true } },
          doctor: { select: { id: true, slug: true, plan: true } },
          checkIns: { select: { part: true, createdAt: true } },
        },
      }),
      this.prisma.eventRegistration.count({ where }),
    ])
    return { items, total, page: f.page, limit }
  }

  /**
   * Aprobar / rechazar / volver a pendiente, individual o en lote.
   * Al rechazado no le llega nada (decisión del cliente). El email de
   * aprobación sale una sola vez, en segundo plano (un lote de 400 tarda unos minutos).
   */
  async setStatus(eventId: string, dto: SetRegistrationStatusDto) {
    await this.byId(eventId)
    const regs = await this.prisma.eventRegistration.findMany({
      where: { eventId, id: { in: dto.ids } },
      select: { id: true, status: true, accessToken: true, isTest: true },
    })
    if (!regs.length) throw new NotFoundException('No se encontraron inscripciones')

    await this.prisma.eventRegistration.updateMany({
      where: { id: { in: regs.map((r) => r.id) } },
      data: { status: dto.status, reviewedAt: new Date() },
    })

    let notifying = 0
    if (dto.status === 'APPROVED') {
      for (const r of regs.filter((r) => !r.accessToken)) {
        await this.prisma.eventRegistration.update({ where: { id: r.id }, data: { accessToken: this.newToken() } })
      }
      const toNotify = regs.filter((r) => r.status !== 'APPROVED' && !r.isTest).map((r) => r.id)
      notifying = toNotify.length
      void this.notifyApproved(toNotify)
    }
    return { updated: regs.length, notifying }
  }

  /**
   * Al aprobar sale un solo email: "tu lugar está confirmado" con el QR
   * adentro (decisión del cliente, 2026-09-23). El QR se repite después en
   * cada recordatorio, así que nadie tiene que buscarlo en la puerta.
   */
  private async notifyApproved(ids: string[]) {
    for (const id of ids) {
      try {
        await this.deliverAccess(id, { variant: { kind: 'approved' } })
      } catch (e) {
        this.logger.error(`[eventos] fallo al avisar aprobación ${id}: ${(e as Error).message}`)
      }
    }
  }

  /**
   * Manda el email con el QR. Sin `force` sale una sola vez (cron y
   * aprobaciones tardías); con `force` es un reenvío manual del admin.
   */
  async deliverAccess(id: string, opts: { force?: boolean; variant?: AccessVariant } = {}): Promise<boolean> {
    const reg = await this.prisma.eventRegistration.findUnique({ where: { id }, include: { event: true } })
    if (!reg || reg.status !== 'APPROVED') return false
    const token = await this.ensureToken(reg)

    if (!opts.force && !(await this.claim(id, 'qrEmailSentAt'))) return false
    const entryUrl = this.entryUrl(reg.event, token)
    const sent = await this.email.sendEventAccess(
      reg.email,
      { ...this.emailData(reg), entryUrl },
      { ics: this.ics(reg), qrPng: await this.qrPng(entryUrl) },
      opts.variant,
    )
    if (sent && opts.force) {
      await this.prisma.eventRegistration.update({ where: { id }, data: { qrEmailSentAt: new Date() } })
    }
    // Sin SMTP (dev local) el envío es no-op: se deja marcado para no reintentar en bucle
    if (!sent && !opts.force && this.email.isConfigured) await this.release(id, 'qrEmailSentAt')
    return sent
  }

  async resendAccess(eventId: string, regId: string) {
    const reg = await this.prisma.eventRegistration.findFirst({ where: { id: regId, eventId } })
    if (!reg) throw new NotFoundException('Inscripción no encontrada')
    if (reg.status !== 'APPROVED') throw new BadRequestException('Solo se envía el QR a inscripciones aprobadas')
    return { sent: await this.deliverAccess(regId, { force: true }), smtp: this.email.isConfigured }
  }

  async updateRegistration(eventId: string, regId: string, data: { isVip?: boolean }) {
    const reg = await this.prisma.eventRegistration.findFirst({ where: { id: regId, eventId }, select: { id: true } })
    if (!reg) throw new NotFoundException('Inscripción no encontrada')
    return this.prisma.eventRegistration.update({ where: { id: regId }, data })
  }

  async deleteRegistration(eventId: string, regId: string) {
    const res = await this.prisma.eventRegistration.deleteMany({ where: { id: regId, eventId } })
    if (!res.count) throw new NotFoundException('Inscripción no encontrada')
    return { deleted: true }
  }

  /** Cron: a partir de `qrSendAt`, manda el QR a todos los aprobados que no lo recibieron */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendDueQrEmails() {
    if (this.sendingQr) return
    this.sendingQr = true
    try {
      const now = new Date()
      const events = await this.prisma.event.findMany({
        where: { qrSendAt: { lte: now }, eveningEndsAt: { gt: now } },
        select: { id: true, slug: true },
      })
      for (const ev of events) {
        const pending = await this.prisma.eventRegistration.findMany({
          where: { eventId: ev.id, status: 'APPROVED', isTest: false, qrEmailSentAt: null },
          select: { id: true },
          take: 1000,
        })
        if (!pending.length) continue
        this.logger.log(`[eventos] enviando QR de ${ev.slug} a ${pending.length} aprobados`)
        for (const r of pending) {
          await this.deliverAccess(r.id).catch((e) => this.logger.error(`QR ${r.id}: ${e.message}`))
        }
      }
    } finally {
      this.sendingQr = false
    }
  }

  /**
   * Cron: recordatorio con el QR en los días configurados en el evento
   * (`reminderDays`, por ejemplo [7, 1] = una semana antes y el día anterior).
   *
   * `remindersSent` guarda los días ya enviados a cada inscripto, así que un
   * reinicio o una segunda vuelta del cron no repite el correo. Solo sale en
   * horario razonable: a las 3 a.m. nadie quiere un recordatorio.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendDueReminders() {
    if (this.sendingReminders) return
    this.sendingReminders = true
    try {
      const now = new Date()
      if (!isSendingHour(now)) return
      const events = await this.prisma.event.findMany({
        where: { eveningEndsAt: { gt: now } },
        select: { id: true, slug: true, dayStartsAt: true, reminderDays: true },
      })
      for (const ev of events) {
        const daysLeft = daysUntilEvent(ev.dayStartsAt, now)
        if (!ev.reminderDays.includes(daysLeft)) continue
        const pending = await this.prisma.eventRegistration.findMany({
          where: {
            eventId: ev.id,
            status: 'APPROVED',
            isTest: false,
            NOT: { remindersSent: { has: daysLeft } },
          },
          select: { id: true },
          take: 1000,
        })
        if (!pending.length) continue
        this.logger.log(`[eventos] recordatorio de ${ev.slug} (faltan ${daysLeft} días) a ${pending.length} aprobados`)
        for (const r of pending) {
          const sent = await this.deliverAccess(r.id, { force: true, variant: { kind: 'reminder', daysLeft } })
            .catch((e) => {
              this.logger.error(`recordatorio ${r.id}: ${(e as Error).message}`)
              return false
            })
          // Sin SMTP (dev local) igual se marca, para no reintentar en bucle
          if (sent || !this.email.isConfigured) {
            await this.prisma.eventRegistration.update({
              where: { id: r.id },
              data: { remindersSent: { push: daysLeft } },
            })
          }
        }
      }
    } finally {
      this.sendingReminders = false
    }
  }

  // ─── Admin: sección de pruebas ─────────────────────────────────────────────

  async createTest(eventId: string, dto: CreateTestRegistrationDto) {
    await this.byId(eventId)
    const email = dto.email.trim().toLowerCase()
    try {
      return await this.prisma.eventRegistration.create({
        data: {
          eventId,
          email,
          firstName: stripAllHtml(dto.firstName).trim(),
          lastName: stripAllHtml(dto.lastName).trim(),
          phone: '0000000000',
          sector: 'OTHER',
          attendance: dto.attendance,
          status: 'APPROVED',
          reviewedAt: new Date(),
          isVip: dto.isVip ?? false,
          isTest: true,
          accessToken: this.newToken(),
        },
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(
          'Ya hay una inscripción con ese email. Para probar varias veces usa variantes como tu+prueba1@gmail.com',
        )
      }
      throw e
    }
  }

  private async testReg(eventId: string, regId: string): Promise<RegistrationWithEvent> {
    const reg = await this.prisma.eventRegistration.findFirst({
      where: { id: regId, eventId },
      include: { event: true },
    })
    if (!reg) throw new NotFoundException('Inscripción no encontrada')
    if (!reg.isTest) throw new ForbiddenException('Esta acción es solo para inscripciones de prueba')
    return reg
  }

  /** Envía ya mismo cualquiera de los emails a una inscripción de prueba */
  async sendTestEmail(eventId: string, regId: string, type: TestEmailType) {
    const reg = await this.testReg(eventId, regId)
    let sent = false
    if (type === 'received') sent = await this.sendReceived(reg)
    if (type === 'approved') sent = await this.deliverAccess(reg.id, { force: true, variant: { kind: 'approved' } })
    if (type === 'reminder') {
      const daysLeft = Math.max(0, daysUntilEvent(reg.event.dayStartsAt))
      sent = await this.deliverAccess(reg.id, { force: true, variant: { kind: 'reminder', daysLeft } })
    }
    if (type === 'access') sent = await this.deliverAccess(reg.id, { force: true })
    return { sent, smtp: this.email.isConfigured, to: reg.email }
  }

  /**
   * HTML de un email tal como lo recibiría la persona, para revisarlo sin SMTP.
   * El QR (que en el correo real va por CID) se incrusta como data: URL.
   */
  async emailPreview(eventId: string, regId: string, type: TestEmailType) {
    const reg = await this.testReg(eventId, regId)
    const data = this.emailData(reg)
    if (type === 'received') return eventRegistrationReceivedTemplate(data).html
    const token = await this.ensureToken(reg)
    const entryUrl = this.entryUrl(reg.event, token)
    const qr = await QRCode.toDataURL(entryUrl, { width: 480, margin: 2, errorCorrectionLevel: 'M' })
    const variant: AccessVariant =
      type === 'approved'
        ? { kind: 'approved' }
        : type === 'reminder'
          ? { kind: 'reminder', daysLeft: Math.max(0, daysUntilEvent(reg.event.dayStartsAt)) }
          : { kind: 'resend' }
    return eventAccessTemplate({ ...data, entryUrl }, variant).html.replace(`cid:${EVENT_QR_CID}`, qr)
  }

  async resetTestCheckIns(eventId: string) {
    const res = await this.prisma.eventCheckIn.deleteMany({ where: { registration: { eventId, isTest: true } } })
    return { deleted: res.count }
  }

  async deleteTests(eventId: string) {
    const res = await this.prisma.eventRegistration.deleteMany({ where: { eventId, isTest: true } })
    return { deleted: res.count }
  }

  // ─── Escáner / control de acceso ───────────────────────────────────────────

  /** Un token de SCANNER dura 7 días: se revalida contra la BD por si lo desactivaron */
  private async assertActiveUser(user: ScannerUser) {
    const u = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { isActive: true } })
    if (!u?.isActive) throw new ForbiddenException('Usuario desactivado')
  }

  private summary(reg: EventRegistration & { checkIns?: { part: EventPart; createdAt: Date }[] }) {
    return {
      id: reg.id,
      firstName: reg.firstName,
      lastName: reg.lastName,
      sector: reg.sector,
      institution: reg.institution,
      position: reg.position,
      attendance: reg.attendance,
      status: reg.status,
      isVip: reg.isVip,
      isTest: reg.isTest,
      checkIns: reg.checkIns ?? [],
    }
  }

  async accessInfo(slug: string, user: ScannerUser) {
    await this.assertActiveUser(user)
    return this.getPublic(slug)
  }

  /**
   * Registra un ingreso. Responde siempre 200 con un `result` para que el
   * escáner muestre la pantalla adecuada (verde / amarillo / rojo).
   */
  async checkIn(slug: string, dto: CheckInDto, user: ScannerUser) {
    await this.assertActiveUser(user)
    const event = await this.bySlug(slug)

    let reg: EventRegistration | null = null
    if (dto.registrationId) {
      reg = await this.prisma.eventRegistration.findFirst({ where: { id: dto.registrationId, eventId: event.id } })
    } else if (dto.code) {
      const raw = dto.code.trim()
      const token = raw.includes('/entrada/') ? raw.split('/entrada/')[1].split(/[/?#]/)[0] : raw
      if (TOKEN_RE.test(token)) {
        reg = await this.prisma.eventRegistration.findFirst({ where: { accessToken: token, eventId: event.id } })
      }
    }
    if (!reg) return { result: 'NOT_FOUND' as const }

    const summary = this.summary(reg)
    if (reg.status !== 'APPROVED') return { result: 'NOT_APPROVED' as const, registration: summary }

    const existing = await this.prisma.eventCheckIn.findUnique({
      where: { registrationId_part: { registrationId: reg.id, part: dto.part } },
    })
    if (existing) {
      return { result: 'ALREADY' as const, registration: summary, checkedInAt: existing.createdAt, by: existing.scannedByName }
    }

    const inscribedForPart = reg.attendance === 'BOTH' || reg.attendance === dto.part
    if (!inscribedForPart && !dto.force) return { result: 'WRONG_PART' as const, registration: summary }

    try {
      const checkIn = await this.prisma.eventCheckIn.create({
        data: {
          registrationId: reg.id,
          part: dto.part,
          method: dto.registrationId ? 'manual' : 'qr',
          scannedById: user.sub,
          scannedByName: user.name ?? null,
        },
      })
      return { result: 'OK' as const, registration: summary, checkedInAt: checkIn.createdAt, forced: !inscribedForPart }
    } catch (e) {
      // Dos puertas escanearon el mismo QR a la vez
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return { result: 'ALREADY' as const, registration: summary, checkedInAt: new Date(), by: null }
      }
      throw e
    }
  }

  /** Búsqueda manual en la puerta: por nombre, email, teléfono o institución */
  async search(slug: string, q: string, user: ScannerUser) {
    await this.assertActiveUser(user)
    const event = await this.bySlug(slug)
    const term = q.trim()
    if (term.length < 2) return []
    const regs = await this.prisma.eventRegistration.findMany({
      where: {
        eventId: event.id,
        status: { not: 'REJECTED' },
        OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term } },
          { institution: { contains: term, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
      take: 15,
      include: { checkIns: { select: { part: true, createdAt: true } } },
    })
    return regs.map((r) => this.summary(r))
  }

  /** Vista en vivo: contadores + últimos ingresos. La consulta el panel cada pocos segundos. */
  async live(slug: string, user: ScannerUser) {
    await this.assertActiveUser(user)
    const event = await this.bySlug(slug)
    const [stats, latest] = await Promise.all([
      this.stats(event.id),
      this.prisma.eventCheckIn.findMany({
        where: { registration: { eventId: event.id } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          registration: {
            select: {
              id: true, firstName: true, lastName: true, sector: true, institution: true,
              position: true, isVip: true, isTest: true,
            },
          },
        },
      }),
    ])
    return {
      event: { id: event.id, slug: event.slug, name: event.name, dayTitle: event.dayTitle, eveningTitle: event.eveningTitle },
      stats,
      latest: latest.map((c) => ({
        id: c.id,
        part: c.part,
        method: c.method,
        createdAt: c.createdAt,
        scannedByName: c.scannedByName,
        registration: c.registration,
      })),
    }
  }
}
