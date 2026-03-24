import { PrismaClient, ArticleStatus, ArticleType } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function img(seed: string) {
  return `https://picsum.photos/seed/${seed}/800/450`
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL ?? 'admin@reportemedico.com'

  if (!adminPassword) {
    console.error('\n❌ ERROR: La variable ADMIN_INITIAL_PASSWORD no está definida.')
    process.exit(1)
  }
  if (adminPassword.length < 12) {
    console.error('\n❌ ERROR: ADMIN_INITIAL_PASSWORD debe tener al menos 12 caracteres.')
    process.exit(1)
  }

  console.log('🌱 Iniciando seed...\n')

  // ─── Tags ────────────────────────────────────────────────────────────────────

  const tagData = [
    { name: 'Cardiología',            slug: 'cardiologia' },
    { name: 'Oncología',              slug: 'oncologia' },
    { name: 'Neurología',             slug: 'neurologia' },
    { name: 'Pediatría',              slug: 'pediatria' },
    { name: 'Dermatología',           slug: 'dermatologia' },
    { name: 'Ginecología',            slug: 'ginecologia' },
    { name: 'Nutrición',              slug: 'nutricion' },
    { name: 'Salud Pública',          slug: 'salud-publica' },
    { name: 'Investigación Clínica',  slug: 'investigacion-clinica' },
    { name: 'Tecnología Médica',      slug: 'tecnologia-medica' },
    { name: 'Cirugía',                slug: 'cirugia' },
    { name: 'Diabetes',               slug: 'diabetes' },
    { name: 'Gastroenterología',      slug: 'gastroenterologia' },
    { name: 'Psiquiatría',            slug: 'psiquiatria' },
    { name: 'Traumatología',          slug: 'traumatologia' },
    { name: 'Dengue',                 slug: 'dengue' },
    { name: 'Vacunación',             slug: 'vacunacion' },
    { name: 'Hipertensión',           slug: 'hipertension' },
    { name: 'Salud Mental',           slug: 'salud-mental' },
    { name: 'Infectología',           slug: 'infectologia' },
  ]

  const createdTags: Record<string, string> = {}
  for (const tag of tagData) {
    const t = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    })
    createdTags[tag.slug] = t.id
  }
  console.log(`✅ ${tagData.length} tags creados/verificados`)

  // ─── Admin ───────────────────────────────────────────────────────────────────

  const hashedPassword = await bcrypt.hash(adminPassword, 12)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      name: 'Administrador',
    },
  })
  console.log(`✅ Admin creado: ${admin.email}`)

  // ─── Ad Slots ────────────────────────────────────────────────────────────────

  const adSlots = [
    { name: 'banner_home_1', description: 'Home — después del Hero' },
    { name: 'banner_home_2', description: 'Home — después de Noticias Destacadas' },
    { name: 'banner_home_3', description: 'Home — después de Actualidad' },
    { name: 'banner_home_4', description: 'Home — después de Artículos Médicos' },
    { name: 'banner_home_5', description: 'Home — después del Podcast' },
  ]
  for (const slot of adSlots) {
    await prisma.adSlot.upsert({
      where: { name: slot.name },
      update: {},
      create: { ...slot, isActive: true },
    })
  }
  console.log(`✅ ${adSlots.length} slots publicitarios creados/verificados`)

  // ─── Artículos ───────────────────────────────────────────────────────────────

  type ArticleSeed = {
    type: ArticleType
    title: string
    slug: string
    excerpt: string
    content: string
    featuredImage: string
    authorName: string
    status: ArticleStatus
    relevance: number | null
    publishedAt: Date | null
    tags: string[]
    sources?: { title: string; url?: string; order: number }[]
    suggestedSpecialties?: string[]
  }

  const articles: ArticleSeed[] = [

    // ── RELEVANCIA 1 — Hero ────────────────────────────────────────────────────
    {
      type: ArticleType.NEWS,
      title: 'MISPAS lanza campaña nacional de vacunación contra el dengue en toda República Dominicana',
      slug: 'mispas-lanza-campana-nacional-vacunacion-dengue-republica-dominicana',
      excerpt: 'El Ministerio de Salud Pública inicia la distribución gratuita de la vacuna Dengvaxia en los centros de salud del país, priorizando las zonas de mayor riesgo epidemiológico.',
      content: `<p>El Ministerio de Salud Pública y Asistencia Social (MISPAS) anunció este martes el inicio de la <strong>Campaña Nacional de Vacunación contra el Dengue</strong>, la más grande en la historia del país con una inversión de más de 500 millones de pesos dominicanos.</p>
<p>El ministro de Salud, Dr. Víctor Atallah, encabezó el acto de lanzamiento en el Centro de los Héroes de Santo Domingo, acompañado de autoridades locales y representantes de la Organización Panamericana de la Salud (OPS).</p>
<h2>Zonas prioritarias</h2>
<p>La campaña inicia en las provincias con mayor índice de casos registrados en los últimos seis meses: <strong>Santo Domingo, Santiago, La Vega, San Pedro de Macorís y La Romana</strong>. Se estima llegar a más de 2.5 millones de dominicanos en la primera fase.</p>
<p>La vacuna Dengvaxia, aprobada por la OMS, estará disponible de forma gratuita en todos los hospitales públicos, centros de atención primaria y unidades móviles desplegadas en los barrios de mayor vulnerabilidad.</p>
<blockquote><p>"Este es un hito histórico para la salud pública dominicana. No descansaremos hasta erradicar el dengue de nuestra nación." — Dr. Víctor Atallah, Ministro de Salud</p></blockquote>
<h2>Requisitos para la vacuna</h2>
<p>Podrán vacunarse ciudadanos entre 9 y 45 años que hayan tenido dengue previamente, confirmado por prueba serológica. El MISPAS habilitó una línea gratuita, el <strong>*462</strong>, para orientar a la ciudadanía.</p>`,
      featuredImage: img('dengue-vacuna'),
      authorName: 'Redacción Reporte Médico',
      status: ArticleStatus.PUBLISHED,
      relevance: 1,
      publishedAt: daysAgo(1),
      tags: ['dengue', 'vacunacion', 'salud-publica'],
      sources: [
        { title: 'MISPAS — Comunicado oficial', url: 'https://mispas.gob.do', order: 1 },
        { title: 'OPS — Dengue en las Américas', order: 2 },
      ],
    },

    // ── RELEVANCIA 2 — Lead ───────────────────────────────────────────────────
    {
      type: ArticleType.NEWS,
      title: 'Alerta epidemiológica: casos de dengue hemorrágico aumentan un 40% en el Gran Santo Domingo',
      slug: 'alerta-epidemiologica-casos-dengue-hemorragico-aumentan-gran-santo-domingo',
      excerpt: 'Las autoridades de salud reportan un incremento preocupante en los casos graves de dengue. Los hospitales del Distrito Nacional y Santo Domingo Este registran mayor presión en sus áreas de emergencia.',
      content: `<p>Las autoridades sanitarias emitieron una <strong>alerta epidemiológica de nivel naranja</strong> para el Gran Santo Domingo tras registrarse un aumento del 40% en los casos de dengue hemorrágico durante las últimas cuatro semanas, en comparación con el mismo período del año anterior.</p>
<p>Según el boletín epidemiológico del MISPAS, se han confirmado 1,247 casos de dengue en lo que va del mes, de los cuales 89 corresponden a la variante hemorrágica, que puede ser mortal si no se trata a tiempo.</p>
<h2>Síntomas de alarma</h2>
<p>El doctor Miguel Solano, epidemiólogo del Hospital Luis Eduardo Aybar, instó a la población a acudir de inmediato a urgencias si presentan: <strong>fiebre alta por más de 3 días, dolor abdominal intenso, vómitos frecuentes, sangrado en encías o nariz, y manchas rojas en la piel</strong>.</p>
<p>"El dengue hemorrágico es tratable si se detecta a tiempo. El gran error es esperar", advirtió el especialista.</p>
<h2>Fumigación intensificada</h2>
<p>El Ministerio de Medio Ambiente y el MISPAS coordinan jornadas de fumigación en los municipios de más alto riesgo: Los Alcarrizos, Pedro Brand, Santo Domingo Oeste y Villa Mella.</p>`,
      featuredImage: img('dengue-mosquito'),
      authorName: 'Mariela Sánchez',
      status: ArticleStatus.PUBLISHED,
      relevance: 2,
      publishedAt: daysAgo(2),
      tags: ['dengue', 'salud-publica', 'infectologia'],
    },

    // ── RELEVANCIA 3 — Big Destacada (2) ─────────────────────────────────────
    {
      type: ArticleType.NEWS,
      title: 'Inauguran moderno hospital oncológico en Santiago con capacidad para 300 camas',
      slug: 'inauguran-moderno-hospital-oncologico-santiago-capacidad-300-camas',
      excerpt: 'El presidente de la República encabezó la inauguración del Hospital Nacional del Cáncer Dr. Luis Camilo Molina, considerado el más avanzado del Caribe en tratamientos oncológicos.',
      content: `<p>Con una inversión de más de 4,000 millones de pesos dominicanos, fue inaugurado este miércoles el <strong>Hospital Nacional del Cáncer Dr. Luis Camilo Molina</strong> en la ciudad de Santiago de los Caballeros, una obra que se consolida como el centro oncológico más avanzado del Caribe.</p>
<p>El nuevo hospital cuenta con <strong>300 camas de hospitalización</strong>, unidades de quimioterapia ambulatoria con 60 sillones, dos aceleradores lineales para radioterapia de última generación, laboratorio de biología molecular y un banco de medicamentos oncológicos subsidiados.</p>
<h2>Un sueño hecho realidad</h2>
<p>"Durante décadas, los pacientes dominicanos con cáncer debían viajar al exterior para acceder a tratamientos de alta complejidad. Hoy eso cambia para siempre", declaró el Director General de Hospitales.</p>
<p>La institución atenderá tanto pacientes del Seguro Nacional de Salud (SeNaSa) como del seguro contributivo, garantizando acceso universal a todos los dominicanos diagnosticados con cáncer.</p>`,
      featuredImage: img('hospital-santiago'),
      authorName: 'Carlos Medina',
      status: ArticleStatus.PUBLISHED,
      relevance: 3,
      publishedAt: daysAgo(3),
      tags: ['oncologia', 'salud-publica'],
    },
    {
      type: ArticleType.MEDICAL_ARTICLE,
      title: 'Manejo actualizado de la hipertensión arterial resistente: guía para el médico dominicano',
      slug: 'manejo-actualizado-hipertension-arterial-resistente-guia-medico-dominicano',
      excerpt: 'Revisamos los criterios diagnósticos, el abordaje farmacológico de cuarta línea y las opciones intervencionistas disponibles en el país para pacientes con hipertensión refractaria al tratamiento convencional.',
      content: `<p>La hipertensión arterial resistente (HAR) se define como aquella que persiste por encima del objetivo terapéutico a pesar del uso de <strong>tres o más antihipertensivos a dosis óptimas</strong>, incluyendo un diurético. Afecta entre el 10 y el 15% de la población hipertensa dominicana, según datos del Centro Nacional de Epidemiología.</p>
<h2>Primer paso: descartar pseudo-resistencia</h2>
<p>Antes de clasificar un paciente como HAR, es fundamental descartar causas de pseudo-resistencia: mala adherencia terapéutica, técnica incorrecta de medición, efecto de bata blanca, interacciones medicamentosas (AINEs, corticosteroides, anticonceptivos orales) y apnea obstructiva del sueño no tratada.</p>
<h2>Abordaje farmacológico</h2>
<p>La evidencia actual respalda la adición de <strong>espironolactona 25-50 mg/día</strong> como cuarta droga en la mayoría de los pacientes con HAR, dado el papel del hiperaldosteronismo primario como causa subyacente frecuente. Si no se tolera, pueden usarse amiloride o eplerenona.</p>
<p>La denervación renal por catéter (renal denervation) es una alternativa intervencionista con evidencia creciente, disponible en el Centro Cardiovascular del Caribe.</p>
<h2>Seguimiento</h2>
<p>Se recomienda monitoreo ambulatorio de presión arterial (MAPA de 24 horas) cada 6 meses y perfil metabólico completo para vigilar el potasio en pacientes con antagonistas de aldosterona.</p>`,
      featuredImage: img('hipertension-medico'),
      authorName: 'Dr. Rafael Acosta Peña',
      status: ArticleStatus.PUBLISHED,
      relevance: 3,
      publishedAt: daysAgo(5),
      tags: ['cardiologia', 'hipertension', 'investigacion-clinica'],
      sources: [
        { title: 'ESH/ESC Guidelines 2023 — Hypertension', order: 1 },
        { title: 'AHA/ACC — Resistant Hypertension 2024', order: 2 },
      ],
    },

    // ── RELEVANCIA 4 — Small Destacada (8) ───────────────────────────────────
    {
      type: ArticleType.NEWS,
      title: 'SeNaSa amplía cobertura de medicamentos para diabéticos a partir del próximo mes',
      slug: 'senasa-amplia-cobertura-medicamentos-diabeticos-proximo-mes',
      excerpt: 'El seguro público incorpora insulina análoga, metformina de liberación prolongada y tres nuevos hipoglucemiantes a su formulario básico, beneficiando a más de 400,000 afiliados.',
      content: `<p>El Seguro Nacional de Salud (SeNaSa) anunció la <strong>ampliación de su formulario de medicamentos para diabetes</strong> a partir del próximo mes, en un esfuerzo por mejorar el control glucémico de sus más de 400,000 afiliados con esta condición.</p>
<p>Entre los nuevos fármacos incorporados destacan: <strong>insulina glargina U-100, metformina XR 1000mg, empagliflozina 10mg y semaglutida oral 7mg</strong>. Estos medicamentos, previamente disponibles solo en el mercado privado a elevados costos, estarán cubiertos al 80% para afiliados con diagnóstico confirmado.</p>
<p>El director de SeNaSa, Dr. Mario Lama, señaló que esta medida responde al alarmante aumento de la diabetes en el país: "República Dominicana tiene una prevalencia del 13.5% en adultos, una de las más altas del Caribe."</p>`,
      featuredImage: img('diabetes-medicamento'),
      authorName: 'Paola Jiménez',
      status: ArticleStatus.PUBLISHED,
      relevance: 4,
      publishedAt: daysAgo(4),
      tags: ['diabetes', 'salud-publica'],
    },
    {
      type: ArticleType.NEWS,
      title: 'República Dominicana reduce mortalidad materna en un 22% en los últimos tres años',
      slug: 'republica-dominicana-reduce-mortalidad-materna-22-porciento-tres-anos',
      excerpt: 'Los datos del MISPAS muestran una caída sostenida gracias al programa de atención prenatal reforzada y la capacitación de más de 2,000 parteras y enfermeras obstétricas.',
      content: `<p>República Dominicana registró una reducción del <strong>22% en la tasa de mortalidad materna</strong> durante el período 2022-2024, según el último informe del MISPAS presentado ante la Organización Panamericana de la Salud.</p>
<p>La tasa pasó de 95 muertes por cada 100,000 nacidos vivos en 2022 a 74 en 2024, acercándose a la meta de los Objetivos de Desarrollo Sostenible de 70 por 100,000 para 2030.</p>
<p>El director de Salud Materno-Infantil atribuye el logro a tres factores clave: el fortalecimiento de los controles prenatales, la capacitación masiva del personal obstétrico en provincias rurales y la disponibilidad de sulfato de magnesio para prevenir eclampsia en todos los hospitales públicos.</p>`,
      featuredImage: img('maternidad-rd'),
      authorName: 'Sandra Pérez',
      status: ArticleStatus.PUBLISHED,
      relevance: 4,
      publishedAt: daysAgo(6),
      tags: ['ginecologia', 'salud-publica'],
    },
    {
      type: ArticleType.NEWS,
      title: 'Inician consultas gratuitas de salud mental en 15 provincias del país',
      slug: 'inician-consultas-gratuitas-salud-mental-15-provincias-pais',
      excerpt: 'El programa nacional de salud mental comunitaria del MISPAS despliega equipos multidisciplinarios para atender a poblaciones vulnerables que no tienen acceso a psiquiatras o psicólogos privados.',
      content: `<p>El Ministerio de Salud lanzó el programa <strong>"Mente Sana RD"</strong>, que pone a disposición de la ciudadanía equipos de salud mental compuestos por psiquiatras, psicólogos y trabajadores sociales en 15 provincias de todo el país.</p>
<p>Las consultas son completamente gratuitas y se realizan en los Centros de Atención Primaria (UNAP) de cada municipio. No se requiere referimiento; los ciudadanos pueden acudir directamente de lunes a viernes de 8am a 4pm.</p>
<p>El programa prioriza la atención de personas con trastornos depresivos, ansiedad crónica, adicciones y secuelas de violencia doméstica. En una primera fase se atenderán las provincias de mayor pobreza y menor acceso a servicios especializados.</p>`,
      featuredImage: img('salud-mental-rd'),
      authorName: 'Luis Taveras',
      status: ArticleStatus.PUBLISHED,
      relevance: 4,
      publishedAt: daysAgo(7),
      tags: ['salud-mental', 'psiquiatria', 'salud-publica'],
    },
    {
      type: ArticleType.NEWS,
      title: 'Telemedicina: el MISPAS registra más de 500,000 consultas virtuales en 2024',
      slug: 'telemedicina-mispas-registra-500000-consultas-virtuales-2024',
      excerpt: 'La plataforma de salud digital del gobierno superó todas las proyecciones con medio millón de atenciones remotas, especialmente en áreas rurales donde la escasez de médicos era crítica.',
      content: `<p>La plataforma de telemedicina del Ministerio de Salud superó la barrera de las <strong>500,000 consultas virtuales</strong> en 2024, convirtiéndose en la iniciativa de salud digital más exitosa de la historia dominicana.</p>
<p>El sistema, disponible desde la aplicación móvil <em>SaludRD</em> y la web, permite a cualquier ciudadano con una cédula dominicana acceder a una consulta médica en menos de 30 minutos, sin importar su ubicación.</p>
<p>Las provincias con mayor uso fueron Pedernales, Elías Piña y Independencia —zonas históricamente desatendidas— donde la telemedicina redujo en un 35% los traslados de emergencia a hospitales provinciales.</p>`,
      featuredImage: img('telemedicina-rd'),
      authorName: 'Ana García',
      status: ArticleStatus.PUBLISHED,
      relevance: 4,
      publishedAt: daysAgo(8),
      tags: ['tecnologia-medica', 'salud-publica'],
    },
    {
      type: ArticleType.NEWS,
      title: 'Cirujanos dominicanos realizan el primer trasplante de corazón del Caribe en el IDSS',
      slug: 'cirujanos-dominicanos-primer-trasplante-corazon-caribe-idss',
      excerpt: 'Un equipo de 12 especialistas del Instituto Dominicano de Seguros Sociales completó con éxito la primera cirugía de trasplante cardíaco realizada en el Caribe insular.',
      content: `<p>Un hito en la historia de la medicina dominicana: un equipo de doce especialistas del <strong>Instituto Dominicano de Seguros Sociales (IDSS)</strong> realizó con éxito el primer trasplante de corazón del Caribe insular, en una intervención de 11 horas que culminó de madrugada.</p>
<p>El receptor es un hombre de 48 años de la provincia de La Vega, diagnosticado con miocardiopatía dilatada en estadio terminal. Tras la cirugía evoluciona favorablemente y fue extubado a las 36 horas del procedimiento.</p>
<p>"Este logro demuestra que la medicina dominicana está al nivel mundial. No necesitamos enviar más a nuestros pacientes al exterior para este tipo de intervenciones", afirmó el Dr. Héctor Bautista, cardiólogo intervencionista del IDSS.</p>`,
      featuredImage: img('trasplante-corazon'),
      authorName: 'Redacción Reporte Médico',
      status: ArticleStatus.PUBLISHED,
      relevance: 4,
      publishedAt: daysAgo(9),
      tags: ['cirugia', 'cardiologia'],
    },
    {
      type: ArticleType.NEWS,
      title: 'Jornada de donación de sangre moviliza a 8,000 voluntarios en todo el país',
      slug: 'jornada-donacion-sangre-moviliza-8000-voluntarios-pais',
      excerpt: 'El Banco Nacional de Sangre reporta que las reservas alcanzaron el 85% de la capacidad gracias a la respuesta masiva durante la Semana Nacional del Donante.',
      content: `<p>La <strong>Semana Nacional del Donante de Sangre</strong> convocó a más de 8,000 voluntarios en todo el territorio nacional, en la jornada más exitosa organizada por el Banco Nacional de Sangre desde su fundación.</p>
<p>Las colectas se realizaron en 148 puntos habilitados: hospitales, centros comerciales, universidades y plazas públicas. El tipo O negativo, el más escaso y de mayor demanda para transfusiones de emergencia, alcanzó reservas para 15 días.</p>
<p>El director del banco, Dr. Francisco Ramos, recordó que cada donación puede salvar hasta tres vidas: "Un solo donante puede proveer glóbulos rojos, plaquetas y plasma a tres pacientes diferentes."</p>`,
      featuredImage: img('donacion-sangre'),
      authorName: 'María Rodríguez',
      status: ArticleStatus.PUBLISHED,
      relevance: 4,
      publishedAt: daysAgo(10),
      tags: ['salud-publica'],
    },
    {
      type: ArticleType.NEWS,
      title: 'UASD gradúa primera promoción de especialistas en medicina de urgencias del país',
      slug: 'uasd-gradua-primera-promocion-especialistas-medicina-urgencias-pais',
      excerpt: 'Veinte médicos completan el primer programa de especialización en medicina de emergencias acreditado en República Dominicana, cerrando una brecha histórica en el sistema de salud.',
      content: `<p>La Universidad Autónoma de Santo Domingo (UASD) graduó este jueves la primera promoción de especialistas en <strong>Medicina de Urgencias y Emergencias</strong> de la historia dominicana, un hito que cierra una brecha histórica en el sistema sanitario del país.</p>
<p>Los veinte nuevos especialistas completaron un programa de tres años que incluyó rotaciones en los principales centros de emergencia del país, así como pasantías internacionales en hospitales de España y Colombia.</p>
<p>"Hasta hoy, los departamentos de emergencia eran atendidos por médicos generales o especialistas de otras áreas rotando por necesidad. Ahora tenemos profesionales formados específicamente para el área más crítica de los hospitales", dijo el decano de la Facultad de Medicina.</p>`,
      featuredImage: img('medicina-urgencias'),
      authorName: 'Jorge Santos',
      status: ArticleStatus.PUBLISHED,
      relevance: 4,
      publishedAt: daysAgo(11),
      tags: ['salud-publica', 'investigacion-clinica'],
    },

    // ── RELEVANCIA 5 — Actualidad (12) ────────────────────────────────────────
    {
      type: ArticleType.NEWS,
      title: 'Ola de calor eleva riesgo de golpes de calor: recomendaciones del MISPAS',
      slug: 'ola-calor-eleva-riesgo-golpes-calor-recomendaciones-mispas',
      excerpt: 'Las temperaturas superiores a 38°C registradas en varias provincias generan preocupación por el aumento de casos de hipertermia, especialmente en adultos mayores y niños.',
      content: `<p>El MISPAS emitió una alerta preventiva ante la ola de calor que afecta a diez provincias del país con temperaturas superiores a los 38 grados centígrados. Los hospitales del Cibao y el Este reportan un incremento del 25% en consultas por deshidratación y golpe de calor en los últimos cinco días.</p>
<p><strong>Recomendaciones:</strong> beber al menos dos litros de agua diarios aunque no sienta sed, evitar exposición solar entre 11am y 3pm, usar ropa ligera y de colores claros, y buscar espacios frescos si siente mareo, debilidad o confusión.</p>`,
      featuredImage: img('calor-salud'),
      authorName: 'Redacción Reporte Médico',
      status: ArticleStatus.PUBLISHED,
      relevance: 5,
      publishedAt: daysAgo(3),
      tags: ['salud-publica'],
    },
    {
      type: ArticleType.NEWS,
      title: 'Nueva clínica pediátrica privada abre sus puertas en Punta Cana',
      slug: 'nueva-clinica-pediatrica-privada-abre-puertas-punta-cana',
      excerpt: 'La Clínica Infantil del Este, con inversión de capital mixto dominicano y español, ofrecerá atención especializada a los más de 80,000 niños que residen en la zona turística del este.',
      content: `<p>La <strong>Clínica Infantil del Este</strong> abrió sus puertas en Bávaro con una capacidad inicial de 50 camas pediátricas, UCI neonatal y consultas especializadas en cardiología, neurología y oncología infantil.</p>
<p>La iniciativa surge ante la escasez de servicios pediátricos especializados en la zona turística, donde la población infantil creció un 40% en los últimos diez años. La clínica acepta SeNaSa, ARS privadas y pago directo.</p>`,
      featuredImage: img('clinica-pediatrica'),
      authorName: 'Pedro Álvarez',
      status: ArticleStatus.PUBLISHED,
      relevance: 5,
      publishedAt: daysAgo(4),
      tags: ['pediatria'],
    },
    {
      type: ArticleType.NEWS,
      title: 'Campaña antitabaco reforzada incluirá advertencias gráficas en todos los cigarrillos',
      slug: 'campana-antitabaco-reforzada-incluira-advertencias-graficas-cigarrillos',
      excerpt: 'El Congreso aprobó el proyecto de ley que obliga a las tabacaleras a cubrir el 85% del empaque con imágenes de consecuencias del tabaquismo, siguiendo estándares de la OMS.',
      content: `<p>El Congreso Nacional aprobó la reforma a la Ley General de Salud que obliga a todos los fabricantes y distribuidores de cigarrillos en República Dominicana a incluir <strong>advertencias gráficas en el 85% del empaque</strong>, cubriendo frente y reverso con imágenes de las consecuencias del tabaquismo.</p>
<p>República Dominicana sigue así los pasos de más de 100 países que ya implementaron esta medida, avalada por la Organización Mundial de la Salud como la más efectiva para reducir el consumo de tabaco, especialmente entre los jóvenes.</p>`,
      featuredImage: img('antitabaco-ley'),
      authorName: 'Lisette Matos',
      status: ArticleStatus.PUBLISHED,
      relevance: 5,
      publishedAt: daysAgo(5),
      tags: ['salud-publica'],
    },
    {
      type: ArticleType.NEWS,
      title: 'Programa de nutrición escolar llega a 1.2 millones de estudiantes en escuelas públicas',
      slug: 'programa-nutricion-escolar-llega-1-2-millones-estudiantes-escuelas-publicas',
      excerpt: 'El MINERD y el MISPAS presentaron los resultados del primer año del programa de alimentación escolar reforzada, que redujo la anemia infantil en un 18% en las escuelas participantes.',
      content: `<p>El programa <strong>"Escuela Saludable"</strong>, ejecutado conjuntamente por el Ministerio de Educación y el MISPAS, alcanzó a 1.2 millones de estudiantes de escuelas públicas durante su primer año de implementación.</p>
<p>El esquema incluye desayuno y almuerzo balanceados, con énfasis en proteínas, hierro y vitaminas para combatir la anemia y la desnutrición crónica. Las evaluaciones nutricionales realizadas a 150,000 estudiantes mostraron una reducción del 18% en prevalencia de anemia.</p>`,
      featuredImage: img('nutricion-escolar'),
      authorName: 'Carmen Núñez',
      status: ArticleStatus.PUBLISHED,
      relevance: 5,
      publishedAt: daysAgo(6),
      tags: ['nutricion', 'pediatria', 'salud-publica'],
    },
    {
      type: ArticleType.NEWS,
      title: 'Feria de salud gratuita atiende a más de 3,000 personas en Los Alcarrizos',
      slug: 'feria-salud-gratuita-atiende-3000-personas-los-alcarrizos',
      excerpt: 'Médicos voluntarios ofrecieron consultas de medicina general, odontología, ginecología y oftalmología en la feria comunitaria organizada por el ayuntamiento y la Liga Municipal.',
      content: `<p>Más de <strong>3,000 residentes de Los Alcarrizos</strong> fueron atendidos durante la feria de salud comunitaria realizada este fin de semana en el parque municipal, con la participación de 85 médicos y enfermeras voluntarios.</p>
<p>Se ofrecieron servicios de medicina general, odontología (incluyendo extracciones y limpiezas), ginecología, oftalmología con entrega de espejuelos y laboratorio con exámenes básicos gratuitos. Además se aplicaron más de 800 dosis de vacunas de refuerzo.</p>`,
      featuredImage: img('feria-salud'),
      authorName: 'Redacción Reporte Médico',
      status: ArticleStatus.PUBLISHED,
      relevance: 5,
      publishedAt: daysAgo(7),
      tags: ['salud-publica'],
    },
    {
      type: ArticleType.NEWS,
      title: 'Dermatólogos alertan sobre aumento de melanoma en población dominicana',
      slug: 'dermatologos-alertan-aumento-melanoma-poblacion-dominicana',
      excerpt: 'La Sociedad Dominicana de Dermatología reporta un incremento del 30% en los diagnósticos de melanoma en los últimos cinco años, relacionado con mayor exposición solar sin protección.',
      content: `<p>La <strong>Sociedad Dominicana de Dermatología</strong> publicó un informe que evidencia un aumento del 30% en los diagnósticos de melanoma durante los últimos cinco años en el país, un tipo de cáncer de piel que puede ser mortal si no se detecta temprano.</p>
<p>El presidente de la sociedad, Dr. Andrés Féliz, atribuyó el incremento a la mayor exposición solar sin fotoprotección adecuada: "Los dominicanos pasamos mucho tiempo al sol y muy pocos usamos bloqueador solar con SPF mayor de 30."</p>
<p>Se recomienda revisión dermatológica anual y aplicar protector solar SPF 50+ todos los días, no solo en la playa.</p>`,
      featuredImage: img('melanoma-piel'),
      authorName: 'Dra. Yolanda Cruz',
      status: ArticleStatus.PUBLISHED,
      relevance: 5,
      publishedAt: daysAgo(8),
      tags: ['dermatologia', 'oncologia'],
    },
    {
      type: ArticleType.NEWS,
      title: 'Investigadores dominicanos identifican variante local de resistencia a antibióticos',
      slug: 'investigadores-dominicanos-identifican-variante-local-resistencia-antibioticos',
      excerpt: 'Un equipo del INTEC y el MISPAS publicó en la revista Lancet Infectious Diseases el hallazgo de una cepa de E. coli con resistencia extendida, relacionada con el uso excesivo de antibióticos sin prescripción.',
      content: `<p>Investigadores de la <strong>Universidad Intec</strong> en colaboración con el MISPAS identificaron y caracterizaron genéticamente una variante local de <em>Escherichia coli</em> con resistencia a antibióticos de última línea, incluyendo carbapenémicos.</p>
<p>El hallazgo, publicado en <em>Lancet Infectious Diseases</em>, alerta sobre la crisis de resistencia antimicrobiana en el país, agravada por la venta libre de antibióticos sin receta. Hasta el 65% de las farmacias del país dispensan antibióticos sin prescripción médica, según el estudio.</p>`,
      featuredImage: img('antibioticos-resistencia'),
      authorName: 'Dr. Manuel Estévez',
      status: ArticleStatus.PUBLISHED,
      relevance: 5,
      publishedAt: daysAgo(10),
      tags: ['infectologia', 'investigacion-clinica', 'salud-publica'],
    },
    {
      type: ArticleType.NEWS,
      title: 'RD se une al programa mundial de eliminación de la malaria para 2030',
      slug: 'rd-une-programa-mundial-eliminacion-malaria-2030',
      excerpt: 'El país firmó el compromiso ante la OPS de alcanzar cero casos autóctonos de malaria en 2030, en línea con la Estrategia Técnica Mundial contra la Malaria de la OMS.',
      content: `<p>República Dominicana firmó el compromiso ante la Organización Panamericana de la Salud de alcanzar la <strong>eliminación de la malaria como problema de salud pública para 2030</strong>, uniéndose a una iniciativa que ya incluye a 25 países de la región.</p>
<p>El país reportó solo 41 casos autóctonos en 2024, una reducción dramática desde los más de 2,000 casos anuales registrados en la década de 2000, gracias al programa de fumigación, diagnóstico rápido y tratamiento gratuito.</p>`,
      featuredImage: img('malaria-mosquito'),
      authorName: 'Redacción Reporte Médico',
      status: ArticleStatus.PUBLISHED,
      relevance: 5,
      publishedAt: daysAgo(12),
      tags: ['infectologia', 'salud-publica'],
    },
    {
      type: ArticleType.NEWS,
      title: 'Gobierno destinará 500 millones al fortalecimiento de la red de hospitales rurales',
      slug: 'gobierno-destinara-500-millones-fortalecimiento-red-hospitales-rurales',
      excerpt: 'El presupuesto complementario aprobado en el Congreso incluye fondos para equipar 35 hospitales provinciales con equipos de diagnóstico por imagen y ampliar la disponibilidad de especialistas.',
      content: `<p>El Gobierno dominicano destinará <strong>500 millones de pesos</strong> al fortalecimiento de la red de hospitales rurales, según el presupuesto complementario aprobado por el Congreso Nacional la semana pasada.</p>
<p>Los fondos se distribuirán entre 35 hospitales provinciales que recibirán equipos de ultrasonido, mamógrafos digitales, electrocardiógrafos y laboratorios de diagnóstico básico. Además, se financiarán contratos de médicos especialistas para rotar mensualmente por estas instalaciones.</p>`,
      featuredImage: img('hospitales-rurales'),
      authorName: 'Santiago Vargas',
      status: ArticleStatus.PUBLISHED,
      relevance: 5,
      publishedAt: daysAgo(13),
      tags: ['salud-publica'],
    },
    {
      type: ArticleType.NEWS,
      title: 'Aumentan los casos de ansiedad y depresión post-pandemia en jóvenes de 18 a 29 años',
      slug: 'aumentan-casos-ansiedad-depresion-post-pandemia-jovenes-18-29-anos',
      excerpt: 'Psiquiatras advierten que uno de cada cuatro jóvenes dominicanos presenta síntomas clínicamente significativos de ansiedad o depresión, impulsados por el aislamiento y la incertidumbre económica.',
      content: `<p>Una encuesta nacional realizada por la Sociedad Dominicana de Psiquiatría revela que el <strong>26% de los jóvenes entre 18 y 29 años</strong> presenta síntomas de ansiedad o depresión que requieren atención profesional, el nivel más alto registrado en la historia del país.</p>
<p>Los factores más citados por los encuestados son el estrés económico, la incertidumbre laboral, el uso excesivo de redes sociales y las secuelas psicológicas de los confinamientos durante la pandemia de COVID-19.</p>
<p>"El estigma es la principal barrera para buscar ayuda. Necesitamos normalizar la consulta con el psicólogo como lo hacemos con el médico", afirmó la presidenta de la Sociedad de Psiquiatría.</p>`,
      featuredImage: img('ansiedad-jovenes'),
      authorName: 'Isabel Hernández',
      status: ArticleStatus.PUBLISHED,
      relevance: 5,
      publishedAt: daysAgo(14),
      tags: ['salud-mental', 'psiquiatria'],
    },
    {
      type: ArticleType.NEWS,
      title: 'Plan piloto de medicina escolar capacita a 500 maestros para detectar problemas de salud',
      slug: 'plan-piloto-medicina-escolar-capacita-500-maestros-detectar-problemas-salud',
      excerpt: 'El programa forma a docentes de escuelas públicas para identificar señales de alarma en problemas visuales, auditivos, nutricionales y de salud mental en sus estudiantes.',
      content: `<p>El MISPAS y el MINERD lanzaron un programa piloto en 50 escuelas públicas del Distrito Nacional que capacita a <strong>500 maestros como primeros detectores de problemas de salud</strong> en sus estudiantes.</p>
<p>El entrenamiento de 40 horas cubre detección de problemas visuales, auditivos, nutricionales, signos de maltrato y síntomas de trastornos de aprendizaje asociados a condiciones médicas. Los maestros certificados contarán con un protocolo de referimiento a los servicios de salud escolar.</p>`,
      featuredImage: img('medicina-escolar'),
      authorName: 'Ana Mejía',
      status: ArticleStatus.PUBLISHED,
      relevance: 5,
      publishedAt: daysAgo(15),
      tags: ['pediatria', 'salud-publica'],
    },
    {
      type: ArticleType.NEWS,
      title: 'Médicos dominicanos en el exterior: un puente de conocimiento que regresa al país',
      slug: 'medicos-dominicanos-exterior-puente-conocimiento-regresa-pais',
      excerpt: 'Un programa de repatriación de talento médico atrae de vuelta a especialistas formados en Estados Unidos, España y Cuba con incentivos de inserción en el sistema público de salud.',
      content: `<p>El programa <strong>"Talento Médico RD"</strong> ha logrado la incorporación de 47 especialistas dominicanos formados en el exterior al sistema público de salud durante su primer año de operación.</p>
<p>Los médicos repatriados incluyen cardiólogos intervencionistas, neurocirujanos, oncólogos y reumatólogos —especialidades con escasez crítica en el país. El programa ofrece equiparación salarial, vivienda subsidiada y un fondo de instalación.</p>`,
      featuredImage: img('medicos-regreso'),
      authorName: 'Redacción Reporte Médico',
      status: ArticleStatus.PUBLISHED,
      relevance: 5,
      publishedAt: daysAgo(16),
      tags: ['salud-publica'],
    },

    // ── MÉDICOS — sin relevancia fija en home ─────────────────────────────────
    {
      type: ArticleType.MEDICAL_ARTICLE,
      title: 'Diabetes tipo 2 en República Dominicana: epidemiología, diagnóstico y nuevos algoritmos de tratamiento',
      slug: 'diabetes-tipo-2-republica-dominicana-epidemiologia-diagnostico-nuevos-algoritmos-tratamiento',
      excerpt: 'Actualización basada en evidencia para el médico clínico dominicano sobre el manejo de la diabetes tipo 2, incluyendo los nuevos agentes hipoglucemiantes con beneficio cardiovascular y renal.',
      content: `<p>República Dominicana presenta una de las tasas de diabetes más elevadas del Caribe, con una prevalencia estimada del <strong>13.5% en adultos mayores de 20 años</strong>, según la última encuesta de factores de riesgo. Esta revisión actualiza los algoritmos de diagnóstico y tratamiento para el contexto clínico local.</p>
<h2>Diagnóstico</h2>
<p>Se mantienen los criterios de la ADA: glucemia en ayunas ≥126 mg/dL, glucemia a las 2h post PTOG ≥200 mg/dL, HbA1c ≥6.5%, o glucemia aleatoria ≥200 mg/dL con síntomas. Es fundamental confirmar con dos determinaciones en ausencia de síntomas.</p>
<h2>Primera línea: más allá de la metformina</h2>
<p>Las guías actuales recomiendan que en pacientes con enfermedad cardiovascular establecida, insuficiencia renal crónica o insuficiencia cardíaca, se prioricen los <strong>inhibidores SGLT-2 (empagliflozina, dapagliflozina)</strong> o los <strong>agonistas GLP-1 (semaglutida, liraglutida)</strong> independientemente del nivel de HbA1c.</p>
<h2>Objetivos glucémicos individualizados</h2>
<p>El objetivo de HbA1c ≤7% aplica para la mayoría de los pacientes. En adultos mayores frágiles, se acepta hasta 8-8.5%. En diabéticos jóvenes recién diagnosticados sin comorbilidades, apuntar a ≤6.5%.</p>`,
      featuredImage: img('diabetes-laboratorio'),
      authorName: 'Dra. Claudia Espinal',
      status: ArticleStatus.PUBLISHED,
      relevance: null,
      publishedAt: daysAgo(3),
      tags: ['diabetes', 'investigacion-clinica'],
      sources: [
        { title: 'ADA Standards of Care in Diabetes 2024', order: 1 },
        { title: 'ENSRYD — Encuesta Nacional de Salud RD', order: 2 },
      ],
    },
    {
      type: ArticleType.MEDICAL_ARTICLE,
      title: 'Tamizaje de cáncer de mama en la mujer dominicana: ¿cuándo, cómo y con qué frecuencia?',
      slug: 'tamizaje-cancer-mama-mujer-dominicana-cuando-como-frecuencia',
      excerpt: 'Guía práctica sobre los programas de tamizaje mamográfico en el contexto dominicano, incluyendo acceso público, indicaciones según riesgo y limitaciones del sistema actual.',
      content: `<p>El cáncer de mama es la neoplasia más frecuente en la mujer dominicana y la primera causa de muerte por cáncer en mujeres. Sin embargo, el diagnóstico sigue realizándose en estadios avanzados en la mayoría de los casos, lo que reduce drásticamente las posibilidades de curación.</p>
<h2>Guías de tamizaje actuales</h2>
<p>Para mujeres de <strong>riesgo promedio</strong>, la Sociedad Dominicana de Oncología recomienda iniciar el tamizaje mamográfico anual a los 40 años. Para mujeres con antecedente familiar de primer grado, iniciar 10 años antes de la edad del diagnóstico en el familiar.</p>
<h2>Acceso en el sistema público</h2>
<p>SeNaSa y el IDSS cubren mamografía bilateral cada dos años a partir de los 40 años para afiliadas. El Hospital de la Mujer Dominicana ofrece mamografías sin costo para mujeres no aseguradas con derivación del primer nivel.</p>
<h2>¿Ultrasonido o mamografía?</h2>
<p>El ultrasonido mamario es complementario, no sustituto, de la mamografía. Es especialmente útil en mujeres con mama densa (ACR C o D) y en menores de 30 años con masa palpable.</p>`,
      featuredImage: img('cancer-mama'),
      authorName: 'Dra. Patricia Mella',
      status: ArticleStatus.PUBLISHED,
      relevance: null,
      publishedAt: daysAgo(6),
      tags: ['oncologia', 'ginecologia', 'investigacion-clinica'],
    },
    {
      type: ArticleType.MEDICAL_ARTICLE,
      title: 'Técnicas de cirugía laparoscópica avanzada: experiencia acumulada en 500 colecistectomías en el Hospital Darío Contreras',
      slug: 'tecnicas-cirugia-laparoscopica-avanzada-500-colecistectomias-hospital-dario-contreras',
      excerpt: 'Serie de casos que describe la curva de aprendizaje, complicaciones y resultados de la colecistectomía laparoscópica en el mayor hospital de trauma de República Dominicana.',
      content: `<p>Presentamos los resultados de las primeras <strong>500 colecistectomías laparoscópicas electivas y de urgencia</strong> realizadas en el Servicio de Cirugía General del Hospital Dr. Darío Contreras durante un período de 36 meses.</p>
<h2>Metodología</h2>
<p>Serie de casos prospectiva. Se incluyeron pacientes ASA I-III con diagnóstico de colelitiasis sintomática o colecistitis aguda. Se excluyeron pacientes con sospecha de colangiocarcinoma y cirrosis Child B-C.</p>
<h2>Resultados principales</h2>
<p>Tasa de conversión a cirugía abierta: 3.2% (16/500). Tiempo quirúrgico promedio: 52 minutos. Estancia hospitalaria media: 18 horas. Tasa de complicaciones mayores: 1.4%, incluyendo 3 casos de lesión de vía biliar reconocida intraoperatoriamente. Mortalidad: 0.2% (1 paciente con shock séptico previo).</p>
<h2>Conclusiones</h2>
<p>La colecistectomía laparoscópica es factible y segura en nuestro contexto, con resultados comparables a series internacionales. La curva de aprendizaje se estabilizó alrededor del caso 80 para la mayoría de los residentes.</p>`,
      featuredImage: img('laparoscopica-cirugia'),
      authorName: 'Dr. José Figueroa',
      status: ArticleStatus.PUBLISHED,
      relevance: null,
      publishedAt: daysAgo(9),
      tags: ['cirugia', 'gastroenterologia', 'investigacion-clinica'],
    },
    {
      type: ArticleType.MEDICAL_ARTICLE,
      title: 'Esquema de vacunación del adulto: lo que todo médico general debe saber en 2024',
      slug: 'esquema-vacunacion-adulto-medico-general-debe-saber-2024',
      excerpt: 'Revisión del calendario de vacunación para adultos según el PAI dominicano y las recomendaciones internacionales, con énfasis en las vacunas frecuentemente omitidas en la práctica clínica.',
      content: `<p>La vacunación del adulto es una de las intervenciones preventivas más costo-efectivas disponibles, pero sigue siendo subutilizada en la práctica clínica dominicana. Esta revisión actualiza el esquema recomendado para adultos sanos y con condiciones especiales.</p>
<h2>Vacunas para todos los adultos</h2>
<p><strong>Influenza:</strong> anual, en cualquier trimestre. <strong>Tdap/Td:</strong> refuerzo cada 10 años (Tdap una vez, luego Td). <strong>COVID-19:</strong> dosis de actualización según las recomendaciones vigentes del MISPAS. <strong>Neumococo:</strong> PCV20 en mayores de 65 años o con condiciones de riesgo.</p>
<h2>Vacunas especiales</h2>
<p><strong>VPH:</strong> hasta los 26 años en mujeres y hombres; valorar en 27-45 años. <strong>Hepatitis B:</strong> serie de 3 dosis en adultos no vacunados. <strong>Zóster recombinante (Shingrix):</strong> dos dosis en mayores de 50 años. <strong>Fiebre amarilla:</strong> dosis única para viajeros a zonas endémicas.</p>`,
      featuredImage: img('vacunacion-adulto'),
      authorName: 'Dra. Laura Batista',
      status: ArticleStatus.PUBLISHED,
      relevance: null,
      publishedAt: daysAgo(12),
      tags: ['vacunacion', 'salud-publica', 'investigacion-clinica'],
    },
    {
      type: ArticleType.MEDICAL_ARTICLE,
      title: 'Neurología pediátrica: abordaje del primer episodio convulsivo no febril en niños',
      slug: 'neurologia-pediatrica-abordaje-primer-episodio-convulsivo-no-febril-ninos',
      excerpt: 'Protocolo diagnóstico y terapéutico para el médico de primer contacto ante un niño con primer episodio convulsivo, con criterios de referimiento urgente al neurólogo pediatra.',
      content: `<p>Un primer episodio convulsivo en un niño genera pánico en los padres y frecuentemente lleva a prescripción antiepiléptica innecesaria. Esta guía ayuda al médico general a tomar decisiones basadas en evidencia.</p>
<h2>Evaluación inicial</h2>
<p>Caracterizar el episodio: duración, tipo (focal vs generalizado), pérdida de consciencia, período postictal. Buscar factores precipitantes: hipoglucemia, hiponatremia, traumatismo craneal, exposición a tóxicos.</p>
<h2>¿Cuándo solicitar EEG urgente?</h2>
<p>EEG dentro de las 48 horas si: focalidad neurológica postcrítica, convulsión focal, alteración persistente del estado de consciencia, o sospecha de síndrome epiléptico específico. No es urgente en convulsión generalizada autolimitada con retorno a la normalidad.</p>
<h2>¿Cuándo iniciar antiepilépticos?</h2>
<p>No se recomienda iniciar tratamiento tras el primer episodio no provocado sin diagnóstico etiológico confirmado. La excepción son los síndromes epilépticos con alto riesgo de recurrencia identificados por el neurólogo.</p>`,
      featuredImage: img('neurologia-pediatrica'),
      authorName: 'Dr. Ernesto Polanco',
      status: ArticleStatus.PUBLISHED,
      relevance: null,
      publishedAt: daysAgo(18),
      tags: ['neurologia', 'pediatria'],
    },

    // ── PENDIENTES (artículos de médicos por revisar) ─────────────────────────
    {
      type: ArticleType.MEDICAL_ARTICLE,
      title: 'Dermatitis atópica moderada-grave: nuevas terapias biológicas disponibles en República Dominicana',
      slug: 'dermatitis-atopica-moderada-grave-nuevas-terapias-biologicas-republica-dominicana',
      excerpt: 'Dupilumab y los inhibidores de JAK representan un cambio de paradigma en el tratamiento de la dermatitis atópica. Revisamos su disponibilidad, criterios de indicación y cobertura en el país.',
      content: `<p>La dermatitis atópica moderada-grave afecta significativamente la calidad de vida de los pacientes. La llegada de los biológicos ha revolucionado su manejo en los últimos años.</p>
<h2>Dupilumab</h2>
<p>Anticuerpo monoclonal inhibidor de IL-4 e IL-13. Indicado en mayores de 6 años con DA moderada-grave sin control adecuado con tratamiento tópico convencional. Disponible en farmacia del IDSS y en sector privado a través de programa de acceso expandido.</p>
<h2>Inhibidores de JAK</h2>
<p>Baricitinib y upadacitinib orales disponibles en adultos. Requieren evaluación de riesgo cardiovascular, infeccioso y oncológico antes de iniciar. No usar en pacientes con historial de tromboembolismo.</p>`,
      featuredImage: img('dermatitis-atopica'),
      authorName: 'Dr. Ramón Almonte',
      status: ArticleStatus.PENDING,
      relevance: null,
      publishedAt: null,
      tags: ['dermatologia', 'investigacion-clinica'],
      suggestedSpecialties: ['Inmunología clínica', 'Alergia y Dermatología pediátrica'],
    },
    {
      type: ArticleType.MEDICAL_ARTICLE,
      title: 'Gastritis crónica por H. pylori: diagnóstico no invasivo y protocolos de erradicación actualizados',
      slug: 'gastritis-cronica-h-pylori-diagnostico-no-invasivo-protocolos-erradicacion',
      excerpt: 'El fracaso de la triple terapia clásica supera ya el 30% en República Dominicana. Revisamos las alternativas de primera y segunda línea y el papel del test de susceptibilidad antibiótica.',
      content: `<p>La infección por <em>Helicobacter pylori</em> afecta al 60-70% de la población adulta dominicana. La creciente resistencia a claritromicina y metronidazol obliga a replantear los esquemas de erradicación.</p>
<h2>Diagnóstico no invasivo</h2>
<p>Test de urea en aliento (UBT): gold standard no invasivo, sensibilidad 95%, especificidad 96%. Antígeno en heces: alternativa válida, especialmente para seguimiento post-tratamiento. Serología IgG: no útil para confirmar erradicación.</p>
<h2>Tratamiento de primera línea en RD</h2>
<p>Dado el perfil de resistencia local, se recomienda <strong>terapia cuádruple con bismuto</strong> (omeprazol + bismuto + tetraciclina + metronidazol) por 14 días como opción de inicio en zonas con alta resistencia a claritromicina.</p>`,
      featuredImage: img('gastroenterologia-pylori'),
      authorName: 'Dra. Miriam Tejada',
      status: ArticleStatus.PENDING,
      relevance: null,
      publishedAt: null,
      tags: ['gastroenterologia', 'investigacion-clinica'],
    },

    // ── BORRADORES ────────────────────────────────────────────────────────────
    {
      type: ArticleType.NEWS,
      title: 'El impacto del sedentarismo en la salud cardiovascular de los dominicanos',
      slug: 'impacto-sedentarismo-salud-cardiovascular-dominicanos',
      excerpt: 'Solo el 18% de los adultos dominicanos cumple con las recomendaciones mínimas de actividad física de la OMS, según la última encuesta nacional de estilos de vida.',
      content: `<p>Un estudio del Centro Nacional de Epidemiología revela que apenas el 18% de los adultos dominicanos realiza los 150 minutos semanales de actividad física moderada recomendados por la OMS.</p>
<p>El sedentarismo es el cuarto factor de riesgo de mortalidad global y está directamente asociado con hipertensión, diabetes tipo 2, obesidad y enfermedad cardiovascular. La encuesta identificó que el principal obstáculo citado es "la falta de tiempo" (47%), seguido de "la inseguridad en los espacios públicos" (31%).</p>`,
      featuredImage: img('sedentarismo-rd'),
      authorName: 'Redacción Reporte Médico',
      status: ArticleStatus.DRAFT,
      relevance: null,
      publishedAt: null,
      tags: ['cardiologia', 'salud-publica'],
    },
    {
      type: ArticleType.MEDICAL_ARTICLE,
      title: 'Lecciones de la pandemia de COVID-19 para el sistema de salud dominicano',
      slug: 'lecciones-pandemia-covid-19-sistema-salud-dominicano',
      excerpt: 'Análisis retrospectivo de las fortalezas y debilidades evidenciadas durante la emergencia sanitaria de 2020-2022, y recomendaciones para fortalecer la preparación ante futuras pandemias.',
      content: `<p>Cuatro años después del inicio de la pandemia de COVID-19, es momento de hacer un análisis sereno de lo que el sistema de salud dominicano hizo bien, lo que hizo mal, y las reformas urgentes que la crisis dejó al descubierto.</p>
<h2>Fortalezas</h2>
<p>La respuesta de vacunación fue ejemplar: República Dominicana alcanzó el 70% de cobertura con pauta completa antes que la mayoría de los países de la región. La reconversión hospitalaria fue rápida y el personal de salud demostró una resiliencia admirable.</p>
<h2>Debilidades estructurales</h2>
<p>La pandemia evidenció la insuficiencia de camas de UCI, la falta de equipos de ventilación mecánica, la dependencia de insumos importados y la fragmentación del sistema entre el IDSS, SeNaSa y el sector privado.</p>`,
      featuredImage: img('covid-pandemia-rd'),
      authorName: 'Dr. Alberto Despradel',
      status: ArticleStatus.ARCHIVED,
      relevance: null,
      publishedAt: daysAgo(60),
      tags: ['salud-publica', 'investigacion-clinica'],
    },
  ]

  // ─── Crear artículos ──────────────────────────────────────────────────────────

  let created = 0
  for (const a of articles) {
    const { tags: tagSlugs, suggestedSpecialties, sources, ...fields } = a as any

    const existing = await prisma.article.findUnique({ where: { slug: fields.slug } })
    if (existing) continue

    await prisma.article.create({
      data: {
        ...fields,
        suggestedSpecialties: suggestedSpecialties ?? [],
        tags: {
          create: (tagSlugs as string[])
            .filter((s: string) => createdTags[s])
            .map((s: string) => ({ tagId: createdTags[s] })),
        },
        ...(sources?.length
          ? { sources: { create: sources } }
          : {}),
      },
    })
    created++
  }

  console.log(`✅ ${created} artículos creados`)
  console.log('\n🎉 Seed completado exitosamente.')
  console.log('⚠️  Cambia el password del admin después del primer login.\n')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
