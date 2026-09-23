import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'
import type { SendMailOptions, Transporter } from 'nodemailer'
import {
  articleReceivedTemplate,
  articleApprovedTemplate,
  articleRejectedTemplate,
  doctorPendingAdminTemplate,
  doctorReverifyAdminTemplate,
  newLeadAdminTemplate,
  doctorWelcomeTemplate,
  doctorDigestTemplate,
  wizardReminderTemplate,
  newsletterDigestTemplate,
  singleArticleEmailTemplate,
  testTemplate,
  type DigestArticle,
} from './email.templates'
import {
  eventRegistrationReceivedTemplate,
  eventRegistrationTeamTemplate,
  eventAccessTemplate,
  EVENT_QR_CID,
  type AccessVariant,
  type EventEmailData,
  type EventTeamEmailData,
} from './event.templates'

/** Adjuntos que acompañan los emails del evento */
export interface EventEmailFiles {
  ics: string // .ics con las partes a las que asiste
  qrPng?: Buffer // solo el email de acceso
}

/**
 * EmailService — envío transaccional vía Brevo (SMTP) con nodemailer.
 *
 * Se autoconfigura desde las variables SMTP_*. Si faltan, queda en modo no-op
 * (loguea y no envía) para que el dev local funcione sin credenciales y para
 * que un fallo de email nunca rompa la operación que lo dispara.
 */
/** Lo que ve el servidor, sin secretos: para el diagnóstico del panel */
export interface SmtpDiagnostics {
  host: string | null
  port: string | null
  /** false = el valor de SMTP_PORT no es un número (típico: se pegó con un comentario al lado) */
  portIsNumber: boolean
  user: string | null
  hasPassword: boolean
  from: string | null
  eventsFrom: string | null
  notifyTo: string | null
  frontendUrl: string
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private transporter: Transporter | null = null
  private readonly from: string
  private readonly frontendUrl: string
  /** Todo lo del evento sale de eventos@ (docs/v2/11 §3); si falta, cae al remitente general */
  private readonly eventsFrom: string

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST')
    const port = Number(this.config.get<string>('SMTP_PORT'))
    const user = this.config.get<string>('SMTP_USER')
    const pass = this.config.get<string>('SMTP_PASS')
    const emailFrom = this.config.get<string>('EMAIL_FROM')

    this.frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'https://reportemedico.com'
    this.from = emailFrom ? `"Reporte Médico" <${emailFrom}>` : ''
    const eventsFrom = this.config.get<string>('EVENTS_EMAIL_FROM')
    this.eventsFrom = eventsFrom ? `"Reporte Médico · Eventos" <${eventsFrom}>` : this.from

