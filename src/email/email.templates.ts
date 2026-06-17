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
  const waText = encodeURIComponent(`Escribí este artículo en Reporte Médico: ${articleTitle} ${url}`)
  const whatsappShare = `https://wa.me/?text=${waText}`

  // Banda dorada de felicitación
  const congratsBanner = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
    <tr><td style="background:${GOLD};border-radius:10px;padding:18px 20px;text-align:center;">
      <span style="font-size:28px;">🎉</span>
      <div style="margin-top:4px;color:${NAVY};font-size:18px;font-weight:bold;">¡Aprobamos tu artículo!</div>
    </td></tr>
  </table>`

  // Caja de compartir
  const shareBox = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0;">
    <tr><td style="background:#f4f5f7;border-radius:10px;padding:18px 20px;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:bold;color:${NAVY};">Compártelo con tus pacientes y colegas</p>
      <a href="${whatsappShare}" style="display:inline-block;padding:10px 22px;background:#25D366;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;">Compartir por WhatsApp</a>
      <p style="margin:12px 0 0;font-size:13px;color:#666;line-height:1.5;">
        Desde la página de tu artículo puedes compartirlo en <strong>Instagram</strong>, WhatsApp y más con un toque (botón “Compartir”).
      </p>
    </td></tr>
  </table>`

  return {
    subject: '¡Aprobamos tu artículo! 🎉 — Reporte Médico',
    html: emailLayout(
      congratsBanner +
        p(`Hola <strong>${authorName}</strong>,`) +
        p(`Tu artículo <strong>“${articleTitle}”</strong> pasó la revisión editorial y ya está publicado en Reporte Médico. ¡Gracias por aportar contenido de calidad para la comunidad médica dominicana!`) +
        ctaButton('Ver mi artículo publicado', url) +
        shareBox,
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

// ─── Bienvenida al médico (perfil aprobado y publicado) ─────────────────────

export function doctorWelcomeTemplate(doctorName: string, slug: string, frontendUrl: string) {
  const profileUrl = `${frontendUrl}/medico/${slug}`
  const accountUrl = `${frontendUrl}/mi-cuenta`
  return {
    subject: '¡Tu perfil ya está publicado en la Guía Médica! 🩺',
    html: emailLayout(
      h2('¡Bienvenido a la Guía Médica!') +
        p(`Hola <strong>${doctorName}</strong>,`) +
        p('Tu perfil fue aprobado por nuestro equipo y ya está publicado en Reporte Médico. Desde ahora los pacientes pueden encontrarte en las búsquedas por seguro, especialidad y ciudad, y contactarte directo por WhatsApp.') +
        ctaButton('Ver mi perfil', profileUrl) +
        p('Desde tu cuenta puedes editar tus datos cuando quieras y enviar artículos a la revista sin recargar tu información.') +
        p(
          `<a href="${accountUrl}" style="color:${NAVY};font-weight:bold;">Ir a mi cuenta</a> · ` +
            '¿Quieres los beneficios Premium (revista, fotografía profesional, video, podcast)? Responde este correo y te contamos.',
        ),
      { preheader: 'Tu perfil ya está online', frontendUrl },
    ),
  }
}

// ─── Aviso al admin: nuevo médico pendiente de aprobación ───────────────────

export function doctorPendingAdminTemplate(doctorName: string, frontendUrl: string) {
  const url = `${frontendUrl}/admin/guia-medica/pendientes`
  return {
    subject: `Nuevo médico pendiente de aprobación: ${doctorName}`,
    html: emailLayout(
      h2('Nuevo perfil para revisar') +
        p(`<strong>${doctorName}</strong> completó su registro en la Guía Médica y envió su perfil para aprobación.`) +
        ctaButton('Revisar en el panel', url) +
        p('Revisa los datos, normaliza la clínica si hace falta y publica el perfil.'),
      { preheader: `${doctorName} espera aprobación`, frontendUrl },
    ),
  }
}

// ─── Aviso al admin: médico publicado editó su identidad (re-verificar) ─────

export function doctorReverifyAdminTemplate(doctorName: string, frontendUrl: string) {
  const url = `${frontendUrl}/admin/guia-medica/pendientes`
  return {
    subject: `Re-verificar identidad: ${doctorName}`,
    html: emailLayout(
      h2('Un médico publicado editó su identidad') +
        p(`<strong>${doctorName}</strong> cambió su nombre, título o exequátur desde su cuenta. Su perfil sigue publicado, pero el sello ✓ Verificado quedó en pausa hasta que confirmes sus datos.`) +
        ctaButton('Revisar y re-verificar', url) +
        p('Abre su ficha, confirma el exequátur y reactiva el badge para que vuelva a aparecer verificado.'),
      { preheader: `${doctorName} cambió datos de identidad`, frontendUrl },
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
