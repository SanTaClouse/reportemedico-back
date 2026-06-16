/**
 * Seed de la Guía Médica (V2) para DESARROLLO — catálogos + clínicas
 * provisionales (coordenadas aproximadas).
 *
 * Para producción usar `npm run prisma:seed:catalogos` (sin clínicas falsas).
 *
 * Idempotente: usa upsert por slug; correr las veces que haga falta.
 * Uso: npm run prisma:seed:guia
 */
import { PrismaClient } from '@prisma/client'
import { clinics, cities, seedCatalogs } from './guia-seed-data'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed Guía Médica (catálogos + clínicas provisionales)...\n')

  await seedCatalogs(prisma)

  // Mapa slug→id de ciudades para vincular las clínicas
  const cityIds: Record<string, string> = {}
  for (const c of cities) {
    const city = await prisma.city.findUnique({ where: { slug: c.slug }, select: { id: true } })
    if (city) cityIds[c.slug] = city.id
  }

  for (const c of clinics) {
    const { citySlug, ...data } = c
    if (!cityIds[citySlug]) continue
    await prisma.clinic.upsert({
      where: { slug: c.slug },
      update: { ...data, cityId: cityIds[citySlug] },
      create: { ...data, cityId: cityIds[citySlug] },
    })
  }
  console.log(`✅ ${clinics.length} clínicas (coordenadas PROVISIONALES)`)

  console.log('\n🎉 Seed de la Guía Médica completado.')
  console.log('⚠️  Recordatorio: en producción las clínicas se cargan reales desde el admin.\n')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
