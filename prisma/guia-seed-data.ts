/**
 * Datos de bootstrap de los catálogos de la Guía Médica (V2).
 * Compartido por seed-guia-medica.ts (dev, con clínicas provisionales) y
 * seed-guia-catalogos.ts (producción, sin clínicas — Alberto carga las reales).
 *
 * schemaOrgValue: enum MedicalSpecialty de schema.org (docs/v2/03 §3).
 * null = sin match limpio; el JSON-LD omite el campo.
 */
import type { PrismaClient } from '@prisma/client'

export const specialties: { name: string; slug: string; schemaOrgValue: string | null }[] = [
  { name: 'Alergología',                    slug: 'alergologia',                    schemaOrgValue: null },
  { name: 'Anestesiología',                 slug: 'anestesiologia',                 schemaOrgValue: 'Anesthesia' },
  { name: 'Cardiología',                    slug: 'cardiologia',                    schemaOrgValue: 'Cardiovascular' },
  { name: 'Cirugía General',                slug: 'cirugia-general',                schemaOrgValue: 'Surgical' },
  { name: 'Cirugía Plástica',               slug: 'cirugia-plastica',               schemaOrgValue: 'PlasticSurgery' },
  { name: 'Dermatología',                   slug: 'dermatologia',                   schemaOrgValue: 'Dermatology' },
  { name: 'Endocrinología',                 slug: 'endocrinologia',                 schemaOrgValue: 'Endocrine' },
  { name: 'Gastroenterología',              slug: 'gastroenterologia',              schemaOrgValue: 'Gastroenterologic' },
  { name: 'Geriatría',                      slug: 'geriatria',                      schemaOrgValue: 'Geriatric' },
  { name: 'Ginecología y Obstetricia',      slug: 'ginecologia-y-obstetricia',      schemaOrgValue: 'Gynecologic' },
  { name: 'Hematología',                    slug: 'hematologia',                    schemaOrgValue: 'Hematologic' },
  { name: 'Infectología',                   slug: 'infectologia',                   schemaOrgValue: 'Infectious' },
  { name: 'Medicina de Emergencias',        slug: 'medicina-de-emergencias',        schemaOrgValue: 'Emergency' },
  { name: 'Medicina Familiar',              slug: 'medicina-familiar',              schemaOrgValue: 'PrimaryCare' },
  { name: 'Medicina Física y Rehabilitación', slug: 'medicina-fisica-y-rehabilitacion', schemaOrgValue: null },
  { name: 'Medicina General',               slug: 'medicina-general',               schemaOrgValue: 'PrimaryCare' },
  { name: 'Medicina Interna',               slug: 'medicina-interna',               schemaOrgValue: null },
  { name: 'Nefrología',                     slug: 'nefrologia',                     schemaOrgValue: 'Renal' },
  { name: 'Neumología',                     slug: 'neumologia',                     schemaOrgValue: 'Pulmonary' },
  { name: 'Neurocirugía',                   slug: 'neurocirugia',                   schemaOrgValue: 'Neurologic' },
  { name: 'Neurología',                     slug: 'neurologia',                     schemaOrgValue: 'Neurologic' },
  { name: 'Nutriología',                    slug: 'nutriologia',                    schemaOrgValue: 'DietNutrition' },
  { name: 'Odontología',                    slug: 'odontologia',                    schemaOrgValue: 'Dentistry' },
  { name: 'Oftalmología',                   slug: 'oftalmologia',                   schemaOrgValue: null },
  { name: 'Oncología',                      slug: 'oncologia',                      schemaOrgValue: 'Oncologic' },
  { name: 'Ortopedia y Traumatología',      slug: 'ortopedia-y-traumatologia',      schemaOrgValue: 'Musculoskeletal' },
  { name: 'Otorrinolaringología',           slug: 'otorrinolaringologia',           schemaOrgValue: 'Otolaryngologic' },
  { name: 'Pediatría',                      slug: 'pediatria',                      schemaOrgValue: 'Pediatric' },
  { name: 'Psicología Clínica',             slug: 'psicologia-clinica',             schemaOrgValue: null },
  { name: 'Psiquiatría',                    slug: 'psiquiatria',                    schemaOrgValue: 'Psychiatric' },
  { name: 'Radiología',                     slug: 'radiologia',                     schemaOrgValue: 'Radiography' },
  { name: 'Reumatología',                   slug: 'reumatologia',                   schemaOrgValue: 'Rheumatologic' },
  { name: 'Urología',                       slug: 'urologia',                       schemaOrgValue: 'Urologic' },
]

