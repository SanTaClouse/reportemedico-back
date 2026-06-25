/**
 * Contenido inicial de la página /bio. Fuente única usada por:
 *  - el auto-aprovisionamiento del BioService (crea la página la primera vez)
 *  - el seed dedicado prisma/seed-bio.ts
 * Cambiar acá se refleja en ambos. No incluye artículos ni nada fuera de bio.
 */
export const BIO_DEFAULT_PAGE = {
  slug: 'bio',
  title: 'Reporte Médico',
  subtitle: 'Una dosis de Información Saludable',
}

export const BIO_DEFAULT_LINKS: { label: string; url: string; icon: string }[] = [
  { label: 'Ventas por WhatsApp', url: 'https://wa.me/18295583999', icon: 'whatsapp' },
  { label: 'Lo último en salud', url: 'https://reportemedico.com/noticias', icon: 'newspaper' },
  { label: 'Guía Médica — encuentra tu especialista', url: 'https://reportemedico.com/guia-medica', icon: 'stethoscope' },
  { label: 'Escucha nuestro podcast', url: 'https://reportemedico.com/podcast', icon: 'mic' },
  { label: 'Síguenos en Instagram', url: 'https://instagram.com/reportemedicord', icon: 'instagram' },
]
