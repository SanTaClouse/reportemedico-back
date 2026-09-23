/**
 * Plantillas de los emails del evento (Foro de Salud 5.0, docs/v2/11).
 * Mismo branding que los transaccionales; todo sale de eventos@reportemedico.com.
 */
import { emailLayout, ctaButton, h2, p } from './email.templates'

const NAVY = '#001450'

/** Content-ID del QR embebido en el email de acceso */
export const EVENT_QR_CID = 'qr-acceso@reportemedico.com'

export interface EventEmailPart {
  title: string // "Jornada Científica"
  when: string // "jueves, 26 de noviembre de 2026 · 8:00 a. m. – 5:00 p. m."
  where: string // "Salón Anacaona · Hotel Renaissance Santo Domingo Jaragua"
  googleUrl: string
}

export interface EventEmailData {
  firstName: string
  lastName: string
  eventName: string
  eventUrl: string
  frontendUrl: string
  parts: EventEmailPart[]
}

export interface EventTeamEmailData {
  eventName: string
  adminUrl: string
  firstName: string
  lastName: string
  email: string
  phone: string
  waNumber: string
  sectorLabel: string
  specialtyName: string | null
  institution: string | null
  position: string | null
  attendanceLabel: string
  totalRegistrations: number
  inGuide: boolean
}