export const insurances: { name: string; slug: string }[] = [
  { name: 'SeNaSa',              slug: 'senasa' },
  { name: 'ARS Humano',          slug: 'ars-humano' },
  { name: 'ARS Universal',       slug: 'ars-universal' },
  { name: 'MAPFRE Salud ARS',    slug: 'mapfre-salud-ars' },
  { name: 'ARS Futuro',          slug: 'ars-futuro' },
  { name: 'ARS Monumental',      slug: 'ars-monumental' },
  { name: 'ARS Simag',           slug: 'ars-simag' },
  { name: 'ARS Yunén',           slug: 'ars-yunen' },
  { name: 'ARS Reservas',        slug: 'ars-reservas' },
  { name: 'ARS Semma',           slug: 'ars-semma' },
  { name: 'ARS CMD',             slug: 'ars-cmd' },
  { name: 'ARS APS',             slug: 'ars-aps' },
]

export const cities: { name: string; slug: string }[] = [
  { name: 'Santo Domingo',             slug: 'santo-domingo' },
  { name: 'Santo Domingo Este',        slug: 'santo-domingo-este' },
  { name: 'Santo Domingo Norte',       slug: 'santo-domingo-norte' },
  { name: 'Santo Domingo Oeste',       slug: 'santo-domingo-oeste' },
  { name: 'Santiago de los Caballeros', slug: 'santiago' },
  { name: 'La Vega',                   slug: 'la-vega' },
  { name: 'San Pedro de Macorís',      slug: 'san-pedro-de-macoris' },
  { name: 'La Romana',                 slug: 'la-romana' },
  { name: 'Puerto Plata',              slug: 'puerto-plata' },
  { name: 'San Cristóbal',             slug: 'san-cristobal' },
  { name: 'Higüey',                    slug: 'higuey' },
  { name: 'Punta Cana – Bávaro',       slug: 'punta-cana' },
  { name: 'San Francisco de Macorís',  slug: 'san-francisco-de-macoris' },
  { name: 'Moca',                      slug: 'moca' },
  { name: 'Baní',                      slug: 'bani' },
  { name: 'Bonao',                     slug: 'bonao' },
  { name: 'Azua',                      slug: 'azua' },
  { name: 'Barahona',                  slug: 'barahona' },
]

// Clínicas con coordenadas APROXIMADAS — solo para dev. En producción Alberto
// carga las reales con coordenadas exactas desde el admin.
export const clinics: { name: string; slug: string; citySlug: string; address: string; latitude: number; longitude: number; phone?: string }[] = [
  { name: 'CEDIMAT',                                  slug: 'cedimat',                                citySlug: 'santo-domingo', address: 'Plaza de la Salud, Av. Ortega y Gasset', latitude: 18.4837, longitude: -69.9123 },
  { name: 'Hospital General de la Plaza de la Salud', slug: 'hospital-general-plaza-de-la-salud',     citySlug: 'santo-domingo', address: 'Av. Ortega y Gasset, Ensanche La Fe',    latitude: 18.4849, longitude: -69.9118 },
  { name: 'Clínica Abreu',                            slug: 'clinica-abreu',                          citySlug: 'santo-domingo', address: 'Calle Arzobispo Portes 853, Ciudad Nueva', latitude: 18.4646, longitude: -69.8990 },
  { name: 'Clínica Corazones Unidos',                 slug: 'clinica-corazones-unidos',               citySlug: 'santo-domingo', address: 'Calle Fantino Falco 21, Naco',           latitude: 18.4775, longitude: -69.9135 },
  { name: 'Centro de Obstetricia y Ginecología',      slug: 'centro-de-obstetricia-y-ginecologia',    citySlug: 'santo-domingo', address: 'Av. Independencia esq. José Joaquín Pérez, Gazcue', latitude: 18.4640, longitude: -69.9050 },
  { name: 'Centro Médico Moderno',                    slug: 'centro-medico-moderno',                  citySlug: 'santo-domingo', address: 'Av. 27 de Febrero, Ensanche Naco',       latitude: 18.4720, longitude: -69.9210 },
  { name: 'CEMDOE',                                   slug: 'cemdoe',                                 citySlug: 'santo-domingo', address: 'Av. Pedro Henríquez Ureña 161',          latitude: 18.4690, longitude: -69.9170 },
  { name: 'Centro Médico UCE',                        slug: 'centro-medico-uce',                      citySlug: 'santo-domingo', address: 'Av. Máximo Gómez esq. Pedro Henríquez Ureña', latitude: 18.4730, longitude: -69.9060 },
  { name: 'Hospital Metropolitano de Santiago (HOMS)', slug: 'homs',                                  citySlug: 'santiago',      address: 'Autopista Duarte Km 2.8',                latitude: 19.4280, longitude: -70.7280 },
  { name: 'Clínica Unión Médica del Norte',           slug: 'clinica-union-medica',                   citySlug: 'santiago',      address: 'Av. Juan Pablo Duarte 176',              latitude: 19.4440, longitude: -70.6860 },
  { name: 'Clínica Corominas',                        slug: 'clinica-corominas',                      citySlug: 'santiago',      address: 'Calle Restauración 57',                  latitude: 19.4500, longitude: -70.7000 },
  { name: 'Hospiten Bávaro',                          slug: 'hospiten-bavaro',                        citySlug: 'punta-cana',    address: 'Carretera Higüey–Punta Cana, Bávaro',    latitude: 18.6770, longitude: -68.4040 },
  { name: 'Centro Médico Punta Cana',                 slug: 'centro-medico-punta-cana',               citySlug: 'punta-cana',    address: 'Av. España, Bávaro',                     latitude: 18.6820, longitude: -68.4120 },
  { name: 'Hospital Central Romana',                  slug: 'hospital-central-romana',                citySlug: 'la-romana',     address: 'Av. Libertad, La Romana',                latitude: 18.4270, longitude: -68.9730 },
  { name: 'Centro Médico Bournigal',                  slug: 'centro-medico-bournigal',                citySlug: 'puerto-plata',  address: 'Calle Antera Mota, Puerto Plata',        latitude: 19.7930, longitude: -70.6900 },
]

