/**
 * Número para wa.me / tel: con código de país. En RD los números se escriben
 * 809/829/849 sin el 1 delante, y wa.me sin código de país no abre el chat.
 */
export function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 10 && /^(809|829|849)/.test(d)) return `1${d}`
  return d
}
