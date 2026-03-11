import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Tags médicos iniciales
  const tags = [
    { name: 'Cardiología', slug: 'cardiologia' },
    { name: 'Oncología', slug: 'oncologia' },
    { name: 'Neurología', slug: 'neurologia' },
    { name: 'Pediatría', slug: 'pediatria' },
    { name: 'Dermatología', slug: 'dermatologia' },
    { name: 'Ginecología', slug: 'ginecologia' },
    { name: 'Nutrición', slug: 'nutricion' },
    { name: 'Salud Pública', slug: 'salud-publica' },
    { name: 'Investigación Clínica', slug: 'investigacion-clinica' },
    { name: 'Tecnología Médica', slug: 'tecnologia-medica' },
    { name: 'Cirugía', slug: 'cirugia' },
    { name: 'Diabetes', slug: 'diabetes' },
    { name: 'Gastroenterología', slug: 'gastroenterologia' },
    { name: 'Psiquiatría', slug: 'psiquiatria' },
    { name: 'Traumatología', slug: 'traumatologia' },
  ]

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    })
  }
  console.log(`✓ ${tags.length} tags creados`)

  // Usuario admin inicial
  const hashedPassword = await bcrypt.hash('CAMBIAR_EN_PRODUCCION', 12)
  await prisma.user.upsert({
    where: { email: 'admin@reportemedico.com' },
    update: {},
    create: {
      email: 'admin@reportemedico.com',
      password: hashedPassword,
      role: 'ADMIN',
      name: 'Administrador',
    },
  })
  console.log('✓ Usuario admin creado')

  console.log('Seed completado.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