// Mapeo inicial tags (V1) ↔ especialidades. Solo se crean los cruces cuyos
// tags existan en la BD (slugs del seed V1).
export const specialtyTagMap: Record<string, string[]> = {
  'cardiologia':        ['cardiologia', 'hipertension'],
  'oncologia':          ['oncologia'],
  'neurologia':         ['neurologia'],
  'pediatria':          ['pediatria'],
  'dermatologia':       ['dermatologia'],
  'ginecologia-y-obstetricia': ['ginecologia'],
  'nutriologia':        ['nutricion'],
  'cirugia-general':    ['cirugia'],
  'endocrinologia':     ['diabetes'],
  'gastroenterologia':  ['gastroenterologia'],
  'psiquiatria':        ['psiquiatria', 'salud-mental'],
  'psicologia-clinica': ['salud-mental'],
  'ortopedia-y-traumatologia': ['traumatologia'],
  'infectologia':       ['infectologia', 'dengue', 'vacunacion'],
  'medicina-general':   ['salud-publica'],
}

/** Upsert de especialidades + ARS + ciudades + cruces (sin clínicas). Reutilizable. */
export async function seedCatalogs(prisma: PrismaClient) {
  for (const s of specialties) {
    await prisma.specialty.upsert({ where: { slug: s.slug }, update: { name: s.name, schemaOrgValue: s.schemaOrgValue }, create: s })
  }
  console.log(`✅ ${specialties.length} especialidades`)

  for (const i of insurances) {
    await prisma.insurance.upsert({ where: { slug: i.slug }, update: { name: i.name }, create: i })
  }
  console.log(`✅ ${insurances.length} seguros (ARS)`)

  for (const c of cities) {
    await prisma.city.upsert({ where: { slug: c.slug }, update: { name: c.name }, create: c })
  }
  console.log(`✅ ${cities.length} ciudades`)

  let crossed = 0
  for (const [specialtySlug, tagSlugs] of Object.entries(specialtyTagMap)) {
    const specialty = await prisma.specialty.findUnique({ where: { slug: specialtySlug } })
    if (!specialty) continue
    for (const tagSlug of tagSlugs) {
      const tag = await prisma.tag.findUnique({ where: { slug: tagSlug } })
      if (!tag) continue
      await prisma.specialtyTag.upsert({
        where: { specialtyId_tagId: { specialtyId: specialty.id, tagId: tag.id } },
        update: {},
        create: { specialtyId: specialty.id, tagId: tag.id },
      })
      crossed++
    }
  }
  console.log(`✅ ${crossed} cruces especialidad ↔ tag`)
}
