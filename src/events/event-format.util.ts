import type { Event, EventAttendance, EventPart, EventSector } from '@prisma/client'

/** República Dominicana: UTC-4 todo el año, sin horario de verano */
export const EVENT_TZ = 'America/Santo_Domingo'

export const SECTOR_LABELS: Record<EventSector, string> = {
  DOCTOR: 'Médico/a',
  HEALTH_PROFESSIONAL: 'Otro profesional de la salud',
  CLINIC_MANAGEMENT: 'Clínica u hospital (gestión)',
  PHARMA: 'Industria farmacéutica / laboratorio',
  MEDTECH: 'Tecnología médica',
  INSURANCE: 'ARS / seguros',
  FINANCE: 'Banca / inversión',
  EDUCATION: 'Educación / universidad',
  PUBLIC_SECTOR: 'Sector público',
  GUILD: 'Gremio / sociedad médica',
  STUDENT: 'Estudiante',
  OTHER: 'Otro',
}

type EventTimes = Pick<
  Event,
  | 'id' | 'slug' | 'name' | 'venueName' | 'venueAddress'
  | 'dayTitle' | 'dayStartsAt' | 'dayEndsAt'
  | 'eveningTitle' | 'eveningVenue' | 'eveningStartsAt' | 'eveningEndsAt'
>

export interface PartInfo {
  part: EventPart
  title: string
  startsAt: Date
  endsAt: Date
  where: string
}

export function partsOf(attendance: EventAttendance): EventPart[] {
  if (attendance === 'BOTH') return ['DAY', 'EVENING']
  return [attendance]
}

export function attendanceLabel(event: Pick<Event, 'dayTitle' | 'eveningTitle'>, attendance: EventAttendance): string {
  if (attendance === 'DAY') return event.dayTitle
  if (attendance === 'EVENING') return event.eveningTitle
  return `${event.dayTitle} y ${event.eveningTitle}`
}

export function partInfo(event: EventTimes, part: EventPart): PartInfo {
  if (part === 'DAY') {
    return {
      part,
      title: event.dayTitle,
      startsAt: event.dayStartsAt,
      endsAt: event.dayEndsAt,
      where: event.venueName,
    }
  }
  return {
    part,
    title: event.eveningTitle,
    startsAt: event.eveningStartsAt,
    endsAt: event.eveningEndsAt,
    where: event.eveningVenue ? `${event.eveningVenue} · ${event.venueName}` : event.venueName,
  }
}

const dateFmt = new Intl.DateTimeFormat('es-DO', {
  timeZone: EVENT_TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})
const timeFmt = new Intl.DateTimeFormat('es-DO', {
  timeZone: EVENT_TZ, hour: 'numeric', minute: '2-digit', hour12: true,
})

/** "jueves, 26 de noviembre de 2026 · 8:00 a. m. – 5:00 p. m." */
export function formatWhen(startsAt: Date, endsAt: Date): string {
  return `${dateFmt.format(startsAt)} · ${timeFmt.format(startsAt)} – ${timeFmt.format(endsAt)}`
}

/** 20261126T120000Z */
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function googleCalendarUrl(eventName: string, info: PartInfo, details: string, address?: string | null): string {
  const qs = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${info.title} — ${eventName}`,
    dates: `${icsDate(info.startsAt)}/${icsDate(info.endsAt)}`,
    details,
    location: address ? `${info.where}, ${address}` : info.where,
    ctz: EVENT_TZ,
  })
  return `https://calendar.google.com/calendar/render?${qs}`
}

// ─── .ics (RFC 5545) ────────────────────────────────────────────────────────

const icsText = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Pliega líneas a 75 octetos (RFC 5545 §3.1) sin partir caracteres multibyte */
function fold(line: string): string {
  const out: string[] = []
  let current = ''
  let bytes = 0
  for (const ch of line) {
    const len = Buffer.byteLength(ch)
    if (bytes + len > (out.length ? 74 : 75)) {
      out.push(current)
      current = ''
      bytes = 0
    }
    current += ch
    bytes += len
  }
  out.push(current)
  return out.join('\r\n ')
}

export function buildIcs(event: EventTimes, parts: EventPart[], eventUrl: string): string {
  const stamp = icsDate(new Date())
  const vevents = parts.flatMap((part) => {
    const info = partInfo(event, part)
    const location = event.venueAddress ? `${info.where}, ${event.venueAddress}` : info.where
    return [
      'BEGIN:VEVENT',
      `UID:${event.id}-${part.toLowerCase()}@reportemedico.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(info.startsAt)}`,
      `DTEND:${icsDate(info.endsAt)}`,
      `SUMMARY:${icsText(`${info.title} — ${event.name}`)}`,
      `LOCATION:${icsText(location)}`,
      `DESCRIPTION:${icsText(`Programa y detalles: ${eventUrl}\nEl día anterior recibirás tu código QR de acceso por email.`)}`,
      `URL:${eventUrl}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsText(`Mañana: ${info.title}`)}`,
      'TRIGGER:-P1D',
      'END:VALARM',
      'END:VEVENT',
    ]
  })
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Reporte Medico//Eventos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...vevents,
    'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n'
}

/** Vive en utils/ porque también lo usan los emails de leads (V2) */
export { waNumber } from '../utils/phone.util'
