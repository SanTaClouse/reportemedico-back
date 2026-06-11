import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Llama al POST /api/revalidate del frontend (auth por REVALIDATE_SECRET)
 * para regenerar las páginas ISR afectadas por un cambio de datos.
 *
 * Regla operativa (docs/v2/07 §9): TODA acción que cambia datos públicos
 * de un médico pasa por revalidateDoctorPaths() — única fuente de los paths.
 */
@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name)

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  /** Fire-and-forget: una revalidación fallida nunca rompe la operación de origen */
  async revalidatePaths(paths: string[]): Promise<void> {
    if (!paths.length) return
    const frontendUrl = this.config.get<string>('FRONTEND_URL')
    const secret = this.config.get<string>('REVALIDATE_SECRET')
    if (!frontendUrl || !secret) {
      this.logger.warn('FRONTEND_URL o REVALIDATE_SECRET sin configurar — revalidación omitida')
      return
    }
    try {
      const res = await fetch(`${frontendUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ paths }),
      })
      if (!res.ok) {
        this.logger.warn(`Revalidación respondió ${res.status} para ${paths.length} paths`)
      }
    } catch (e) {
      this.logger.warn(`Revalidación falló: ${(e as Error).message}`)
    }
  }

  /**
   * Paths públicos afectados por un médico: su perfil, la home de la guía,
   * sus clínicas, sus ciudades, sus especialidades y los cruces esp × ciudad.
   */
  async collectDoctorPaths(doctorId: string): Promise<string[]> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        specialties: { include: { specialty: { select: { slug: true } } } },
        clinics: { include: { clinic: { select: { slug: true, city: { select: { slug: true } } } } } },
      },
    })
    if (!doctor) return []

    const paths = new Set<string>(['/guia-medica', `/medico/${doctor.slug}`])
    const citySlugs = new Set<string>()
    for (const dc of doctor.clinics) {
      paths.add(`/clinica/${dc.clinic.slug}`)
      citySlugs.add(dc.clinic.city.slug)
    }
    for (const citySlug of citySlugs) paths.add(`/guia-medica/ciudad/${citySlug}`)
    for (const ds of doctor.specialties) {
      paths.add(`/guia-medica/${ds.specialty.slug}`)
      for (const citySlug of citySlugs) paths.add(`/guia-medica/${ds.specialty.slug}/${citySlug}`)
    }
    return [...paths]
  }

  async revalidateDoctorPaths(doctorId: string, extraPaths: string[] = []): Promise<void> {
    const paths = await this.collectDoctorPaths(doctorId)
    await this.revalidatePaths([...new Set([...paths, ...extraPaths])])
  }
}
