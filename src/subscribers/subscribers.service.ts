import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { createHmac, randomBytes } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { stripAllHtml } from '../utils/sanitize.util'
import type { DigestArticle } from '../email/email.templates'
import { CreateSubscriberDto } from './dto/create-subscriber.dto'
import { SendArticleEmailDto, UpdateNewsletterScheduleDto } from './dto/newsletter.dto'

// Digest: si nunca se envió, mira los últimos 14 días; máx 8 publicaciones (08 §1)
const DIGEST_DAYS = 14
const DIGEST_LIMIT = 8
const DAY_MS = 24 * 60 * 60 * 1000

@Injectable()
export class SubscribersService {
  private readonly logger = new Logger(SubscribersService.name)

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private config: ConfigService,
  ) {}

  async subscribeNewsletter(dto: CreateSubscriberDto) {
    this.logger.log(`[subscribe] email=${dto.email} name=${dto.name ?? '(sin nombre)'} temas=${dto.tagIds?.length ?? 0}`)
    try {
      const result = await this.prisma.subscriber.upsert({
        where: { email: dto.email },
        create: { email: dto.email, name: dto.name, source: 'NEWSLETTER_SIGNUP' },
        update: { name: dto.name ?? undefined },
      })

      // Temas de interés (opcional, aditivo): habilitan el envío segmentado (08 §1)
      if (dto.tagIds?.length) {
        await Promise.allSettled(
          dto.tagIds.map((tagId) =>
            this.prisma.subscriberTag.upsert({
              where: { subscriberId_tagId: { subscriberId: result.id, tagId } },
              create: { subscriberId: result.id, tagId },
              update: {},
            }),
          ),
        )
      }

      this.logger.log(`[subscribe] ✓ Guardado id=${result.id} source=${result.source}`)
      return result
    } catch (err) {
      this.logger.error(`[subscribe] ✗ Error Prisma: ${(err as Error).message}`)
      throw err
    }
  }

  async subscribeFromArticle(email: string, name: string, tagIds: string[]) {
    const subscriber = await this.prisma.subscriber.upsert({
      where: { email },
      create: { email, name, source: 'ARTICLE_SUBMISSION' },
      update: { name },
    })

    if (tagIds.length > 0) {
      await Promise.allSettled(
        tagIds.map((tagId) =>
          this.prisma.subscriberTag.upsert({
            where: { subscriberId_tagId: { subscriberId: subscriber.id, tagId } },
            create: { subscriberId: subscriber.id, tagId },
            update: {},
          }),
        ),
      )
    }

    return subscriber
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.prisma.subscriber.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { tags: { include: { tag: true } } },
      }),
      this.prisma.subscriber.count(),
    ])
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async getStats() {
    const [total, fromArticles, fromNewsletter, active] = await Promise.all([
      this.prisma.subscriber.count(),
      this.prisma.subscriber.count({ where: { source: 'ARTICLE_SUBMISSION' } }),
      this.prisma.subscriber.count({ where: { source: 'NEWSLETTER_SIGNUP' } }),
      this.prisma.subscriber.count({ where: { unsubscribedAt: null } }),
    ])
    return { total, fromArticles, fromNewsletter, active, unsubscribed: total - active }
  }

  // ─── Newsletter / digest (08 §1) ───────────────────────────────────────────

  /** Fecha desde la que se buscan novedades: el último envío del digest (sin
   *  solapar → nunca se repite una noticia); si nunca se envió, últimos 14 días. */
  private async getDigestSince(): Promise<Date> {
    const lastSend = await this.prisma.newsletterSend.findFirst({
      where: { type: 'digest' },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    })
    return lastSend?.sentAt ?? new Date(Date.now() - DIGEST_DAYS * DAY_MS)
  }

  /** Publicaciones PUBLISHED nuevas (publicadas DESPUÉS de `since`) — sin duplicar */
  private async recentArticles(since: Date, limit: number): Promise<DigestArticle[]> {
    const articles = await this.prisma.article.findMany({
      where: { status: 'PUBLISHED', publishedAt: { gt: since } },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: { type: true, title: true, slug: true, excerpt: true, featuredImage: true },
    })
    return articles.map((a) => ({
      type: a.type as DigestArticle['type'],
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt ? stripAllHtml(a.excerpt).slice(0, 180) : null,
      featuredImage: a.featuredImage,
    }))
  }

  /** Próxima fecha de envío automático según la programación (null si está apagada) */
  private computeNextRun(schedule: { enabled: boolean; dayOfWeek: number; hour: number } | null): Date | null {
    if (!schedule || !schedule.enabled) return null
    const now = new Date()
    const next = new Date(now)
    next.setHours(schedule.hour, 0, 0, 0)
    let diff = (schedule.dayOfWeek - now.getDay() + 7) % 7
    if (diff === 0 && next.getTime() <= now.getTime()) diff = 7
    next.setDate(next.getDate() + diff)
    return next
  }

  /** Vista previa del admin: novedades a enviar, destinatarios, último envío y programación */
  async previewNewsletter() {
    const since = await this.getDigestSince()
    const [articles, recipientCount, lastSend, schedule] = await Promise.all([
      this.recentArticles(since, DIGEST_LIMIT),
      this.prisma.subscriber.count({ where: { unsubscribedAt: null } }),
      this.prisma.newsletterSend.findFirst({ where: { type: 'digest' }, orderBy: { sentAt: 'desc' } }),
      this.getSchedule(),
    ])
    return {
      articles,
      recipientCount,
      lastSentAt: lastSend?.sentAt ?? null,
      lastSend: lastSend
        ? {
            sentAt: lastSend.sentAt,
            recipients: lastSend.recipients,
            articleTitles: lastSend.articleTitles,
            auto: lastSend.auto,
          }
        : null,
      schedule,
      nextRunAt: this.computeNextRun(schedule),
    }
  }

  /**
   * Envía el digest a todos los suscriptores activos (sólo lo nuevo desde el
   * último envío). Nunca falla por un email. `auto` marca el envío del cron.
   */
  async sendNewsletter(opts: { auto?: boolean } = {}) {
    const since = await this.getDigestSince()
    const articles = await this.recentArticles(since, DIGEST_LIMIT)
    if (articles.length === 0) {
      if (opts.auto) {
        this.logger.log('[newsletter] auto: sin novedades desde el último envío, no se envía')
        return { total: 0, sent: 0, failed: 0, articles: 0, skipped: true }
      }
      throw new BadRequestException('No hay publicaciones nuevas desde el último envío')
    }
    const subscribers = await this.prisma.subscriber.findMany({
      where: { unsubscribedAt: null },
      select: { id: true, email: true, name: true },
    })

    let sent = 0
    let failed = 0
    // Secuencial: respeta los límites de SMTP de Brevo y evita abrir muchas conexiones
    for (const sub of subscribers) {
      const ok = await this.emailService.sendNewsletterDigest(
        sub.email,
        sub.name,
        articles,
        this.unsubscribeUrl(sub.id),
      )
      if (ok) sent++
      else failed++
    }
    // Registra el envío (freno de frecuencia + cartel de "entregadas")
    await this.prisma.newsletterSend.create({
      data: {
        type: 'digest',
        recipients: sent,
        articleTitles: articles.map((a) => a.title),
        auto: opts.auto ?? false,
      },
    })
    this.logger.log(`[newsletter] ${opts.auto ? 'auto ' : ''}enviado a ${sent}/${subscribers.length} (fallidos: ${failed})`)
    return { total: subscribers.length, sent, failed, articles: articles.length, skipped: false }
  }

  // ─── Programación semanal automática (08 §1) ───────────────────────────────

  /** Config de envío automático (singleton; la crea con defaults si no existe) */
  async getSchedule() {
    const existing = await this.prisma.newsletterSchedule.findFirst()
    return existing ?? this.prisma.newsletterSchedule.create({ data: {} })
  }

  async updateSchedule(dto: UpdateNewsletterScheduleDto) {
    const existing = await this.prisma.newsletterSchedule.findFirst()
    const data = {
      ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      ...(dto.dayOfWeek !== undefined ? { dayOfWeek: dto.dayOfWeek } : {}),
      ...(dto.hour !== undefined ? { hour: dto.hour } : {}),
    }
    return existing
      ? this.prisma.newsletterSchedule.update({ where: { id: existing.id }, data })
      : this.prisma.newsletterSchedule.create({ data })
  }

  /**
   * Cron horario: si hay programación activa y hoy es el día configurado y ya
   * pasó la hora, y no se envió en los últimos 6 días, dispara el digest. Sólo
   * envía si hay novedades (no satura con correos vacíos).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async weeklyDigestCron() {
    const schedule = await this.prisma.newsletterSchedule.findFirst()
    if (!schedule || !schedule.enabled) return

    const now = new Date()
    if (now.getDay() !== schedule.dayOfWeek || now.getHours() < schedule.hour) return

    const lastSend = await this.prisma.newsletterSend.findFirst({
      where: { type: 'digest' },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    })
    // Ya se envió esta semana → no repetir
    if (lastSend && lastSend.sentAt.getTime() > Date.now() - 6 * DAY_MS) return

    this.logger.log('[newsletter-cron] disparando digest semanal automático')
    await this.sendNewsletter({ auto: true })
  }

  // ─── Envío de una noticia por correo (segmentado, 08 §1) ───────────────────

  /** Audiencia disponible para enviar una noticia: interesados + lista para selección manual */
  async articleAudience(articleId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true, title: true, slug: true, type: true, status: true,
        tags: { select: { tag: { select: { id: true, name: true } } } },
      },
    })
    if (!article) throw new NotFoundException('Artículo no encontrado')

    const tagIds = article.tags.map((t) => t.tag.id)
    const tagSet = new Set(tagIds)

    const [interestedCount, subscribers] = await Promise.all([
      tagIds.length
        ? this.prisma.subscriber.count({
            where: { unsubscribedAt: null, tags: { some: { tagId: { in: tagIds } } } },
          })
        : Promise.resolve(0),
      this.prisma.subscriber.findMany({
        where: { unsubscribedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, name: true, tags: { select: { tagId: true } } },
      }),
    ])

    return {
      article: { id: article.id, title: article.title, slug: article.slug, type: article.type, status: article.status },
      tags: article.tags.map((t) => t.tag.name),
      interestedCount,
      totalActive: subscribers.length,
      recipients: subscribers.map((s) => ({
        id: s.id,
        email: s.email,
        name: s.name,
        interested: s.tags.some((t) => tagSet.has(t.tagId)),
      })),
    }
  }

  /** Envía una noticia a la audiencia elegida (interesados o selección manual) */
  async sendArticleEmail(articleId: string, dto: SendArticleEmailDto) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: {
        title: true, slug: true, type: true, excerpt: true, featuredImage: true,
        tags: { select: { tagId: true } },
      },
    })
    if (!article) throw new NotFoundException('Artículo no encontrado')

    let recipients: { id: string; email: string; name: string | null }[]
    if (dto.subscriberIds?.length) {
      // Selección manual (solo activos, por seguridad)
      recipients = await this.prisma.subscriber.findMany({
        where: { id: { in: dto.subscriberIds }, unsubscribedAt: null },
        select: { id: true, email: true, name: true },
      })
    } else {
      // Interesados: suscriptores activos con un tema en común con la noticia
      const tagIds = article.tags.map((t) => t.tagId)
      if (!tagIds.length) {
        throw new BadRequestException('Esta noticia no tiene temas, así que no hay a quién segmentar. Elige los destinatarios manualmente.')
      }
      recipients = await this.prisma.subscriber.findMany({
        where: { unsubscribedAt: null, tags: { some: { tagId: { in: tagIds } } } },
        select: { id: true, email: true, name: true },
      })
    }
    if (recipients.length === 0) {
      throw new BadRequestException('No hay destinatarios activos para este envío')
    }

    const digestArticle: DigestArticle = {
      type: article.type as DigestArticle['type'],
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt ? stripAllHtml(article.excerpt).slice(0, 180) : null,
      featuredImage: article.featuredImage,
    }

    let sent = 0
    let failed = 0
    for (const r of recipients) {
      const ok = await this.emailService.sendSingleArticle(r.email, r.name, digestArticle, this.unsubscribeUrl(r.id))
      if (ok) sent++
      else failed++
    }
    await this.prisma.newsletterSend.create({
      data: { type: 'article', articleId, recipients: sent },
    })
    this.logger.log(`[article-email] "${article.title}" → ${sent}/${recipients.length} (fallidos: ${failed})`)
    return { total: recipients.length, sent, failed }
  }

  /** Elimina un suscriptor (limpieza de duplicados/typos). Cascade borra sus tags. */
  async deleteSubscriber(id: string) {
    const subscriber = await this.prisma.subscriber.findUnique({ where: { id }, select: { id: true } })
    if (!subscriber) throw new NotFoundException('Suscriptor no encontrado')
    await this.prisma.subscriber.delete({ where: { id } })
    return { ok: true }
  }

  // ─── Digest de noticias por especialidad para médicos (08 §1) ──────────────

  /** Desde cuándo buscar novedades para el digest a médicos (sin duplicar) */
  private async getDoctorDigestSince(): Promise<Date> {
    const lastSend = await this.prisma.newsletterSend.findFirst({
      where: { type: 'doctor-digest' },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    })
    return lastSend?.sentAt ?? new Date(Date.now() - DIGEST_DAYS * DAY_MS)
  }

  /** Artículos nuevos (desde `since`) con sus tagIds, para el match por especialidad */
  private async digestArticlesWithTags(since: Date) {
    const articles = await this.prisma.article.findMany({
      where: { status: 'PUBLISHED', publishedAt: { gt: since } },
      orderBy: { publishedAt: 'desc' },
      select: {
        type: true, title: true, slug: true, excerpt: true, featuredImage: true,
        tags: { select: { tagId: true } },
      },
    })
    return articles.map((a) => ({
      article: {
        type: a.type as DigestArticle['type'],
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt ? stripAllHtml(a.excerpt).slice(0, 180) : null,
        featuredImage: a.featuredImage,
      } as DigestArticle,
      tagIds: a.tags.map((t) => t.tagId),
    }))
  }

  /** Médicos elegibles: publicados, con email y sin opt-out del digest */
  private digestEligibleDoctors() {
    return this.prisma.doctor.findMany({
      where: { status: 'PUBLISHED', emailOptOut: false, email: { not: null } },
      select: {
        id: true, email: true, title: true, firstName: true, lastName: true,
        specialties: { select: { specialty: { select: { tags: { select: { tagId: true } } } } } },
      },
    })
  }

  private doctorTagSet(doctor: { specialties: { specialty: { tags: { tagId: string }[] } }[] }): Set<string> {
    const set = new Set<string>()
    for (const ds of doctor.specialties) for (const t of ds.specialty.tags) set.add(t.tagId)
    return set
  }

  /** Vista previa del digest a médicos: cuántos lo recibirían y con cuántas novedades */
  async previewDoctorDigest() {
    const since = await this.getDoctorDigestSince()
    const [pool, doctors, lastSend] = await Promise.all([
      this.digestArticlesWithTags(since),
      this.digestEligibleDoctors(),
      this.prisma.newsletterSend.findFirst({ where: { type: 'doctor-digest' }, orderBy: { sentAt: 'desc' } }),
    ])
    let willReceive = 0
    for (const d of doctors) {
      const tags = this.doctorTagSet(d)
      if (pool.some((p) => p.tagIds.some((id) => tags.has(id)))) willReceive++
    }
    return {
      articlePool: pool.length,
      eligibleDoctors: doctors.length,
      willReceive,
      lastSentAt: lastSend?.sentAt ?? null,
      lastSend: lastSend ? { sentAt: lastSend.sentAt, recipients: lastSend.recipients, auto: lastSend.auto } : null,
    }
  }

  /** Envía a cada médico las novedades que matchean SUS especialidades (08 §1) */
  async sendDoctorDigest(opts: { auto?: boolean } = {}) {
    const since = await this.getDoctorDigestSince()
    const pool = await this.digestArticlesWithTags(since)
    if (pool.length === 0) {
      if (opts.auto) {
        this.logger.log('[doctor-digest] auto: sin novedades desde el último envío')
        return { eligible: 0, targeted: 0, sent: 0, failed: 0, skipped: true }
      }
      throw new BadRequestException('No hay publicaciones nuevas desde el último digest a médicos')
    }
    const doctors = await this.digestEligibleDoctors()

    let sent = 0
    let failed = 0
    let targeted = 0
    for (const d of doctors) {
      if (!d.email) continue
      const tags = this.doctorTagSet(d)
      const matched = pool.filter((p) => p.tagIds.some((id) => tags.has(id))).map((p) => p.article).slice(0, 6)
      if (matched.length === 0) continue
      targeted++
      const name = `${d.title ?? ''} ${d.firstName} ${d.lastName}`.trim()
      // EmailLog con token único: atribuye los clics y la sesión que abra (08 §2)
      const token = randomBytes(16).toString('base64url')
      await this.prisma.emailLog.create({ data: { doctorId: d.id, type: 'specialty-news', token } })
      const ok = await this.emailService.sendDoctorDigest(d.email, name, matched, this.doctorOptOutUrl(d.id), token)
      if (ok) sent++
      else failed++
    }
    await this.prisma.newsletterSend.create({
      data: { type: 'doctor-digest', recipients: sent, auto: opts.auto ?? false },
    })
    this.logger.log(`[doctor-digest] ${opts.auto ? 'auto ' : ''}enviado a ${sent}/${targeted} (fallidos: ${failed})`)
    return { eligible: doctors.length, targeted, sent, failed, skipped: false }
  }

  private doctorOptOutToken(id: string): string {
    const secret = this.config.get<string>('JWT_SECRET') ?? 'reporte-medico-newsletter'
    return createHmac('sha256', secret).update(`doctor-optout:${id}`).digest('base64url').slice(0, 24)
  }

  private doctorOptOutUrl(id: string): string {
    const front = this.config.get<string>('FRONTEND_URL') ?? 'https://reportemedico.com'
    return `${front}/digest-medico/baja?d=${id}&t=${this.doctorOptOutToken(id)}`
  }

  /** Opt-out del digest a médicos (link del email, token HMAC). Apaga emailOptOut. */
  async doctorDigestOptOut(id: string, token: string) {
    if (!id || !token || token !== this.doctorOptOutToken(id)) {
      throw new BadRequestException('El link no es válido')
    }
    const doctor = await this.prisma.doctor.findUnique({ where: { id }, select: { id: true, emailOptOut: true } })
    if (!doctor) throw new NotFoundException('No encontramos tu perfil')
    if (!doctor.emailOptOut) {
      await this.prisma.doctor.update({ where: { id }, data: { emailOptOut: true } })
    }
    return { ok: true }
  }

  /** Baja del digest: valida el token HMAC del link y marca unsubscribedAt */
  async unsubscribe(id: string, token: string) {
    if (!id || !token || token !== this.unsubToken(id)) {
      throw new BadRequestException('El link de baja no es válido')
    }
    const subscriber = await this.prisma.subscriber.findUnique({ where: { id } })
    if (!subscriber) throw new NotFoundException('No encontramos tu suscripción')
    if (!subscriber.unsubscribedAt) {
      await this.prisma.subscriber.update({ where: { id }, data: { unsubscribedAt: new Date() } })
    }
    return { email: subscriber.email }
  }

  /** Token de baja: HMAC del id con el secreto del servidor (no expone datos) */
  private unsubToken(id: string): string {
    const secret = this.config.get<string>('JWT_SECRET') ?? 'reporte-medico-newsletter'
    return createHmac('sha256', secret).update(`unsub:${id}`).digest('base64url').slice(0, 24)
  }

  private unsubscribeUrl(id: string): string {
    const front = this.config.get<string>('FRONTEND_URL') ?? 'https://reportemedico.com'
    return `${front}/newsletter/baja?s=${id}&t=${this.unsubToken(id)}`
  }
}
