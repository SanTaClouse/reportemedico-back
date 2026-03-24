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
]

// Atributos permitidos
const ALLOWED_ATTR = [
  'href', 'target', 'rel',
  'src', 'alt', 'width', 'height', 'loading',
  'class',
]

/**
 * Sanitiza HTML de entrada para prevenir XSS.
 * Preserva el contenido editorial legítimo de TipTap.
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
