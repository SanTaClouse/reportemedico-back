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

// ─── Digest de noticias por especialidad para médicos (08 §1) ───────────────

export function doctorDigestTemplate(
  doctorName: string,
  articles: DigestArticle[],
  optOutUrl: string,
  frontendUrl: string,
  trackToken?: string,
) {
  const greeting = doctorName ? `Hola <strong>${doctorName}</strong>,` : '¡Hola!'
  const cards = articles.map((a) => digestArticleCard(a, frontendUrl, trackToken)).join('')
  const optout = `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#8a8f98;line-height:1.5;">
    Recibes estas novedades como parte de la Guía Médica de Reporte Médico.
    <a href="${optOutUrl}" style="color:#8a8f98;text-decoration:underline;">Dejar de recibir novedades</a>.
  </p>`

  return {
    subject: 'Novedades en tu especialidad — Reporte Médico 🩺',
    html: emailLayout(
      h2('Novedades en tu especialidad') +
        p(greeting) +
        p('Seleccionamos estas publicaciones recientes relacionadas con tus especialidades:') +
        cards +
        optout,
      { preheader: 'Lo último publicado en tus especialidades', frontendUrl },
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

// ─── Recordatorio de wizard incompleto (Doctor en DRAFT, 06 §4) ─────────────

export function wizardReminderTemplate(doctorName: string, frontendUrl: string) {
  const accountUrl = `${frontendUrl}/mi-cuenta`
  return {
    subject: 'Tu perfil en la Guía Médica está casi listo',
    html: emailLayout(
      h2('Te falta un paso para aparecer en la Guía') +
        p(`Hola <strong>${doctorName}</strong>,`) +
        p('Empezaste a crear tu perfil en la Guía Médica de Reporte Médico, pero quedó sin terminar. Completarlo toma pocos minutos y te deja visible para los pacientes que buscan un especialista como tú: apareces en las búsquedas por seguro, especialidad y ciudad, y te contactan directo por WhatsApp.') +
        ctaButton('Completar mi perfil', accountUrl) +
        p('Si ya no te interesa, puedes ignorar este correo.'),
      { preheader: 'Te falta un paso para aparecer en la Guía Médica', frontendUrl },
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

// ─── Newsletter: digest de noticias para suscriptores (08 §1) ───────────────

export interface DigestArticle {
  type: 'NEWS' | 'MEDICAL_ARTICLE'
  title: string
  slug: string
  excerpt: string | null
  featuredImage: string | null
}

/** Con token de email, enruta el link por /e/<token> para atribución (08 §2) */
function trackedUrl(frontendUrl: string, path: string, token?: string): string {
  if (!token) return `${frontendUrl}${path}`
  return `${frontendUrl}/e/${token}?to=${encodeURIComponent(path)}`
}

function digestArticleCard(article: DigestArticle, frontendUrl: string, token?: string): string {
  const path = article.type === 'NEWS' ? 'noticias' : 'articulos'
  const url = trackedUrl(frontendUrl, `/${path}/${article.slug}`, token)
  const img = article.featuredImage
    ? `<a href="${url}" style="text-decoration:none;">
         <img src="${article.featuredImage}" alt="" width="536" style="display:block;width:100%;max-width:536px;height:auto;border-radius:8px;margin-bottom:12px;" />
       </a>`
    : ''
  const excerpt = article.excerpt
    ? `<p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#555;">${article.excerpt}</p>`
    : ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr><td>
      ${img}
      <a href="${url}" style="text-decoration:none;">
        <h2 style="margin:0 0 8px;font-size:18px;line-height:1.35;color:${NAVY};font-weight:bold;">${article.title}</h2>
      </a>
      ${excerpt}
      <a href="${url}" style="display:inline-block;font-size:14px;font-weight:bold;color:${NAVY};text-decoration:none;border-bottom:2px solid ${GOLD};padding-bottom:1px;">Leer la nota →</a>
    </td></tr>
  </table>`
}

function unsubscribeFooter(unsubscribeUrl: string): string {
  return `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#8a8f98;line-height:1.5;">
    Recibes este correo porque te suscribiste a Reporte Médico.
    <a href="${unsubscribeUrl}" style="color:#8a8f98;text-decoration:underline;">Darte de baja</a>.
  </p>`
}

export function newsletterDigestTemplate(
  name: string | null,
  articles: DigestArticle[],
  unsubscribeUrl: string,
  frontendUrl: string,
) {
  const greeting = name ? `Hola <strong>${name}</strong>,` : '¡Hola!'
  const cards = articles.map((a) => digestArticleCard(a, frontendUrl)).join('')

  return {
    subject: 'Lo último en salud — Reporte Médico 🩺',
    html: emailLayout(
      h2('Lo más reciente de Reporte Médico') +
        p(greeting) +
        p('Estas son las publicaciones nuevas que seleccionamos para ti:') +
        cards +
        unsubscribeFooter(unsubscribeUrl),
      { preheader: 'Las noticias y artículos médicos más recientes', frontendUrl },
    ),
  }
}

/** Email de una sola noticia/artículo, dirigido a una audiencia segmentada (08 §1) */
export function singleArticleEmailTemplate(
  name: string | null,
  article: DigestArticle,
  unsubscribeUrl: string,
  frontendUrl: string,
) {
  const greeting = name ? `Hola <strong>${name}</strong>,` : '¡Hola!'

  return {
    subject: article.title,
    html: emailLayout(
      p(greeting) +
        p('Publicamos algo nuevo que creemos que te interesa:') +
        digestArticleCard(article, frontendUrl) +
        unsubscribeFooter(unsubscribeUrl),
      { preheader: article.excerpt ?? article.title, frontendUrl },
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
