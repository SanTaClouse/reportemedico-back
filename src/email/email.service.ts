import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import {
  articleReceivedTemplate,
  articleApprovedTemplate,
  articleRejectedTemplate,
  doctorPendingAdminTemplate,
  doctorReverifyAdminTemplate,
  doctorWelcomeTemplate,
  doctorDigestTemplate,
  newsletterDigestTemplate,
  singleArticleEmailTemplate,
  testTemplate,
  type DigestArticle,
} from './email.templates'

/**
 * EmailService — envío transaccional vía Brevo (SMTP) con nodemailer.
 *
 * Se autoconfigura desde las variables SMTP_*. Si faltan, queda en modo no-op
 * (loguea y no envía) para que el dev local funcione sin credenciales y para
 * que un fallo de email nunca rompa la operación que lo dispara.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private transporter: Transporter | null = null
  private readonly from: string
  private readonly frontendUrl: string

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST')
    const port = Number(this.config.get<string>('SMTP_PORT'))
    const user = this.config.get<string>('SMTP_USER')
    const pass = this.config.get<string>('SMTP_PASS')
    const emailFrom = this.config.get<string>('EMAIL_FROM')

    this.frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'https://reportemedico.com'
    this.from = emailFrom ? `"Reporte Médico" <${emailFrom}>` : ''

    if (host && port && user && pass && emailFrom) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 587 usa STARTTLS (secure:false), 465 SSL directo
        auth: { user, pass },
      })
      this.logger.log(`EmailService configurado (SMTP ${host}:${port})`)
    } else {
      this.logger.warn('EmailService en modo no-op: faltan variables SMTP_* / EMAIL_FROM')
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null
  }

  /** Verifica la conexión/credenciales SMTP sin enviar (para el endpoint de diagnóstico) */
  async verifyConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.transporter) return { ok: false, message: 'SMTP no configurado (faltan variables de entorno)' }
    try {
      await this.transporter.verify()
      return { ok: true, message: 'Conexión SMTP verificada correctamente' }
    } catch (e) {
      return { ok: false, message: `Fallo de conexión SMTP: ${(e as Error).message}` }
    }
  }

  /** Envío base. Nunca lanza: loguea y devuelve false ante error (fire-and-forget seguro). */
  private async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.debug(`[Email no-op] "${subject}" → ${to}`)
      return false
    }
    if (!to) return false
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html })
      this.logger.log(`Email enviado: "${subject}" → ${to}`)
      return true
    } catch (e) {
      this.logger.error(`Error enviando "${subject}" → ${to}: ${(e as Error).message}`)
      return false
    }
  }

  // ─── Emails de artículos (heredados de V1, ahora activos) ──────────────────

  async sendArticleReceived(to: string, authorName: string, articleTitle: string): Promise<void> {
    const { subject, html } = articleReceivedTemplate(authorName, articleTitle, this.frontendUrl)
    await this.send(to, subject, html)
  }

  async sendArticleApproved(to: string, authorName: string, articleTitle: string, slug: string): Promise<void> {
    const { subject, html } = articleApprovedTemplate(authorName, articleTitle, slug, this.frontendUrl)
    await this.send(to, subject, html)
  }

  async sendArticleRejected(to: string, authorName: string, articleTitle: string): Promise<void> {
    const { subject, html } = articleRejectedTemplate(authorName, articleTitle, this.frontendUrl)
    await this.send(to, subject, html)
  }

  // ─── Bienvenida al médico al publicar su perfil (08 §1) ────────────────────

  async sendDoctorWelcome(to: string, doctorName: string, slug: string): Promise<void> {
    const { subject, html } = doctorWelcomeTemplate(doctorName, slug, this.frontendUrl)
    await this.send(to, subject, html)
  }

  // ─── Aviso al admin de nuevo médico pendiente (07 §8) ──────────────────────

  async sendDoctorPendingToAdmin(doctorName: string): Promise<void> {
    const adminEmail = this.config.get<string>('ADMIN_EMAIL')
    if (!adminEmail) {
      this.logger.warn('ADMIN_EMAIL sin configurar — no se avisa el nuevo pendiente')
      return
    }
    const { subject, html } = doctorPendingAdminTemplate(doctorName, this.frontendUrl)
    await this.send(adminEmail, subject, html)
  }

  // ─── Aviso al admin: médico publicado editó su identidad (06 §7) ───────────

  async sendDoctorReverifyToAdmin(doctorName: string): Promise<void> {
    const adminEmail = this.config.get<string>('ADMIN_EMAIL')
    if (!adminEmail) {
      this.logger.warn('ADMIN_EMAIL sin configurar — no se avisa la re-verificación')
      return
    }
    const { subject, html } = doctorReverifyAdminTemplate(doctorName, this.frontendUrl)
    await this.send(adminEmail, subject, html)
  }

  // ─── Newsletter: digest a un suscriptor (08 §1) ────────────────────────────

  /** Devuelve true si se envió. El link de baja es único por suscriptor. */
  async sendNewsletterDigest(
    to: string,
    name: string | null,
    articles: DigestArticle[],
    unsubscribeUrl: string,
  ): Promise<boolean> {
    const { subject, html } = newsletterDigestTemplate(name, articles, unsubscribeUrl, this.frontendUrl)
    return this.send(to, subject, html)
  }

  /** Email de una sola noticia a un suscriptor segmentado (08 §1) */
  async sendSingleArticle(
    to: string,
    name: string | null,
    article: DigestArticle,
    unsubscribeUrl: string,
  ): Promise<boolean> {
    const { subject, html } = singleArticleEmailTemplate(name, article, unsubscribeUrl, this.frontendUrl)
    return this.send(to, subject, html)
  }

  /** Digest de noticias por especialidad para un médico (08 §1) */
  async sendDoctorDigest(
    to: string,
    doctorName: string,
    articles: DigestArticle[],
    optOutUrl: string,
  ): Promise<boolean> {
    const { subject, html } = doctorDigestTemplate(doctorName, articles, optOutUrl, this.frontendUrl)
    return this.send(to, subject, html)
  }

  // ─── Diagnóstico (endpoint admin) ──────────────────────────────────────────

  async sendTest(to: string): Promise<boolean> {
    const { subject, html } = testTemplate(this.frontendUrl)
    return this.send(to, subject, html)
  }
}
