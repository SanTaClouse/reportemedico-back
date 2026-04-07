import DOMPurify from 'isomorphic-dompurify'

// Tags HTML permitidos en el contenido editorial
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's',
  'h2', 'h3', 'h4',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'figure', 'figcaption',
  // Embeds de YouTube generados por TipTap
  'div', 'iframe',
]

// Atributos permitidos
const ALLOWED_ATTR = [
  'href', 'target', 'rel',
  'src', 'alt', 'width', 'height', 'loading',
  'class',
  // Atributos del wrapper div de YouTube (TipTap)
  'data-youtube-video',
  // Atributos del iframe de YouTube
  'allowfullscreen', 'autoplay', 'disablekbcontrols', 'enableiframeapi',
  'endtime', 'ivloadpolicy', 'loop', 'modestbranding', 'origin',
  'playlist', 'rel', 'start', 'frameborder',
]

// Hook que valida que los iframes solo apunten a YouTube
DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  if (node.nodeName === 'IFRAME' && data.attrName === 'src') {
    const allowed = /^https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\//
    if (!allowed.test(data.attrValue)) {
      data.forceKeepAttr = false
      data.attrValue = ''
    }
  }
})

/**
 * Sanitiza HTML de entrada para prevenir XSS.
 * Preserva el contenido editorial legítimo de TipTap, incluyendo embeds de YouTube.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return dirty
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['target'],
    FORCE_BODY: false,
  }) as string
}

/**
 * Elimina todo el HTML y devuelve solo texto plano.
 * Usar para campos como title, excerpt, authorName.
 */
export function stripAllHtml(dirty: string): string {
  if (!dirty) return dirty
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) as string
}