    if (host && port && user && pass && emailFrom) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 587 usa STARTTLS (secure:false), 465 SSL directo
        auth: { user, pass },
      })
      this.logger.log(`EmailService configurado (SMTP ${host}:${port}, remitente ${emailFrom})`)
    } else {
      // Nombrar la variable que falta: sin esto, diagnosticar exige adivinar
      const faltan = Object.entries({ SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass, EMAIL_FROM: emailFrom })
        .filter(([, v]) => !v)
        .map(([k]) => k)
      const rawPort = this.config.get<string>('SMTP_PORT')
      if (!rawPort) faltan.push('SMTP_PORT')
      else if (!port) faltan.push(`SMTP_PORT (el valor "${rawPort}" no es un número)`)
      this.logger.warn(
        `EmailService en modo no-op: no se envía ningún correo. Falta configurar: ${faltan.join(', ')}`,
      )
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null
  }

  /**
   * Verifica la conexión/credenciales SMTP sin enviar, y devuelve qué está
   * viendo el servidor. Sirve para diagnosticar desde el panel sin leer logs:
   * distingue "faltan variables" de "el proveedor rechaza o el puerto está
   * bloqueado". Nunca devuelve la contraseña.
   */
  async verifyConnection(): Promise<{ ok: boolean; message: string; config: SmtpDiagnostics }> {
    const rawPort = this.config.get<string>('SMTP_PORT')
    const user = this.config.get<string>('SMTP_USER') ?? ''
    const config: SmtpDiagnostics = {
      host: this.config.get<string>('SMTP_HOST') ?? null,
      port: rawPort ?? null,
      portIsNumber: Number.isFinite(Number(rawPort)) && Number(rawPort) > 0,
      user: user ? `${user.slice(0, 4)}…${user.slice(user.indexOf('@'))}` : null,
      hasPassword: Boolean(this.config.get<string>('SMTP_PASS')),
      from: this.config.get<string>('EMAIL_FROM') ?? null,
      eventsFrom: this.eventsFrom || null,
      notifyTo: this.config.get<string>('EVENTS_NOTIFY_EMAIL') ?? this.config.get<string>('ADMIN_EMAIL') ?? null,
      frontendUrl: this.frontendUrl,
    }
    if (!this.transporter) {
      return {
        ok: false,
        message: 'SMTP no configurado: falta alguna variable (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS o EMAIL_FROM). No se envía ningún correo.',
        config,
      }
    }
    try {
      await this.transporter.verify()
      return { ok: true, message: 'Conexión SMTP verificada correctamente', config }
    } catch (e) {
      return { ok: false, message: `Fallo de conexión SMTP: ${(e as Error).message}`, config }
    }
  }

  /**
   * Envío base. Nunca lanza: loguea y devuelve false ante error (fire-and-forget seguro).
   * `text` opcional: la alternativa en texto plano. Mandar ambas partes mejora
   * la entrega y ayuda a que los avisos operativos caigan en Principal (no en
   * Promociones); sin `text` el mensaje viaja solo como HTML (como antes).
   */
  private async send(
    to: string,
    subject: string,
    html: string,
    text?: string,
    opts: { from?: string; attachments?: SendMailOptions['attachments'] } = {},
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.debug(`[Email no-op] "${subject}" → ${to}`)
      return false
    }
    if (!to) return false
    try {
      await this.transporter.sendMail({
        from: opts.from ?? this.from,
        to,
        subject,
        html,
        ...(text ? { text } : {}),
        ...(opts.attachments ? { attachments: opts.attachments } : {}),
      })
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

  /** Recordatorio de wizard incompleto a un médico en DRAFT (06 §4) */
  async sendWizardReminder(to: string, doctorName: string): Promise<boolean> {
    const { subject, html } = wizardReminderTemplate(doctorName, this.frontendUrl)
    return this.send(to, subject, html)
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

  /** Aviso al admin de un lead nuevo, para contacto de ventas inmediato */
  async sendNewLeadToAdmin(lead: {
    firstName: string
    lastName: string
    phone: string
    email: string
    specialtyName?: string | null
    planLabel: string
  }): Promise<void> {
    const adminEmail = this.config.get<string>('ADMIN_EMAIL')
    if (!adminEmail) {
      this.logger.warn('ADMIN_EMAIL sin configurar — no se avisa el nuevo lead')
      return
    }
    const { subject, html, text } = newLeadAdminTemplate(lead, this.frontendUrl)
    await this.send(adminEmail, subject, html, text)
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

  /** Digest de noticias por especialidad para un médico (08 §1). `trackToken` atribuye los clics (08 §2). */
  async sendDoctorDigest(
    to: string,
    doctorName: string,
    articles: DigestArticle[],
    optOutUrl: string,
    trackToken?: string,
  ): Promise<boolean> {
    const { subject, html } = doctorDigestTemplate(doctorName, articles, optOutUrl, this.frontendUrl, trackToken)
    return this.send(to, subject, html)
  }

  // ─── Eventos (Foro de Salud 5.0, docs/v2/11) ───────────────────────────────

  private icsAttachment(ics: string) {
    return {
      filename: 'evento.ics',
      content: ics,
      contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
    }
  }

  /** A la persona, apenas se inscribe: confirma el email y le deja la fecha en el calendario */
  async sendEventRegistrationReceived(to: string, data: EventEmailData, files: EventEmailFiles, opts: { updated?: boolean } = {}): Promise<boolean> {
    const { subject, html, text } = eventRegistrationReceivedTemplate(data, opts)
    return this.send(to, subject, html, text, {
      from: this.eventsFrom,
      attachments: [this.icsAttachment(files.ics)],
    })
  }

  /** Aviso interno por cada inscripción — va a la casilla del equipo del evento */
  async sendEventRegistrationToTeam(data: EventTeamEmailData): Promise<boolean> {
    const to = this.config.get<string>('EVENTS_NOTIFY_EMAIL') || this.config.get<string>('ADMIN_EMAIL')
    if (!to) {
      this.logger.warn('EVENTS_NOTIFY_EMAIL / ADMIN_EMAIL sin configurar — no se avisa la inscripción')
      return false
    }
    const { subject, html, text } = eventRegistrationTeamTemplate(data)
    return this.send(to, subject, html, text, { from: this.eventsFrom })
  }

  /** Inscripción aprobada, antes de la fecha de envío del QR */
  /** Email con el QR de acceso. El QR va embebido por CID (Gmail bloquea las imágenes data:). */
  async sendEventAccess(
    to: string,
    data: EventEmailData & { entryUrl: string },
    files: EventEmailFiles,
    variant?: AccessVariant,
  ): Promise<boolean> {
    const { subject, html, text } = eventAccessTemplate(data, variant)
    return this.send(to, subject, html, text, {
      from: this.eventsFrom,
      attachments: [
        ...(files.qrPng
          ? [{ filename: 'qr-acceso.png', content: files.qrPng, contentType: 'image/png', cid: EVENT_QR_CID }]
          : []),
        this.icsAttachment(files.ics),
      ],
    })
  }

  // ─── Diagnóstico (endpoint admin) ──────────────────────────────────────────

  async sendTest(to: string): Promise<boolean> {
    const { subject, html } = testTemplate(this.frontendUrl)
    return this.send(to, subject, html)
  }
}
