/**
 * Seed de catálogos para PRODUCCIÓN — especialidades + ARS + ciudades + cruces
 * con tags V1. NO carga clínicas (Alberto las carga reales desde el admin).
 *
 * Idempotente (upsert). Seguro de correr varias veces.
 * Uso: npm run prisma:seed:catalogos
 * (para correr contra producción, exportar DATABASE_URL apuntando a la BD prod)
 */
import { PrismaClient } from '@prisma/client'
import { seedCatalogs } from './guia-seed-data'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed de catálogos (especialidades, ARS, ciudades)...\n')
  await seedCatalogs(prisma)
  console.log('\n🎉 Catálogos cargados. Las clínicas se cargan desde el admin.\n')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
