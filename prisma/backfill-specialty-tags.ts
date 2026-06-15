/**
 * Backfill one-shot (docs/v2/02 §3): conecta los tags históricos de noticias
 * con el catálogo de especialidades vía SpecialtyTag, emparejando por nombre
 * (insensible a acentos/mayúsculas).
 *
 * Es la contraparte de la adaptación de approveSpecialty: deja el cruce de
 * contenido V1↔V2 al día sin tocar datos existentes. Idempotente (upsert).
 *
 * Uso: npm run prisma:backfill:specialty-tags
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function stripAccents(str: string): string {
  return str.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

async function main() {
  console.log('🔗 Backfill SpecialtyTag (tags históricos ↔ especialidades)...\n')

  const [specialties, tags] = await Promise.all([
    prisma.specialty.findMany({ select: { id: true, name: true } }),
    prisma.tag.findMany({ select: { id: true, name: true } }),
  ])

  const tagByName = new Map(tags.map((t) => [stripAccents(t.name), t]))

  let linked = 0
  let already = 0
  for (const specialty of specialties) {
    const tag = tagByName.get(stripAccents(specialty.name))
    if (!tag) continue
    const existing = await prisma.specialtyTag.findUnique({
      where: { specialtyId_tagId: { specialtyId: specialty.id, tagId: tag.id } },
    })
    if (existing) {
      already++
      continue
    }
    await prisma.specialtyTag.create({
      data: { specialtyId: specialty.id, tagId: tag.id },
    })
    console.log(`  + ${specialty.name} ↔ #${tag.name}`)
    linked++
  }

  console.log(`\n✅ ${linked} cruces nuevos · ${already} ya existían`)
  console.log('🎉 Backfill completado.\n')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el backfill:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
