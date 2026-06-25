import { PrismaClient } from '@prisma/client'
import { BIO_DEFAULT_PAGE, BIO_DEFAULT_LINKS } from '../src/bio/bio.defaults'

/**
 * Seed DEDICADO de la página /bio. Seguro para producción:
 * solo toca las tablas de bio, es idempotente y NO crea artículos, tags,
 * admin ni nada más. Correr con:  npm run prisma:seed:bio
 */
const prisma = new PrismaClient()

async function main() {
  const page = await prisma.bioPage.upsert({
    where: { slug: BIO_DEFAULT_PAGE.slug },
    update: {}, // no piso ajustes existentes
    create: BIO_DEFAULT_PAGE,
  })

  const count = await prisma.bioLink.count({ where: { pageId: page.id } })
  if (count === 0) {
    await prisma.bioLink.createMany({
      data: BIO_DEFAULT_LINKS.map((l, i) => ({ ...l, pageId: page.id, order: i })),
    })
    console.log(`✅ Página /bio creada con ${BIO_DEFAULT_LINKS.length} enlaces`)
  } else {
    console.log(`✅ Página /bio ya existe (${count} enlaces) — sin cambios`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Error en seed-bio:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
