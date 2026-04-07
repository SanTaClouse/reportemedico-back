import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common'
import { Prisma, ArticleType, ArticleStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import slugify from 'slugify'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { SubmitPublicDto } from './dto/submit-public.dto'
import { sanitizeHtml, stripAllHtml } from '../utils/sanitize.util'
import { SubscribersService } from '../subscribers/subscribers.service'

// ─── Constantes editoriales ───────────────────────────────────────────────────

/**
 * Límites editoriales por nivel de relevancia.
 * El nivel 5 ("Actualidad") no cascadea: el home simplemente muestra
 * los 12 más recientes; los que caen fuera del take siguen en nivel 5.
 */
const RELEVANCE_LIMITS: Record<number, number> = {
  1: 1,   // Hero — banner principal
  2: 1,   // Lead — card grande izquierda
  3: 2,   // Big Destacada — 2 cards a la derecha del lead
  4: 8,   // Small Destacada — compactas debajo del featured grid
  5: 12,  // Actualidad — grilla 4×3 debajo del featured
}

@Injectable()
export class ArticlesService implements OnModuleDestroy {
  constructor(
    private prisma: PrismaService,
    private subscribersService: SubscribersService,
  ) {
    // Fix #2 — flush de views cada 30 s
    this.flushTimer = setInterval(() => void this.flushViews(), 30_000)
  }

  // ─── Fix #2: buffer de views en memoria ──────────────────────────────────────
  //
  // Problema original: cada visita = 1 write a la BD.
  // Solución: acumular en un Map y escribir en batch cada 30 s.
  // Trade-off: en restart del servidor se pierden las vistas no flusheadas
  // (aceptable para MVP; usar Redis para producción a escala).

  private viewsBuffer = new Map<string, number>()
  private readonly flushTimer: NodeJS.Timeout

  onModuleDestroy() {
    clearInterval(this.flushTimer)
    void this.flushViews() // flush final antes de apagar
  }

  private async flushViews() {
    if (this.viewsBuffer.size === 0) return
    const entries = [...this.viewsBuffer.entries()]
    this.viewsBuffer.clear()

    await Promise.allSettled(
      entries.map(([slug, count]) =>
        this.prisma.article.updateMany({
          where: { slug },
          data: { viewsCount: { increment: count } },
        }),
      ),
    )
  }

  // ─── PÚBLICO ─────────────────────────────────────────────────────────────────

  async getHome() {
    const include = { tags: { include: { tag: true } } }
    // Los slots editoriales (relevance 1-5) son exclusivos de NEWS.
    // Los MEDICAL_ARTICLE viven en su propia sección y nunca ocupan estos slots,
    // así evitamos que un artículo médico aparezca duplicado en el home.
    const [hero, lead, bigFeatured, smallFeatured, actualidad, medicalArticles] = await Promise.all([
      // 1 — Hero
      this.prisma.article.findFirst({ where: { relevance: 1, status: 'PUBLISHED', type: 'NEWS' }, orderBy: { publishedAt: 'desc' }, include }),
      // 2 — Lead (card grande izquierda)
      this.prisma.article.findFirst({ where: { relevance: 2, status: 'PUBLISHED', type: 'NEWS' }, orderBy: { publishedAt: 'desc' }, include }),
      // 3 — Big Destacada (2 cards a la derecha)
      this.prisma.article.findMany({ where: { relevance: 3, status: 'PUBLISHED', type: 'NEWS' }, take: RELEVANCE_LIMITS[3], orderBy: { publishedAt: 'desc' }, include }),
      // 4 — Small Destacada (compactas debajo del grid)
      this.prisma.article.findMany({ where: { relevance: 4, status: 'PUBLISHED', type: 'NEWS' }, take: RELEVANCE_LIMITS[4], orderBy: { publishedAt: 'desc' }, include }),
      // 5 — Actualidad (grilla 4×3)
      this.prisma.article.findMany({ where: { relevance: 5, status: 'PUBLISHED', type: 'NEWS' }, take: RELEVANCE_LIMITS[5], orderBy: { publishedAt: 'desc' }, include }),
      // Artículos médicos (sección aparte, sin relevancia)
      this.prisma.article.findMany({ where: { type: 'MEDICAL_ARTICLE', status: 'PUBLISHED' }, take: 3, orderBy: { publishedAt: 'desc' }, include }),
    ])

    return { hero, lead, bigFeatured, smallFeatured, actualidad, medicalArticles }
  }

  /** Devuelve cuántos artículos PUBLISHED hay por nivel de relevancia */
  async getRelevanceCounts(): Promise<Record<number, number>> {
    const rows = await this.prisma.article.groupBy({
      by: ['relevance'],
      where: { status: 'PUBLISHED' },
      _count: { _all: true },
    })
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const row of rows) {
      if (row.relevance != null && row.relevance >= 1 && row.relevance <= 5) {
        counts[row.relevance] = row._count._all
      }
    }
    return counts
  }

  async findPublished(
    page = 1,
    limit = 10,
    type?: string,
    tagSlug?: string,
    sort: 'publishedAt_desc' | 'views_desc' = 'publishedAt_desc',
  ) {
    const where: Prisma.ArticleWhereInput = { status: ArticleStatus.PUBLISHED }
    if (type) where.type = type as ArticleType
    if (tagSlug) where.tags = { some: { tag: { slug: tagSlug } } }

    const orderBy =
      sort === 'views_desc' ? { viewsCount: 'desc' as const } : { publishedAt: 'desc' as const }

    const [data, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: { tags: { include: { tag: true } } },
      }),
      this.prisma.article.count({ where }),
    ])

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  // Fix #1 — findBySlug con opción "full"
  //
  // Problema original: siempre cargaba tags + seoMetadata + sources + relatedFrom.
  // Solución: la opción `full` (default true) carga todo para SSR del detalle;
  // pasando `full: false` se obtiene una versión liviana para listados.

  async findBySlug(slug: string, options: { full?: boolean } = {}) {
    const { full = true } = options

    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        tags: { include: { tag: true } },
        seoMetadata: true,
        sources: full ? { orderBy: { order: 'asc' } } : false,
        media: full
          ? { include: { media: true }, orderBy: { position: 'asc' } }
          : false,
        relatedFrom: full
          ? {
              include: {
                relatedArticle: { include: { tags: { include: { tag: true } } } },
              },
            }
          : false,
      },
    })

    if (!article || article.status !== 'PUBLISHED') {
      throw new NotFoundException('Artículo no encontrado')
    }

    return article
  }

  // ─── BÚSQUEDA PÚBLICA ────────────────────────────────────────────────────────
  //
  // Usa columna persistente `search_vector` (tsvector con pesos A/B/C).
  // Requiere haber ejecutado: npx prisma db execute --file=./prisma/search-setup.sql
  //
  // Ranking combinado: relevancia textual (70%) + popularidad log(views+1) (30%)
  // Fallback automático a to_tsvector si search_vector aún no está poblado.

  /**
   * Convierte el input del usuario en un tsquery con prefix matching en la última palabra.
   * "docto"        → "docto:*"           (encuentra doctores, doctor, doctoral...)
   * "diabetes tip" → "diabetes & tip:*"  (encuentra diabetes tipo 2, tipos...)
   * "doctor"       → "doctor:*"          (sigue funcionando con palabras completas)
   */
  private buildPrefixTsQuery(input: string): string {
    const words = input
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
      .filter(Boolean)

    if (words.length === 0) return ''

    const last    = words[words.length - 1]
    const leading = words.slice(0, -1)

    return [...leading, `${last}:*`].join(' & ')
  }

  async search(query: string, page: number, limit: number) {
    const skip    = (page - 1) * limit
    const tsQuery = this.buildPrefixTsQuery(query)

    if (!tsQuery) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } }
    }

    const [articles, countResult] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT
          id, type, title, slug, "featuredImage", "authorName",
          status, relevance, "viewsCount", "publishedAt", "createdAt",
          LEFT(content, 800) AS content,
          -- Strip HTML para mostrar texto plano en la UI
          regexp_replace(COALESCE(excerpt, LEFT(content, 200), ''), '<[^>]*>', '', 'g') AS excerpt,

          -- Ranking: relevancia textual × 0.7 + popularidad × 0.3
          (
            ts_rank_cd(
              COALESCE(
                search_vector,
                setweight(to_tsvector('spanish', COALESCE(title,   '')), 'A') ||
                setweight(to_tsvector('spanish', COALESCE(excerpt, '')), 'B') ||
                setweight(to_tsvector('spanish', COALESCE(content, '')), 'C')
              ),
              to_tsquery('spanish', ${tsQuery}),
              32
            ) * 0.7
            + LOG("viewsCount"::float + 1) * 0.3
          ) AS score,

          -- Snippet con términos destacados (se stripea HTML antes de pasar a ts_headline)
          ts_headline(
            'spanish',
            regexp_replace(COALESCE(excerpt, LEFT(content, 500), ''), '<[^>]*>', '', 'g'),
            to_tsquery('spanish', ${tsQuery}),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=25, MinWords=10, MaxFragments=1, ShortWord=2'
          ) AS headline

        FROM "Article"
        WHERE
          status = 'PUBLISHED'
          AND COALESCE(
            search_vector,
            setweight(to_tsvector('spanish', COALESCE(title,   '')), 'A') ||
            setweight(to_tsvector('spanish', COALESCE(excerpt, '')), 'B') ||
            setweight(to_tsvector('spanish', COALESCE(content, '')), 'C')
          ) @@ to_tsquery('spanish', ${tsQuery})
        ORDER BY score DESC, "publishedAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `,
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) AS count
        FROM "Article"
        WHERE
          status = 'PUBLISHED'
          AND COALESCE(
            search_vector,
            setweight(to_tsvector('spanish', COALESCE(title,   '')), 'A') ||
            setweight(to_tsvector('spanish', COALESCE(excerpt, '')), 'B') ||
            setweight(to_tsvector('spanish', COALESCE(content, '')), 'C')
          ) @@ to_tsquery('spanish', ${tsQuery})
      `,
    ])

    const total = Number(countResult[0]?.count ?? 0)

    const articleIds = articles.map((a: any) => a.id)
    const tags = await this.prisma.articleTag.findMany({
      where: { articleId: { in: articleIds } },
      include: { tag: true },
    })

    const articlesWithTags = articles.map((article: any) => ({
      ...article,
      tags: tags
        .filter((t) => t.articleId === article.id)
        .map((t) => ({ tag: t.tag })),
    }))

    return {
      data: articlesWithTags,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  // Fix #2 — incrementViews acumula en buffer (ver arriba)
  async incrementViews(slug: string) {
    this.viewsBuffer.set(slug, (this.viewsBuffer.get(slug) ?? 0) + 1)
  }

  // ─── ADMIN ───────────────────────────────────────────────────────────────────

  async findByIdAdmin(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        seoMetadata: true,
        sources: { orderBy: { order: 'asc' } },
        media: { include: { media: true }, orderBy: { position: 'asc' } },
      },
    })
    if (!article) throw new NotFoundException('Artículo no encontrado')
    return article
  }

  async findAllAdmin(params: {
    page?: number
    limit?: number
    type?: string
    status?: string
    relevance?: number | null
    tag?: string
    search?: string
    sort?: string
  }) {
    const { page = 1, limit = 20, type, status, relevance, tag, search, sort = 'publishedAt_desc' } =
      params

    const where: Prisma.ArticleWhereInput = {}
    if (type) where.type = type as ArticleType
    if (status) where.status = status as ArticleStatus
    if (relevance !== undefined) where.relevance = relevance
    if (tag) where.tags = { some: { tag: { slug: tag } } }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.buildOrderBy(sort),
        include: { tags: { include: { tag: true } } },
      }),
      this.prisma.article.count({ where }),
    ])

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  // Fix #3 — generateSlug resistente a concurrencia
  //
  // Problema original: while + findUnique tiene race condition si dos requests
  // llegan al mismo tiempo con el mismo título.
  // Solución: dejamos que la BD rechace con P2002 (unique constraint) y
  // reintentamos con sufijo — optimistic concurrency.

  async create(dto: CreateArticleDto) {
    const base = slugify(dto.slug || dto.title, { lower: true, strict: true, locale: 'es' })
    // Los artículos médicos nunca ocupan slots editoriales del home de noticias.
    // Defensa en profundidad: ignoramos cualquier relevance que llegue en el DTO.
    const isMedical = dto.type === ArticleType.MEDICAL_ARTICLE
    const data = {
      type: dto.type,
      title: stripAllHtml(dto.title),
      excerpt: dto.excerpt ? stripAllHtml(dto.excerpt) : dto.excerpt,
      content: sanitizeHtml(dto.content),
      featuredImage: dto.featuredImage,
      authorName: dto.authorName ?? 'Reporte Médico',
      status: dto.status ?? ArticleStatus.DRAFT,
      // Médicos: siempre null. Noticias: respetamos null explícito ("Sin slot editorial"),
      // y si no viene nada en el DTO, default 4 (Small Destacada).
      relevance: isMedical ? null : (dto.relevance === undefined ? 4 : dto.relevance),
      ...(dto.publishedAt && { publishedAt: new Date(dto.publishedAt) }),
      tags: dto.tagIds?.length
        ? { create: dto.tagIds.map((tagId) => ({ tagId })) }
        : undefined,
      sources: dto.sources?.filter((s) => !!s.title).length
        ? {
            create: dto.sources!.filter((s) => !!s.title).map((s, i) => ({
              title: s.title,
              url: s.url ?? null,
              order: s.order ?? i,
            })),
          }
        : undefined,
      seoMetadata:
        dto.seoMetadata?.metaTitle || dto.seoMetadata?.metaDescription
          ? {
              create: {
                metaTitle: dto.seoMetadata!.metaTitle,
                metaDescription: dto.seoMetadata!.metaDescription,
              },
            }
          : undefined,
    }

    for (let attempt = 0; attempt < 10; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${attempt}`
      try {
        return await this.prisma.article.create({ data: { ...data, slug } })
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002' &&
          (e.meta as any)?.target?.includes('slug')
        ) {
          continue // slug ocupado → siguiente sufijo
        }
        throw e
      }
    }
    throw new Error('No se pudo generar un slug único tras 10 intentos')
  }

  // Fix #4 — update de tags por diff, no delete-all + create
  //
  // Problema original: deleteMany {} + create recrea todos los registros
  // aunque ninguno haya cambiado.
  // Solución: calcular qué tags se agregan y cuáles se quitan, y solo tocar
  // los que cambiaron. Envuelto en transacción.

  async update(id: string, dto: UpdateArticleDto) {
    const { tagIds, sources, seoMetadata, slug: _slug, ...fields } = dto

    return this.prisma.$transaction(async (tx) => {
      // Si el artículo es médico, fuerza relevance=null y omite la cascada:
      // los artículos médicos no ocupan slots editoriales del home de noticias.
      const existing = await tx.article.findUnique({
        where: { id },
        select: { type: true },
      })
      const isMedical = existing?.type === ArticleType.MEDICAL_ARTICLE

      // Diff de tags
      if (tagIds !== undefined) {
        const current = await tx.articleTag.findMany({
          where: { articleId: id },
          select: { tagId: true },
        })
        const currentSet = new Set(current.map((t) => t.tagId))
        const newSet = new Set(tagIds)

        const toDelete = [...currentSet].filter((tid) => !newSet.has(tid))
        const toCreate = [...newSet].filter((tid) => !currentSet.has(tid))

        if (toDelete.length) {
          await tx.articleTag.deleteMany({ where: { articleId: id, tagId: { in: toDelete } } })
        }
        if (toCreate.length) {
          await tx.articleTag.createMany({
            data: toCreate.map((tagId) => ({ articleId: id, tagId })),
          })
        }
      }

      // Sources: delete+recreate sigue siendo correcto (el orden puede cambiar)
      if (sources !== undefined) {
        await tx.articleSource.deleteMany({ where: { articleId: id } })
        const validSources = sources.filter((s) => !!s.title)
        if (validSources.length) {
          await tx.articleSource.createMany({
            data: validSources.map((s, i) => ({
              articleId: id,
              title: s.title,
              url: s.url ?? null,
              order: s.order ?? i,
            })),
          })
        }
      }

      // Aplicar cascada si el artículo será PUBLISHED y cambia de relevance o de estado.
      // Los artículos médicos no participan de la cascada (no tienen slot editorial).
      if (!isMedical && (fields.relevance !== undefined || fields.status !== undefined)) {
        const current = await tx.article.findUnique({
          where: { id },
          select: { relevance: true, status: true },
        })
        if (current) {
          const targetStatus = (fields.status ?? current.status) as ArticleStatus
          const targetRelevance = fields.relevance ?? current.relevance
          const wasPublished = current.status === ArticleStatus.PUBLISHED
          const willBePublished = targetStatus === ArticleStatus.PUBLISHED
          const relevanceChanges = fields.relevance !== undefined && fields.relevance !== current.relevance

          if (willBePublished && (!wasPublished || relevanceChanges) && targetRelevance != null) {
            await this.applyRelevanceCascade(tx, id, targetRelevance)
          }
        }
      }

      return tx.article.update({
        where: { id },
        data: {
          title: fields.title !== undefined ? stripAllHtml(fields.title) : undefined,
          excerpt: fields.excerpt !== undefined ? stripAllHtml(fields.excerpt) : undefined,
          content: fields.content !== undefined ? sanitizeHtml(fields.content) : undefined,
          featuredImage: fields.featuredImage,
          authorName: fields.authorName,
          ...(fields.status !== undefined && { status: fields.status }),
          // Médicos: siempre relevance=null. Noticias: solo si vino en el DTO.
          ...(isMedical
            ? { relevance: null }
            : fields.relevance !== undefined && { relevance: fields.relevance }),
          ...(fields.publishedAt !== undefined && { publishedAt: new Date(fields.publishedAt) }),
          ...(seoMetadata !== undefined && {
            seoMetadata: {
              upsert: {
                create: {
                  metaTitle: seoMetadata.metaTitle,
                  metaDescription: seoMetadata.metaDescription,
                },
                update: {
                  metaTitle: seoMetadata.metaTitle,
                  metaDescription: seoMetadata.metaDescription,
                },
              },
            },
          }),
        },
      })
    })
  }

  async setStatus(id: string, status: ArticleStatus) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.article.findUnique({
        where: { id },
        select: { relevance: true, status: true, type: true },
      })
      if (!current) throw new NotFoundException('Artículo no encontrado')

      const wasPublished = current.status === ArticleStatus.PUBLISHED
      const willBePublished = status === ArticleStatus.PUBLISHED
      const isMedical = current.type === ArticleType.MEDICAL_ARTICLE

      // Aplicar cascada solo al pasar de no-publicado a publicado.
      // Los artículos médicos no participan de la cascada.
      if (!isMedical && willBePublished && !wasPublished && current.relevance != null) {
        await this.applyRelevanceCascade(tx, id, current.relevance)
      }

      return tx.article.update({
        where: { id },
        data: {
          status,
          ...(willBePublished && { publishedAt: new Date() }),
        },
      })
    })

    // TODO: notificación al autor por email (pendiente — implementar con dominio verificado)
    // El authorEmail queda guardado en el artículo para que el admin notifique manualmente

    return updated
  }

  /**
   * Aplica la cascada de relevancias dentro de una transacción.
   *
   * Reglas:
   *  → 1: desplaza el hero existente a 2
   *  → 2: desplaza el lead existente a 3
   *  → 3: si hay ≥ 2 en nivel 3 (sin contar id), el más antiguo baja a 4
   *  → 4: si hay ≥ 8 en nivel 4 (sin contar id), el más antiguo baja a 5
   *  → 5: sin cascada (el home simplemente muestra los 12 más recientes)
   *
   * Solo se aplica a artículos PUBLISHED.
   */
  /**
   * Asegura que haya espacio en `level` para un artículo adicional PUBLISHED,
   * desplazando el exceso al nivel siguiente de forma recursiva.
   * `incomingId` — artículo que ocupará este nivel (se excluye del conteo).
   */
  private async makeRoomAtLevel(
    tx: Prisma.TransactionClient,
    level: number,
    incomingId: string,
  ): Promise<void> {
    if (level > 5) return
    const pub = ArticleStatus.PUBLISHED
    const limit = RELEVANCE_LIMITS[level]

    const count = await tx.article.count({
      where: { relevance: level, status: pub, id: { not: incomingId } },
    })
    const excess = count - (limit - 1) // cuántos necesitan moverse
    if (excess <= 0) return            // hay espacio, no hay nada que hacer

    const toDisplace = await tx.article.findMany({
      where: { relevance: level, status: pub, id: { not: incomingId } },
      orderBy: { publishedAt: 'asc' },
      take: excess,
      select: { id: true },
    })
    if (!toDisplace.length) return

    if (level === 5) {
      // Nivel 5 es el final de la cascada: los desplazados pierden su slot editorial
      await tx.article.updateMany({
        where: { id: { in: toDisplace.map((a) => a.id) } },
        data: { relevance: null },
      })
    } else {
      // Hacer espacio en el nivel siguiente antes de mover
      for (const a of toDisplace) {
        await this.makeRoomAtLevel(tx, level + 1, a.id)
      }
      await tx.article.updateMany({
        where: { id: { in: toDisplace.map((a) => a.id) } },
        data: { relevance: level + 1 },
      })
    }
  }

  private async applyRelevanceCascade(
    tx: Prisma.TransactionClient,
    id: string,
    targetRelevance: number,
  ): Promise<void> {
    await this.makeRoomAtLevel(tx, targetRelevance, id)
  }

  async setRelevance(id: string, relevance: number | null) {
    return this.prisma.$transaction(async (tx) => {
      // Los artículos médicos no pueden tener relevance: viven en su propia sección.
      const existing = await tx.article.findUnique({ where: { id }, select: { type: true } })
      if (existing?.type === ArticleType.MEDICAL_ARTICLE) {
        return tx.article.update({ where: { id }, data: { relevance: null } })
      }
      // null = "Sin slot editorial": el artículo sigue publicado y accesible,
      // pero desaparece del home. No requiere cascada (no entra a ningún slot).
      if (relevance === null) {
        return tx.article.update({ where: { id }, data: { relevance: null } })
      }
      await this.applyRelevanceCascade(tx, id, relevance)
      return tx.article.update({ where: { id }, data: { relevance } })
    })
  }

  async remove(id: string) {
    return this.prisma.article.delete({ where: { id } })
  }

  async submitPublic(dto: SubmitPublicDto) {
    const base = slugify(dto.title, { lower: true, strict: true, locale: 'es' })
    const filteredSources = dto.sources?.filter((s) => !!s.title) ?? []
    const data = {
      title: stripAllHtml(dto.title),
      excerpt: dto.excerpt ? stripAllHtml(dto.excerpt) : dto.excerpt,
      content: sanitizeHtml(dto.content),
      featuredImage: dto.featuredImage,
      authorName: stripAllHtml(dto.authorName),
      authorEmail: dto.authorEmail ?? null,
      type: ArticleType.MEDICAL_ARTICLE,
      status: ArticleStatus.PENDING,
      suggestedSpecialties: dto.suggestedSpecialties ?? [],
      tags: dto.tagIds?.length
        ? { create: dto.tagIds.map((tagId) => ({ tagId })) }
        : undefined,
      sources: filteredSources.length
        ? {
            create: filteredSources.map((s) => ({
              title: s.title,
              url: s.url ?? null,
              order: s.order ?? 0,
            })),
          }
        : undefined,
    }

    // Fix #3 aplicado también al submit público
    let article: Awaited<ReturnType<typeof this.prisma.article.create>> | null = null
    for (let attempt = 0; attempt < 10; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${attempt}`
      try {
        article = await this.prisma.article.create({ data: { ...data, slug } })
        break
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002' &&
          (e.meta as any)?.target?.includes('slug')
        ) {
          continue
        }
        throw e
      }
    }
    if (!article) throw new Error('No se pudo generar un slug único')

    // Side-effects: suscripción + email de confirmación (best-effort)
    if (dto.authorEmail) {
      try {
        await this.subscribersService.subscribeFromArticle(
          dto.authorEmail,
          dto.authorName,
          dto.tagIds ?? [],
        )
      } catch { /* ignorar */ }
      // TODO: email de confirmación de recepción (pendiente — implementar con dominio verificado)
    }

    return article
  }

  // ─── GALERÍA DE FOTOS ────────────────────────────────────────────────────────

  async addGalleryImage(articleId: string, mediaId: string, caption?: string, position?: number) {
    if (position === undefined) {
      const agg = await this.prisma.articleMedia.aggregate({
        where: { articleId },
        _max: { position: true },
      })
      position = (agg._max.position ?? -1) + 1
    }

    return this.prisma.articleMedia.upsert({
      where: { articleId_mediaId: { articleId, mediaId } },
      create: { articleId, mediaId, caption, position },
      update: { caption, position },
      include: { media: true },
    })
  }

  async removeGalleryImage(articleId: string, mediaId: string) {
    return this.prisma.articleMedia.delete({
      where: { articleId_mediaId: { articleId, mediaId } },
    })
  }

  async reorderGallery(articleId: string, items: { mediaId: string; position: number }[]) {
    await Promise.all(
      items.map(({ mediaId, position }) =>
        this.prisma.articleMedia.update({
          where: { articleId_mediaId: { articleId, mediaId } },
          data: { position },
        }),
      ),
    )
    return this.prisma.articleMedia.findMany({
      where: { articleId },
      include: { media: true },
      orderBy: { position: 'asc' },
    })
  }

  async updateGalleryCaption(articleId: string, mediaId: string, caption: string) {
    return this.prisma.articleMedia.update({
      where: { articleId_mediaId: { articleId, mediaId } },
      data: { caption },
      include: { media: true },
    })
  }

  // ─── ESPECIALIDADES PROPUESTAS ────────────────────────────────────────────────

  async getPendingSpecialties() {
    const articles = await this.prisma.article.findMany({
      where: { suggestedSpecialties: { isEmpty: false } },
      select: {
        id: true,
        title: true,
        status: true,
        authorName: true,
        suggestedSpecialties: true,
      },
    })
    // Aplanar: un registro por especialidad propuesta
    return articles.flatMap((a) =>
      (a.suggestedSpecialties as string[]).map((name) => ({
        articleId: a.id,
        articleTitle: a.title,
        articleStatus: a.status,
        authorName: a.authorName,
        specialtyName: name,
      })),
    )
  }

  async approveSpecialty(articleId: string, specialtyName: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } })
    if (!article) throw new NotFoundException('Artículo no encontrado')

    const normalized = specialtyName.charAt(0).toUpperCase() + specialtyName.slice(1).trim()

    const allTags = await this.prisma.tag.findMany({ select: { id: true, name: true, slug: true } })
    let tag =
      allTags.find((t) => this.stripAccents(t.name) === this.stripAccents(normalized)) ?? null

    if (!tag) {
      const tagSlug = slugify(normalized, { lower: true, strict: true, locale: 'es' })
      tag = await this.prisma.tag.create({ data: { name: normalized, slug: tagSlug } })
    }

    await this.prisma.articleTag.upsert({
      where: { articleId_tagId: { articleId, tagId: tag.id } },
      create: { articleId, tagId: tag.id },
      update: {},
    })

    const updated = (article.suggestedSpecialties as string[]).filter(
      (s) => s.toLowerCase() !== specialtyName.toLowerCase(),
    )

    return this.prisma.article.update({
      where: { id: articleId },
      data: { suggestedSpecialties: updated },
      include: { tags: { include: { tag: true } } },
    })
  }

  async rejectSpecialty(articleId: string, specialtyName: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } })
    if (!article) throw new NotFoundException('Artículo no encontrado')

    const updated = (article.suggestedSpecialties as string[]).filter(
      (s) => s.toLowerCase() !== specialtyName.toLowerCase(),
    )

    return this.prisma.article.update({
      where: { id: articleId },
      data: { suggestedSpecialties: updated },
    })
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  private stripAccents(str: string): string {
    return str.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  }

  private buildOrderBy(sort: string): Prisma.ArticleOrderByWithRelationInput {
    const map: Record<string, Prisma.ArticleOrderByWithRelationInput> = {
      publishedAt_desc: { publishedAt: 'desc' },
      createdAt_desc: { createdAt: 'desc' },
      relevance_asc: { relevance: 'asc' },
      views_desc: { viewsCount: 'desc' },
    }
    return map[sort] ?? { publishedAt: 'desc' }
  }
}