/** Los datos del inscrito vienen de un form público: se escapan siempre */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function partsBlock(parts: EventEmailPart[]): string {
  const rows = parts
    .map(
      (part) => `<tr><td style="padding:14px 16px;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:bold;color:${NAVY};">${esc(part.title)}</p>
        <p style="margin:0 0 2px;font-size:14px;color:#333;">${esc(part.when)}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#555;">${esc(part.where)}</p>
        <a href="${part.googleUrl}" style="font-size:13px;color:#0064C8;font-weight:bold;text-decoration:none;">+ Agregar a Google Calendar</a>
      </td></tr>`,
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;background:#f4f7fa;border-radius:10px;border-top:0;">${rows}</table>`
}

const partsText = (parts: EventEmailPart[]) =>
  parts.map((part) => `- ${part.title}: ${part.when} — ${part.where}`).join('\n')

// ─── Recibimos tu inscripción ───────────────────────────────────────────────

export function eventRegistrationReceivedTemplate(d: EventEmailData) {
  const html = emailLayout(
    h2('¡Recibimos tu inscripción!') +
      p(`Hola <strong>${esc(d.firstName)}</strong>,`) +
      p(
        `Tu inscripción al <strong>${esc(d.eventName)}</strong> quedó registrada. ` +
          'Como es un evento con cupos, nuestro equipo la revisará y te confirmaremos por este correo.',
      ) +
      partsBlock(d.parts) +
      p('<strong>¿Qué sigue?</strong>') +
      p(
        '1. Nuestro equipo revisa tu inscripción.<br>' +
          '2. Al aprobarla, te llega a este correo tu <strong>código QR de acceso</strong>.<br>' +
          '3. El día del evento, muéstralo en la entrada desde el celular o impreso.',
      ) +
      p('Te adjuntamos el archivo del evento para que lo agregues a tu calendario (Apple, Outlook).') +
      ctaButton('Ver el programa', d.eventUrl),
    { preheader: 'Tu inscripción quedó registrada. Te confirmaremos por este medio.', frontendUrl: d.frontendUrl },
  )
  const text =
    `Hola ${d.firstName},\n\n` +
    `Tu inscripción al ${d.eventName} quedó registrada. Nuestro equipo la revisará y te confirmaremos por este correo.\n\n` +
    `${partsText(d.parts)}\n\n` +
    'Cuando aprobemos tu inscripción, te enviaremos a este correo tu código QR de acceso.\n\n' +
    `Programa: ${d.eventUrl}`
  return { subject: `Recibimos tu inscripción — ${d.eventName}`, html, text }
}

// ─── Acceso con QR: aprobación, recordatorios y reenvío ─────────────────────

/**
 * El QR sale al aprobar (decisión del cliente, 2026-09-23) y se repite en cada
 * recordatorio y el día anterior. Es un solo email con el mismo pase; lo que
 * cambia es el encabezado, para que el tercero no se lea como un duplicado.
 */
export type AccessVariant =
  | { kind: 'approved' }
  | { kind: 'reminder'; daysLeft: number }
  | { kind: 'resend' }

function accessCopy(d: EventEmailData, variant: AccessVariant) {
  if (variant.kind === 'approved') {
    return {
      subject: `¡Estás dentro! Tu acceso al ${d.eventName}`,
      title: '¡Tu lugar está confirmado!',
      intro:
        `Hola <strong>${esc(d.firstName)}</strong>, nos alegra confirmarte tu lugar en el ` +
        `<strong>${esc(d.eventName)}</strong>. Este es tu código QR de acceso: guárdalo, es tu entrada.`,
      preheader: 'Tu lugar está confirmado. Adentro está tu código QR de acceso.',
      textIntro: `Hola ${d.firstName}, tu lugar en el ${d.eventName} está confirmado. Este es tu código QR de acceso.`,
    }
  }
  if (variant.kind === 'reminder') {
    const { daysLeft } = variant
    const falta =
      daysLeft === 0 ? '¡Hoy es el día!' : daysLeft === 1 ? '¡Mañana nos vemos!' : `Faltan ${daysLeft} días`
    const subject =
      daysLeft === 0
        ? `Hoy es el ${d.eventName} — tu código QR`
        : daysLeft === 1
          ? `Mañana es el ${d.eventName} — tu código QR`
          : `Faltan ${daysLeft} días para el ${d.eventName}`
    return {
      subject,
      title: falta,
      intro:
        `Hola <strong>${esc(d.firstName)}</strong>, te esperamos en el <strong>${esc(d.eventName)}</strong>. ` +
        'Te dejamos otra vez tu código QR a mano, para que no tengas que buscarlo en la puerta.',
      preheader: `${falta} Tu código QR de acceso, otra vez a mano.`,
      textIntro: `Hola ${d.firstName}, ${falta.toLowerCase()} Te esperamos en el ${d.eventName}. Este es tu código QR.`,
    }
  }
  return {
    subject: `Tu acceso al ${d.eventName} (código QR)`,
    title: 'Tu código QR de acceso',
    intro:
      `Hola <strong>${esc(d.firstName)}</strong>, este es tu pase para el ` +
      `<strong>${esc(d.eventName)}</strong>. Muéstralo en la entrada.`,
    preheader: 'Tu pase de entrada. Muéstralo en la puerta.',
    textIntro: `Hola ${d.firstName}, este es tu acceso al ${d.eventName}.`,
  }
}

export function eventAccessTemplate(
  d: EventEmailData & { entryUrl: string },
  variant: AccessVariant = { kind: 'resend' },
) {
  const copy = accessCopy(d, variant)
  const html = emailLayout(
    h2(copy.title) +
      p(copy.intro) +
      `<div style="text-align:center;margin:8px 0 4px;">
        <img src="cid:${EVENT_QR_CID}" width="240" height="240" alt="Código QR de acceso" style="display:inline-block;width:240px;height:240px;border:8px solid #ffffff;border-radius:8px;background:#ffffff;">
        <p style="margin:8px 0 0;font-size:15px;font-weight:bold;color:${NAVY};">${esc(d.firstName)} ${esc(d.lastName)}</p>
      </div>` +
      ctaButton('Abrir mi entrada', d.entryUrl) +
      p('Si no ves el código, ábrelo desde el botón. Te recomendamos guardar una captura de pantalla por si no tienes señal en el lugar.') +
      partsBlock(d.parts) +
      p('<span style="font-size:13px;color:#666;">Este código es personal: no lo compartas.</span>'),
    { preheader: copy.preheader, frontendUrl: d.frontendUrl },
  )
  const text =
    `${copy.textIntro}\n\n` +
    `Abre tu entrada con el código QR aquí: ${d.entryUrl}\n\n` +
    `${partsText(d.parts)}\n\n` +
    'Este código es personal: no lo compartas.'
  return { subject: copy.subject, html, text }
}

// ─── Aviso interno al equipo del evento ─────────────────────────────────────

/**
 * Igual que el aviso de leads: correo simple, sin tarjeta de marca, para que
 * caiga en Principal y el equipo pueda contactar rápido.
 */
export function eventRegistrationTeamTemplate(d: EventTeamEmailData) {
  const name = `${d.firstName} ${d.lastName}`
  const rows: [string, string][] = [
    ['Nombre', esc(name)],
    ['WhatsApp', `<a href="tel:+${d.waNumber}">${esc(d.phone)}</a> (<a href="https://wa.me/${d.waNumber}">abrir WhatsApp</a>)`],
    ['Correo', `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>`],
    ['Sector', esc(d.sectorLabel) + (d.specialtyName ? ` · ${esc(d.specialtyName)}` : '')],
    ['Institución', d.institution ? esc(d.institution) + (d.position ? ` · ${esc(d.position)}` : '') : '—'],
    ['Asiste a', esc(d.attendanceLabel)],
  ]
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222;">` +
    `<p>Nueva inscripción al ${esc(d.eventName)} — van <strong>${d.totalRegistrations}</strong>.` +
    (d.inGuide ? ' Es un médico de la Guía Médica.' : '') +
    `</p><p>` +
    rows.map(([k, v]) => `<strong>${k}:</strong> ${v}`).join('<br>') +
    `</p><p>Revisar y aprobar: <a href="${d.adminUrl}">${d.adminUrl}</a><br>` +
    `<span style="color:#666;font-size:13px;">Desde el panel puedes aprobar, marcar invitados VIP, ` +
    `reenviar el código QR y exportar la lista completa.</span></p></div>`
  const text =
    `Nueva inscripción al ${d.eventName} (van ${d.totalRegistrations}).\n\n` +
    `Nombre: ${name}\nWhatsApp: ${d.phone}\nCorreo: ${d.email}\n` +
    `Sector: ${d.sectorLabel}${d.specialtyName ? ` · ${d.specialtyName}` : ''}\n` +
    `Institución: ${d.institution ?? '—'}${d.position ? ` · ${d.position}` : ''}\n` +
    `Asiste a: ${d.attendanceLabel}\n\nRevisar y aprobar: ${d.adminUrl}\n` +
    `Desde el panel puedes aprobar, marcar invitados VIP, reenviar el código QR y exportar la lista.`
  return { subject: `Nueva inscripción: ${name} — ${d.sectorLabel}`, html, text }
}
