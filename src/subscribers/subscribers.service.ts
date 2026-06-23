import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { stripAllHtml } from '../utils/sanitize.util'
import type { DigestArticle } from '../email/email.templates'
import { CreateSubscriberDto } from './dto/create-subscriber.dto'
import { SendArticleEmailDto } from './dto/newsletter.dto'

// Digest: por default mira los últimos 14 días y manda hasta 6 publicaciones (08 §1)
const DIGEST_DAYS = 14
const DIGEST_LIMIT = 6

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

  /** Publicaciones recientes para el digest: las últimas PUBLISHED del período */
  private async recentArticles(days: number, limit: number): Promise<DigestArticle[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const articles = await this.prisma.article.findMany({
      where: { status: 'PUBLISHED', publishedAt: { gte: since } },
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

  /** Vista previa para el admin: qué artículos irían y a cuántos suscriptores */
  async previewNewsletter(days = DIGEST_DAYS, limit = DIGEST_LIMIT) {
    const [articles, recipientCount] = await Promise.all([
      this.recentArticles(days, limit),
      this.prisma.subscriber.count({ where: { unsubscribedAt: null } }),
    ])
    return { articles, recipientCount, days }
  }

  /** Envía el digest a todos los suscriptores activos. Nunca falla por un email. */
  async sendNewsletter(days = DIGEST_DAYS, limit = DIGEST_LIMIT) {
    const articles = await this.recentArticles(days, limit)
    if (articles.length === 0) {
      throw new BadRequestException('No hay publicaciones recientes para enviar')
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
    this.logger.log(`[newsletter] enviado a ${sent}/${subscribers.length} (fallidos: ${failed})`)
    return { total: subscribers.length, sent, failed, articles: articles.length }
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
    this.logger.log(`[article-email] "${article.title}" → ${sent}/${recipients.length} (fallidos: ${failed})`)
    return { total: recipients.length, sent, failed }
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
