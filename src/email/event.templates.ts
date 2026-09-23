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
        '1. Te avisaremos por este medio cuando tu inscripción sea aprobada.<br>' +
          '2. El día antes del evento te enviaremos tu <strong>código QR de acceso</strong>.<br>' +
          '3. El día del evento, muéstralo en la entrada.',
      ) +
      p('Te adjuntamos el archivo del evento para que lo agregues a tu calendario (Apple, Outlook).') +
      ctaButton('Ver el programa', d.eventUrl),
    { preheader: 'Tu inscripción quedó registrada. Te confirmaremos por este medio.', frontendUrl: d.frontendUrl },
  )
  const text =
    `Hola ${d.firstName},\n\n` +
    `Tu inscripción al ${d.eventName} quedó registrada. Nuestro equipo la revisará y te confirmaremos por este correo.\n\n` +
    `${partsText(d.parts)}\n\n` +
    'El día antes del evento te enviaremos tu código QR de acceso.\n\n' +
    `Programa: ${d.eventUrl}`
  return { subject: `Recibimos tu inscripción — ${d.eventName}`, html, text }
}

// ─── Inscripción aprobada ───────────────────────────────────────────────────

export function eventApprovedTemplate(d: EventEmailData) {
  const html = emailLayout(
    h2('¡Tu inscripción fue aprobada!') +
      p(`Hola <strong>${esc(d.firstName)}</strong>, nos alegra confirmarte tu lugar en el <strong>${esc(d.eventName)}</strong>.`) +
      partsBlock(d.parts) +
      p(
        '<strong>Importante:</strong> el día antes del evento te enviaremos a este correo tu ' +
          '<strong>código QR de acceso</strong>. Tendrás que mostrarlo en la entrada, desde el celular o impreso.',
      ) +
      ctaButton('Ver el programa', d.eventUrl),
    { preheader: 'Tu lugar está confirmado. El día antes te llega tu QR de acceso.', frontendUrl: d.frontendUrl },
  )
  const text =
    `Hola ${d.firstName}, tu inscripción al ${d.eventName} fue aprobada.\n\n` +
    `${partsText(d.parts)}\n\n` +
    'El día antes del evento te enviaremos a este correo tu código QR de acceso. Tendrás que mostrarlo en la entrada.\n\n' +
    `Programa: ${d.eventUrl}`
  return { subject: `Tu inscripción fue aprobada — ${d.eventName}`, html, text }
}

// ─── Acceso con QR ──────────────────────────────────────────────────────────

export function eventAccessTemplate(d: EventEmailData & { entryUrl: string }) {
  const html = emailLayout(
    h2('Tu código QR de acceso') +
      p(`Hola <strong>${esc(d.firstName)}</strong>, este es tu pase para el <strong>${esc(d.eventName)}</strong>. Muéstralo en la entrada.`) +
      `<div style="text-align:center;margin:8px 0 4px;">
        <img src="cid:${EVENT_QR_CID}" width="240" height="240" alt="Código QR de acceso" style="display:inline-block;width:240px;height:240px;border:8px solid #ffffff;border-radius:8px;background:#ffffff;">
        <p style="margin:8px 0 0;font-size:15px;font-weight:bold;color:${NAVY};">${esc(d.firstName)} ${esc(d.lastName)}</p>
      </div>` +
      ctaButton('Abrir mi entrada', d.entryUrl) +
      p('Si no ves el código, ábrelo desde el botón. Te recomendamos guardar una captura de pantalla por si no tienes señal en el lugar.') +
      partsBlock(d.parts) +
      p('<span style="font-size:13px;color:#666;">Este código es personal: no lo compartas.</span>'),
    { preheader: 'Tu pase de entrada. Muéstralo en la puerta.', frontendUrl: d.frontendUrl },
  )
  const text =
    `Hola ${d.firstName}, este es tu acceso al ${d.eventName}.\n\n` +
    `Abre tu entrada con el código QR aquí: ${d.entryUrl}\n\n` +
    `${partsText(d.parts)}\n\n` +
    'Este código es personal: no lo compartas.'
  return { subject: `Tu acceso al ${d.eventName} (código QR)`, html, text }
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
    `</p><p>Revisar y aprobar: <a href="${d.adminUrl}">${d.adminUrl}</a></p></div>`
  const text =
    `Nueva inscripción al ${d.eventName} (van ${d.totalRegistrations}).\n\n` +
    `Nombre: ${name}\nWhatsApp: ${d.phone}\nCorreo: ${d.email}\n` +
    `Sector: ${d.sectorLabel}${d.specialtyName ? ` · ${d.specialtyName}` : ''}\n` +
    `Institución: ${d.institution ?? '—'}${d.position ? ` · ${d.position}` : ''}\n` +
    `Asiste a: ${d.attendanceLabel}\n\nRevisar y aprobar: ${d.adminUrl}`
  return { subject: `Nueva inscripción: ${name} — ${d.sectorLabel}`, html, text }
}
