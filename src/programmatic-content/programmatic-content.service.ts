import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { sanitizeHtml } from '../utils/sanitize.util'

interface PairRow {
  specialtyId: string
  specialtyName: string
  specialtySlug: string
  cityId: string
  cityName: string
  citySlug: string
  doctorCount: number
}

/**
 * Textos editoriales de páginas programáticas (03 §7 fase 2 / 07 §6).
 * Solo combinaciones esp × ciudad CON médicos publicados (P7), ordenadas por
 * cantidad de médicos — Alberto enriquece las de mayor tráfico que marque GSC.
 */
@Injectable()
export class ProgrammaticContentService {
  constructor(private prisma: PrismaService) {}

  /** Admin: combinaciones indexables + conteo + introText existente */
  async listEditable() {
    const pairs = await this.prisma.$queryRaw<PairRow[]>`
      SELECT s.id AS "specialtyId", s.name AS "specialtyName", s.slug AS "specialtySlug",
             ci.id AS "cityId", ci.name AS "cityName", ci.slug AS "citySlug",
             COUNT(DISTINCT d.id)::int AS "doctorCount"
      FROM "DoctorSpecialty" ds
      JOIN "Doctor" d        ON d.id = ds."doctorId" AND d.status = 'PUBLISHED'
      JOIN "Specialty" s     ON s.id = ds."specialtyId"
      JOIN "DoctorClinic" dc ON dc."doctorId" = d.id
      JOIN "Clinic" c        ON c.id = dc."clinicId"
      JOIN "City" ci         ON ci.id = c."cityId"
      GROUP BY s.id, s.name, s.slug, ci.id, ci.name, ci.slug
      ORDER BY "doctorCount" DESC, "specialtyName", "cityName"
    `
    const contents = await this.prisma.programmaticPageContent.findMany()
    const byKey = new Map(contents.map((c) => [`${c.specialtyId}:${c.cityId}`, c.introText]))

    return pairs.map((p) => ({
      ...p,
      introText: byKey.get(`${p.specialtyId}:${p.cityId}`) ?? null,
    }))
  }

  /** Admin: crea/actualiza/borra (introText vacío = borrar) el texto de una combinación */
  async upsertIntro(specialtyId: string, cityId: string, introText: string) {
    const clean = sanitizeHtml(introText).trim()
    if (!clean) {
      await this.prisma.programmaticPageContent
        .delete({ where: { specialtyId_cityId: { specialtyId, cityId } } })
        .catch(() => undefined) // no existía: nada que borrar
      return { introText: null }
    }
    const saved = await this.prisma.programmaticPageContent.upsert({
      where: { specialtyId_cityId: { specialtyId, cityId } },
      create: { specialtyId, cityId, introText: clean },
      update: { introText: clean },
    })
    return { introText: saved.introText }
  }

  /** Público: texto editorial de una combinación por slugs (null si no hay) */
  async getIntro(specialtySlug: string, citySlug: string) {
    const content = await this.prisma.programmaticPageContent.findFirst({
      where: { specialty: { slug: specialtySlug }, city: { slug: citySlug } },
      select: { introText: true },
    })
    return { introText: content?.introText ?? null }
  }
}
