import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, ArticleType, ArticleStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import slugify from 'slugify'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { SubmitPublicDto } from './dto/submit-public.dto'

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  // ─── PÚBLICO ──────────────────────────────────────────

  async getHome() {
    const [hero, featured, latest, medicalArticles] = await Promise.all([
      this.prisma.article.findFirst({
        where: { relevance: 1, status: 'PUBLISHED' },
        include: { tags: { include: { tag: true } } },
      }),
      this.prisma.article.findMany({
        where: { relevance: 2, status: 'PUBLISHED' },
        take: 4,
        orderBy: { publishedAt: 'desc' },
        include: { tags: { include: { tag: true } } },
      }),
      this.prisma.article.findMany({
        where: { relevance: 3, status: 'PUBLISHED' },
        take: 6,
        orderBy: { publishedAt: 'desc' },
        include: { tags: { include: { tag: true } } },
      }),
      this.prisma.article.findMany({
        where: { type: 'MEDICAL_ARTICLE', status: 'PUBLISHED' },
        take: 3,
        orderBy: { publishedAt: 'desc' },
        include: { tags: { include: { tag: true } } },
      }),
    ])

    return { hero, featured, latest, medicalArticles }
  }

  async findPublished(page = 1, limit = 10, type?: string, tagSlug?: string) {
    const where: Prisma.ArticleWhereInput = { status: ArticleStatus.PUBLISHED }
    if (type) where.type = type as ArticleType
    if (tagSlug) {
      where.tags = { some: { tag: { slug: tagSlug } } }
    }

    const [data, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: { tags: { include: { tag: true } } },
      }),
      this.prisma.article.count({ where }),
    ])

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        tags: { include: { tag: true } },
        seoMetadata: true,
        sources: { orderBy: { order: 'asc' } },
        relatedFrom: {
          include: {
            relatedArticle: {
              include: { tags: { include: { tag: true } } },
            },
          },
        },
      },
    })

    if (!article || article.status !== 'PUBLISHED') {
      throw new NotFoundException('Artículo no encontrado')
    }

    return article
  }

  async incrementViews(slug: string) {
    return this.prisma.article.update({
      where: { slug },
      data: { viewsCount: { increment: 1 } },
    })
  }

  // ─── ADMIN ────────────────────────────────────────────

  async findByIdAdmin(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        seoMetadata: true,
        sources: { orderBy: { order: 'asc' } },
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
    relevance?: number
    tag?: string
    search?: string
    sort?: string
  }) {
    const { page = 1, limit = 20, type, status, relevance, tag, search, sort = 'publishedAt_desc' } = params

    const where: Prisma.ArticleWhereInput = {}
    if (type) where.type = type as ArticleType
    if (status) where.status = status as ArticleStatus
    if (relevance) where.relevance = relevance
    if (tag) where.tags = { some: { tag: { slug: tag } } }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ]
    }

    const orderBy = this.buildOrderBy(sort)

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

  async create(dto: CreateArticleDto) {
    const slug = await this.generateSlug(dto.slug || dto.title)
    return this.prisma.article.create({
      data: {
        type: dto.type,
        title: dto.title,
        excerpt: dto.excerpt,
        content: dto.content,
        featuredImage: dto.featuredImage,
        authorName: dto.authorName ?? 'Reporte Médico',
        slug,
        status: dto.status ?? ArticleStatus.DRAFT,
        relevance: dto.relevance ?? 3,
        ...(dto.publishedAt && { publishedAt: new Date(dto.publishedAt) }),
        tags: dto.tagIds?.length
          ? { create: dto.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
    })
  }

  async update(id: string, dto: UpdateArticleDto) {
    const { tagIds, slug: _slug, ...fields } = dto
    return this.prisma.article.update({
      where: { id },
      data: {
        title: fields.title,
        excerpt: fields.excerpt,
        content: fields.content,
        featuredImage: fields.featuredImage,
        authorName: fields.authorName,
        ...(fields.status !== undefined && { status: fields.status }),
        ...(fields.relevance !== undefined && { relevance: fields.relevance }),
        ...(fields.publishedAt !== undefined && { publishedAt: new Date(fields.publishedAt) }),
        ...(tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
    })
  }

  async setStatus(id: string, status: ArticleStatus) {
    return this.prisma.article.update({
      where: { id },
      data: {
        status,
        ...(status === ArticleStatus.PUBLISHED && { publishedAt: new Date() }),
      },
    })
  }

  async setRelevance(id: string, relevance: number) {
    return this.prisma.$transaction(async (tx) => {
      if (relevance === 1) {
        await tx.article.updateMany({
          where: { relevance: 1, status: ArticleStatus.PUBLISHED, id: { not: id } },
          data: { relevance: 2 },
        })
      }
      return tx.article.update({ where: { id }, data: { relevance } })
    })
  }

  async remove(id: string) {
    return this.prisma.article.delete({ where: { id } })
  }

  async submitPublic(dto: SubmitPublicDto) {
    const slug = await this.generateSlug(dto.title)
    const filteredSources = dto.sources?.filter((s) => !!s.title) ?? []

    return this.prisma.article.create({
      data: {
        title: dto.title,
        excerpt: dto.excerpt,
        content: dto.content,
        featuredImage: dto.featuredImage,
        authorName: dto.authorName,
        slug,
        type: ArticleType.MEDICAL_ARTICLE,
        status: ArticleStatus.PENDING,
        suggestedSpecialties: dto.suggestedSpecialties ?? [],
        tags: dto.tagIds?.length
          ? { create: dto.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
        sources: filteredSources.length > 0
          ? {
              create: filteredSources.map((s) => ({
                title: s.title,
                url: s.url ?? null,
                order: s.order ?? 0,
              })),
            }
          : undefined,
      },
    })
  }

  // ─── ESPECIALIDADES PROPUESTAS ────────────────────────

  async approveSpecialty(articleId: string, specialtyName: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } })
    if (!article) throw new NotFoundException('Artículo no encontrado')

    // Normalizar: primera letra mayúscula
    const normalized =
      specialtyName.charAt(0).toUpperCase() + specialtyName.slice(1).trim()

    // Buscar tag existente comparando sin acentos
    const allTags = await this.prisma.tag.findMany({
      select: { id: true, name: true, slug: true },
    })
    let tag =
      allTags.find(
        (t) => this.stripAccents(t.name) === this.stripAccents(normalized),
      ) ?? null

    if (!tag) {
      const tagSlug = slugify(normalized, { lower: true, strict: true, locale: 'es' })
      tag = await this.prisma.tag.create({ data: { name: normalized, slug: tagSlug } })
    }

    // Vincular tag al artículo (upsert para no duplicar)
    await this.prisma.articleTag.upsert({
      where: { articleId_tagId: { articleId, tagId: tag.id } },
      create: { articleId, tagId: tag.id },
      update: {},
    })

    // Eliminar de suggestedSpecialties
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

  // ─── HELPERS ──────────────────────────────────────────

  private async generateSlug(title: string) {
    const base = slugify(title, { lower: true, strict: true, locale: 'es' })
    let slug = base
    let counter = 1
    while (await this.prisma.article.findUnique({ where: { slug } })) {
      slug = `${base}-${counter++}`
    }
    return slug
  }

  /** Quita acentos y pasa a minúsculas para comparación sin acentos */
  private stripAccents(str: string): string {
    return str
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
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
