/**
 * Plantillas HTML de los emails transaccionales — branding navy/gold de V1.
 * Inline styles (los clientes de correo no soportan <style> ni clases externas).
 */

const NAVY = '#001450'
const GOLD = '#F0B414'

interface LayoutOpts {
  preheader?: string // texto de preview en la bandeja, oculto en el cuerpo
  frontendUrl: string
}

/** Envoltorio común: header con logo textual, cuerpo y footer */
export function emailLayout(bodyHtml: string, opts: LayoutOpts): string {
  const { preheader = '', frontendUrl } = opts
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:${NAVY};padding:24px 32px;">
              <a href="${frontendUrl}" style="text-decoration:none;">
                <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.3px;">Reporte</span><span style="color:${GOLD};font-size:20px;font-weight:bold;">Médico</span>
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#f4f5f7;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#8a8f98;line-height:1.5;">
                Reporte Médico · Guía de salud de República Dominicana<br>
                <a href="${frontendUrl}" style="color:#8a8f98;">reportemedico.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Botón CTA dorado */
function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background:${GOLD};border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:12px 28px;color:${NAVY};font-size:15px;font-weight:bold;text-decoration:none;">${label}</a>
    </td></tr>
  </table>`
}

const h2 = (text: string) =>
  `<h1 style="margin:0 0 16px;font-size:22px;color:${NAVY};font-weight:bold;">${text}</h1>`
const p = (text: string) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333;">${text}</p>`

// ─── Artículo recibido ──────────────────────────────────────────────────────

export function articleReceivedTemplate(authorName: string, articleTitle: string, frontendUrl: string) {
  return {
    subject: 'Recibimos tu artículo — Reporte Médico',
    html: emailLayout(
      h2('¡Gracias por tu envío!') +
        p(`Hola <strong>${authorName}</strong>,`) +
        p(`Recibimos tu artículo <strong>“${articleTitle}”</strong>. Nuestro equipo editorial lo revisará en los próximos 3 a 5 días hábiles.`) +
        p('Te avisaremos a este correo cuando sea aprobado y publicado.'),
      { preheader: `Recibimos “${articleTitle}”`, frontendUrl },
    ),
  }
}

// ─── Artículo aprobado y publicado ──────────────────────────────────────────

export function articleApprovedTemplate(authorName: string, articleTitle: string, slug: string, frontendUrl: string) {
  const url = `${frontendUrl}/articulos/${slug}`
  return {
    subject: '¡Tu artículo fue publicado! — Reporte Médico',
    html: emailLayout(
      h2('Tu artículo ya está publicado') +
        p(`Hola <strong>${authorName}</strong>,`) +
        p(`Tu artículo <strong>“${articleTitle}”</strong> fue aprobado por nuestro equipo editorial y ya está disponible en Reporte Médico.`) +
        ctaButton('Ver mi artículo', url) +
        p('Gracias por contribuir con contenido de calidad para la comunidad médica dominicana.'),
      { preheader: `“${articleTitle}” ya está publicado`, frontendUrl },
    ),
  }
}

// ─── Artículo rechazado ─────────────────────────────────────────────────────

export function articleRejectedTemplate(authorName: string, articleTitle: string, frontendUrl: string) {
  return {
    subject: 'Sobre tu artículo enviado — Reporte Médico',
    html: emailLayout(
      h2('Revisión de tu artículo') +
        p(`Hola <strong>${authorName}</strong>,`) +
        p(`Gracias por enviar <strong>“${articleTitle}”</strong>. Tras la revisión editorial, no podremos publicarlo en esta ocasión.`) +
        p('Te invitamos a revisar nuestras pautas y volver a enviarnos contenido cuando quieras. Estamos para ayudarte.'),
      { preheader: 'Novedades sobre tu artículo', frontendUrl },
    ),
  }
}

// ─── Prueba de configuración (solo dev/admin) ───────────────────────────────

export function testTemplate(frontendUrl: string) {
  return {
    subject: 'Prueba de envío — Reporte Médico',
    html: emailLayout(
      h2('✅ El email funciona') +
        p('Si estás leyendo esto, la configuración SMTP de Brevo está correcta: dominio autenticado, credenciales válidas y envío operativo.') +
        p('Este es un correo de prueba generado desde el panel de administración.'),
      { preheader: 'Configuración SMTP verificada', frontendUrl },
    ),
  }
}
