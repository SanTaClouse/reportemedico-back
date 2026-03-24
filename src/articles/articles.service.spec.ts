/**
 * articles.service.spec.ts
 *
 * Tests unitarios completos del ArticlesService.
 * Cubre: getHome, findPublished, findBySlug, incrementViews, flushViews,
 *        create (incluyendo reintentos de slug), update (diff de tags y sources),
 *        setStatus, setRelevance (cascada editorial), remove, submitPublic,
 *        approveSpecialty y rejectSpecialty.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { ArticlesService } from './articles.service'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma, ArticleStatus, ArticleType } from '@prisma/client'

// ─── Mocks de módulos externos ────────────────────────────────────────────────

jest.mock('slugify', () =>
  jest.fn((str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, ''),
  ),
)

jest.mock('../utils/sanitize.util', () => ({
  sanitizeHtml: jest.fn((html: string) => html),
  stripAllHtml: jest.fn((str: string) => str.replace(/<[^>]*>/g, '')),
}))

// ─── Factory de artículo base ─────────────────────────────────────────────────

function makeArticle(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'art-1',
    type: ArticleType.NEWS,
    title: 'Test Article',
    slug: 'test-article',
    excerpt: 'Test excerpt',
    content: '<p>Test content</p>',
    featuredImage: null,
    authorName: 'Reporte Médico',
    status: ArticleStatus.PUBLISHED,
    relevance: 4,
    viewsCount: 0,
    publishedAt: new Date('2024-01-01T12:00:00Z'),
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    suggestedSpecialties: [] as string[],
    tags: [],
    seoMetadata: null,
    sources: [],
    ...overrides,
  }
}

// ─── Suite principal ──────────────────────────────────────────────────────────

describe('ArticlesService', () => {
  let service: ArticlesService
  let module: TestingModule
  let mockPrisma: Record<string, any>

  beforeEach(async () => {
    jest.useFakeTimers()

    mockPrisma = {
      article: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      articleTag: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        upsert: jest.fn(),
      },
      articleSource: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      tag: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      // La transacción ejecuta el callback pasando mockPrisma como `tx`
      $transaction: jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(mockPrisma)),
    }

    module = await Test.createTestingModule({
      providers: [ArticlesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile()

    service = module.get<ArticlesService>(ArticlesService)
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await module.close()
    jest.useRealTimers()
  })

  // ─── getHome ────────────────────────────────────────────────────────────────

  describe('getHome()', () => {
    it('devuelve hero, featured (lead + big + small), actualidad y medicalArticles', async () => {
      const hero = makeArticle({ id: 'hero', relevance: 1 })
      const lead = makeArticle({ id: 'lead', relevance: 2 })
      const bigFeatured = [makeArticle({ id: 'big-1', relevance: 3 })]
      const smallFeatured = [makeArticle({ id: 'small-1', relevance: 4 })]
      const actualidad = [makeArticle({ id: 'act-1', relevance: 5 })]
      const medical = [makeArticle({ id: 'med-1', type: ArticleType.MEDICAL_ARTICLE })]

      mockPrisma.article.findFirst
        .mockResolvedValueOnce(hero)  // relevance: 1
        .mockResolvedValueOnce(lead)  // relevance: 2
      mockPrisma.article.findMany
        .mockResolvedValueOnce(bigFeatured)   // relevance: 3
        .mockResolvedValueOnce(smallFeatured) // relevance: 4
        .mockResolvedValueOnce(actualidad)    // relevance: 5
        .mockResolvedValueOnce(medical)       // medicalArticles

      const result = await service.getHome()

      expect(result.hero).toEqual(hero)
      expect(result.lead).toEqual(lead)
      expect(result.bigFeatured).toEqual(bigFeatured)
      expect(result.smallFeatured).toEqual(smallFeatured)
      expect(result.actualidad).toEqual(actualidad)
      expect(result.medicalArticles).toEqual(medical)
    })

    it('featured queda vacío si no existe artículo lead', async () => {
      mockPrisma.article.findFirst.mockResolvedValue(null)
      mockPrisma.article.findMany.mockResolvedValue([])

      const result = await service.getHome()

      expect(result.hero).toBeNull()
      expect(result.lead).toBeNull()
      expect(result.bigFeatured).toEqual([])
      expect(result.smallFeatured).toEqual([])
    })
  })

  // ─── findPublished ───────────────────────────────────────────────────────────

  describe('findPublished()', () => {
    it('devuelve artículos paginados con meta correcta', async () => {
      const articles = [makeArticle(), makeArticle({ id: 'art-2' })]
      mockPrisma.article.findMany.mockResolvedValue(articles)
      mockPrisma.article.count.mockResolvedValue(25)

      const result = await service.findPublished(2, 10)

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ArticleStatus.PUBLISHED },
          skip: 10,
          take: 10,
        }),
      )
      expect(result.meta).toEqual({ total: 25, page: 2, limit: 10, totalPages: 3 })
      expect(result.data).toEqual(articles)
    })

    it('filtra por type cuando se provee', async () => {
      mockPrisma.article.findMany.mockResolvedValue([])
      mockPrisma.article.count.mockResolvedValue(0)

      await service.findPublished(1, 10, 'NEWS')

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ArticleStatus.PUBLISHED, type: 'NEWS' },
        }),
      )
    })

    it('filtra por tagSlug cuando se provee', async () => {
      mockPrisma.article.findMany.mockResolvedValue([])
      mockPrisma.article.count.mockResolvedValue(0)

      await service.findPublished(1, 10, undefined, 'cardiologia')

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: ArticleStatus.PUBLISHED,
            tags: { some: { tag: { slug: 'cardiologia' } } },
          },
        }),
      )
    })

    it('ordena por viewsCount cuando sort=views_desc', async () => {
      mockPrisma.article.findMany.mockResolvedValue([])
      mockPrisma.article.count.mockResolvedValue(0)

      await service.findPublished(1, 10, undefined, undefined, 'views_desc')

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { viewsCount: 'desc' } }),
      )
    })

    it('usa publishedAt_desc como orden por defecto', async () => {
      mockPrisma.article.findMany.mockResolvedValue([])
      mockPrisma.article.count.mockResolvedValue(0)

      await service.findPublished()

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { publishedAt: 'desc' } }),
      )
    })

    it('calcula totalPages con Math.ceil correctamente', async () => {
      mockPrisma.article.findMany.mockResolvedValue([])
      mockPrisma.article.count.mockResolvedValue(11)

      const result = await service.findPublished(1, 5)

      expect(result.meta.totalPages).toBe(3) // ceil(11/5) = 3
    })
  })

  // ─── findBySlug ──────────────────────────────────────────────────────────────

  describe('findBySlug()', () => {
    it('devuelve el artículo si está publicado', async () => {
      const article = makeArticle()
      mockPrisma.article.findUnique.mockResolvedValue(article)

      const result = await service.findBySlug('test-article')

      expect(result).toEqual(article)
    })

    it('lanza NotFoundException si el artículo no existe', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null)

      await expect(service.findBySlug('inexistente')).rejects.toThrow(NotFoundException)
    })

    it('lanza NotFoundException si el artículo no está publicado', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(makeArticle({ status: ArticleStatus.DRAFT }))

      await expect(service.findBySlug('test-article')).rejects.toThrow(NotFoundException)
    })

    it('carga sources y relatedFrom en modo full=true (default)', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(makeArticle())

      await service.findBySlug('test-article', { full: true })

      const { include } = mockPrisma.article.findUnique.mock.calls[0][0]
      expect(include.sources).toBeTruthy()
      expect(include.relatedFrom).toBeTruthy()
    })

    it('NO carga sources ni relatedFrom en modo full=false', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(makeArticle())

      await service.findBySlug('test-article', { full: false })

      const { include } = mockPrisma.article.findUnique.mock.calls[0][0]
      expect(include.sources).toBe(false)
      expect(include.relatedFrom).toBe(false)
    })
  })

  // ─── incrementViews / flushViews ─────────────────────────────────────────────

  describe('incrementViews() + flushViews()', () => {
    it('acumula vistas en el buffer (no escribe inmediatamente a la BD)', async () => {
      await service.incrementViews('test-article')
      await service.incrementViews('test-article')
      await service.incrementViews('otro-articulo')

      expect(mockPrisma.article.updateMany).not.toHaveBeenCalled()

      const buffer = (service as any).viewsBuffer as Map<string, number>
      expect(buffer.get('test-article')).toBe(2)
      expect(buffer.get('otro-articulo')).toBe(1)
    })

    it('flushViews escribe en batch y limpia el buffer', async () => {
      mockPrisma.article.updateMany.mockResolvedValue({ count: 1 })

      await service.incrementViews('test-article')
      await service.incrementViews('test-article')

      await (service as any).flushViews()

      expect(mockPrisma.article.updateMany).toHaveBeenCalledWith({
        where: { slug: 'test-article' },
        data: { viewsCount: { increment: 2 } },
      })
      expect((service as any).viewsBuffer.size).toBe(0)
    })

    it('flushViews no hace nada si el buffer está vacío', async () => {
      await (service as any).flushViews()

      expect(mockPrisma.article.updateMany).not.toHaveBeenCalled()
    })

    it('flushViews se ejecuta automáticamente al avanzar el timer 30 s', async () => {
      mockPrisma.article.updateMany.mockResolvedValue({ count: 1 })
      await service.incrementViews('slug-a')

      jest.advanceTimersByTime(30_000)
      await Promise.resolve() // flush de microtareas

      expect(mockPrisma.article.updateMany).toHaveBeenCalled()
    })
  })

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const baseDto = {
      type: ArticleType.NEWS,
      title: 'Mi Artículo de Prueba',
      content: '<p>Contenido completo del artículo</p>',
    }

    it('crea el artículo y genera el slug correctamente', async () => {
      const created = makeArticle({ slug: 'mi-articulo-de-prueba' })
      mockPrisma.article.create.mockResolvedValue(created)

      const result = await service.create(baseDto as any)

      expect(mockPrisma.article.create).toHaveBeenCalledTimes(1)
      expect(result).toEqual(created)
    })

    it('respeta el slug personalizado cuando se provee en el DTO', async () => {
      mockPrisma.article.create.mockResolvedValue(makeArticle({ slug: 'slug-personalizado' }))

      await service.create({ ...baseDto, slug: 'Slug Personalizado' } as any)

      const { data } = mockPrisma.article.create.mock.calls[0][0]
      expect(data.slug).toBe('slug-personalizado')
    })

    it('reintenta con sufijo cuando hay conflicto de slug (P2002)', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['slug'] },
      })
      const created = makeArticle({ slug: 'mi-articulo-de-prueba-1' })
      mockPrisma.article.create.mockRejectedValueOnce(p2002).mockResolvedValueOnce(created)

      const result = await service.create(baseDto as any)

      expect(mockPrisma.article.create).toHaveBeenCalledTimes(2)
      expect(result).toEqual(created)
    })

    it('lanza error descriptivo después de 10 intentos fallidos de slug', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['slug'] },
      })
      mockPrisma.article.create.mockRejectedValue(p2002)

      await expect(service.create(baseDto as any)).rejects.toThrow(
        'No se pudo generar un slug único',
      )
      expect(mockPrisma.article.create).toHaveBeenCalledTimes(10)
    })

    it('propaga otros errores de Prisma sin reintentar', async () => {
      const dbErr = new Error('Connection refused')
      mockPrisma.article.create.mockRejectedValue(dbErr)

      await expect(service.create(baseDto as any)).rejects.toThrow('Connection refused')
      expect(mockPrisma.article.create).toHaveBeenCalledTimes(1)
    })

    it('usa "Reporte Médico" como authorName por defecto', async () => {
      mockPrisma.article.create.mockResolvedValue(makeArticle())

      await service.create(baseDto as any)

      const { data } = mockPrisma.article.create.mock.calls[0][0]
      expect(data.authorName).toBe('Reporte Médico')
    })

    it('usa DRAFT como status por defecto', async () => {
      mockPrisma.article.create.mockResolvedValue(makeArticle({ status: ArticleStatus.DRAFT }))

      await service.create(baseDto as any)

      const { data } = mockPrisma.article.create.mock.calls[0][0]
      expect(data.status).toBe(ArticleStatus.DRAFT)
    })

    it('usa relevance=4 por defecto', async () => {
      mockPrisma.article.create.mockResolvedValue(makeArticle({ relevance: 4 }))

      await service.create(baseDto as any)

      const { data } = mockPrisma.article.create.mock.calls[0][0]
      expect(data.relevance).toBe(4)
    })

    it('crea tags cuando se proveen tagIds', async () => {
      mockPrisma.article.create.mockResolvedValue(makeArticle())

      await service.create({
        ...baseDto,
        tagIds: ['uuid-tag-1', 'uuid-tag-2'],
      } as any)

      const { data } = mockPrisma.article.create.mock.calls[0][0]
      expect(data.tags.create).toEqual([{ tagId: 'uuid-tag-1' }, { tagId: 'uuid-tag-2' }])
    })

    it('crea seoMetadata cuando se provee metaTitle o metaDescription', async () => {
      mockPrisma.article.create.mockResolvedValue(makeArticle())

      await service.create({
        ...baseDto,
        seoMetadata: { metaTitle: 'SEO Title', metaDescription: 'SEO Desc' },
      } as any)

      const { data } = mockPrisma.article.create.mock.calls[0][0]
      expect(data.seoMetadata.create).toEqual({
        metaTitle: 'SEO Title',
        metaDescription: 'SEO Desc',
      })
    })
  })

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update()', () => {
    beforeEach(() => {
      mockPrisma.article.update.mockResolvedValue(makeArticle())
    })

    it('agrega tags nuevos y elimina los removidos (diff)', async () => {
      mockPrisma.articleTag.findMany.mockResolvedValue([
        { tagId: 'tag-1' },
        { tagId: 'tag-2' },
      ])

      // tagIds=[tag-2, tag-3]: se elimina tag-1, se agrega tag-3, tag-2 queda igual
      await service.update('art-1', { tagIds: ['tag-2', 'tag-3'] } as any)

      expect(mockPrisma.articleTag.deleteMany).toHaveBeenCalledWith({
        where: { articleId: 'art-1', tagId: { in: ['tag-1'] } },
      })
      expect(mockPrisma.articleTag.createMany).toHaveBeenCalledWith({
        data: [{ articleId: 'art-1', tagId: 'tag-3' }],
      })
    })

    it('no toca las tags cuando tagIds es undefined', async () => {
      await service.update('art-1', { title: 'Nuevo Título' } as any)

      expect(mockPrisma.articleTag.findMany).not.toHaveBeenCalled()
      expect(mockPrisma.articleTag.deleteMany).not.toHaveBeenCalled()
      expect(mockPrisma.articleTag.createMany).not.toHaveBeenCalled()
    })

    it('no llama a createMany si no hay tags nuevos que agregar', async () => {
      mockPrisma.articleTag.findMany.mockResolvedValue([{ tagId: 'tag-1' }])

      // Misma tag: no hay adiciones, no hay eliminaciones
      await service.update('art-1', { tagIds: ['tag-1'] } as any)

      expect(mockPrisma.articleTag.deleteMany).not.toHaveBeenCalled()
      expect(mockPrisma.articleTag.createMany).not.toHaveBeenCalled()
    })

    it('elimina y recrea las fuentes bibliográficas cuando se proveen', async () => {
      await service.update('art-1', {
        sources: [
          { title: 'Fuente 1', url: 'https://example.com', order: 0 },
          { title: 'Fuente 2', order: 1 },
        ],
      } as any)

      expect(mockPrisma.articleSource.deleteMany).toHaveBeenCalledWith({
        where: { articleId: 'art-1' },
      })
      expect(mockPrisma.articleSource.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ title: 'Fuente 1' })]),
        }),
      )
    })

    it('filtra fuentes sin título al actualizar', async () => {
      await service.update('art-1', {
        sources: [
          { title: 'Válida', order: 0 },
          { title: '', url: 'https://example.com', order: 1 }, // sin título → ignorada
        ],
      } as any)

      const { data } = mockPrisma.articleSource.createMany.mock.calls[0][0]
      expect(data).toHaveLength(1)
      expect(data[0].title).toBe('Válida')
    })

    it('no toca las fuentes cuando sources es undefined', async () => {
      await service.update('art-1', { title: 'Nuevo Título' } as any)

      expect(mockPrisma.articleSource.deleteMany).not.toHaveBeenCalled()
    })
  })

  // ─── setStatus ───────────────────────────────────────────────────────────────

  describe('setStatus()', () => {
    it('establece publishedAt cuando el status es PUBLISHED', async () => {
      mockPrisma.article.update.mockResolvedValue(makeArticle())

      const before = Date.now()
      await service.setStatus('art-1', ArticleStatus.PUBLISHED)
      const after = Date.now()

      const { data } = mockPrisma.article.update.mock.calls[0][0]
      expect(data.status).toBe(ArticleStatus.PUBLISHED)
      const publishedAt = new Date(data.publishedAt).getTime()
      expect(publishedAt).toBeGreaterThanOrEqual(before)
      expect(publishedAt).toBeLessThanOrEqual(after)
    })

    it('NO establece publishedAt para estados distintos de PUBLISHED', async () => {
      mockPrisma.article.update.mockResolvedValue(makeArticle({ status: ArticleStatus.DRAFT }))

      await service.setStatus('art-1', ArticleStatus.DRAFT)

      const { data } = mockPrisma.article.update.mock.calls[0][0]
      expect(data.publishedAt).toBeUndefined()
    })

    it('llama a update con el id correcto', async () => {
      mockPrisma.article.update.mockResolvedValue(makeArticle())

      await service.setStatus('id-especifico-123', ArticleStatus.ARCHIVED)

      expect(mockPrisma.article.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'id-especifico-123' } }),
      )
    })
  })

  // ─── setRelevance ─────────────────────────────────────────────────────────────

  describe('setRelevance()', () => {
    beforeEach(() => {
      mockPrisma.article.update.mockResolvedValue(makeArticle())
      mockPrisma.article.updateMany.mockResolvedValue({ count: 0 })
      mockPrisma.article.count.mockResolvedValue(0)
      mockPrisma.article.findMany.mockResolvedValue([])
    })

    it('relevance=1: degrada al hero anterior a relevance=2', async () => {
      await service.setRelevance('art-1', 1)

      expect(mockPrisma.article.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ relevance: 1, id: { not: 'art-1' } }),
          data: { relevance: 2 },
        }),
      )
    })

    it('relevance=2: degrada los artículos de nivel 2 a nivel 3', async () => {
      await service.setRelevance('art-1', 2)

      expect(mockPrisma.article.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ relevance: 2, id: { not: 'art-1' } }),
          data: { relevance: 3 },
        }),
      )
    })

    it('relevance=3 con límite excedido: los más viejos bajan a nivel 4', async () => {
      // 12 artículos en nivel 3 (límite = 12), al agregar uno más hay overflow de 1
      mockPrisma.article.count.mockResolvedValue(12)
      mockPrisma.article.findMany.mockResolvedValue([{ id: 'art-viejo' }])

      await service.setRelevance('art-1', 3)

      expect(mockPrisma.article.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['art-viejo'] } },
          data: { relevance: 4 },
        }),
      )
    })

    it('no degrada ningún artículo cuando el nivel 3 no está lleno', async () => {
      mockPrisma.article.count.mockResolvedValue(5) // muy por debajo del límite

      await service.setRelevance('art-1', 3)

      // updateMany solo podría haberse llamado para degrades al nivel 4
      // con 5 artículos y límite 12, overflow = 5 - (12-1) = -6 → no hay overflow
      const calls = (mockPrisma.article.updateMany as jest.Mock).mock.calls
      const degradeToFour = calls.filter((c: any[]) => c[0]?.data?.relevance === 4)
      expect(degradeToFour).toHaveLength(0)
    })

    it('siempre actualiza la relevance del artículo destino', async () => {
      await service.setRelevance('art-1', 2)

      expect(mockPrisma.article.update).toHaveBeenCalledWith({
        where: { id: 'art-1' },
        data: { relevance: 2 },
      })
    })
  })

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('elimina el artículo con el id indicado', async () => {
      const deleted = makeArticle()
      mockPrisma.article.delete.mockResolvedValue(deleted)

      const result = await service.remove('art-1')

      expect(mockPrisma.article.delete).toHaveBeenCalledWith({ where: { id: 'art-1' } })
      expect(result).toEqual(deleted)
    })
  })

  // ─── submitPublic ────────────────────────────────────────────────────────────

  describe('submitPublic()', () => {
    const baseDto = {
      title: 'Artículo Médico Profesional Completo',
      content: '<p>Contenido médico extenso de más de cincuenta caracteres para satisfacer validaciones.</p>',
      authorName: 'Dr. García Pérez',
    }

    it('crea un MEDICAL_ARTICLE con status PENDING', async () => {
      const created = makeArticle({ type: ArticleType.MEDICAL_ARTICLE, status: ArticleStatus.PENDING })
      mockPrisma.article.create.mockResolvedValue(created)

      const result = await service.submitPublic(baseDto as any)

      const { data } = mockPrisma.article.create.mock.calls[0][0]
      expect(data.type).toBe(ArticleType.MEDICAL_ARTICLE)
      expect(data.status).toBe(ArticleStatus.PENDING)
      expect(result).toEqual(created)
    })

    it('almacena suggestedSpecialties en el artículo', async () => {
      mockPrisma.article.create.mockResolvedValue(makeArticle())

      await service.submitPublic({
        ...baseDto,
        suggestedSpecialties: ['Cardiología', 'Neurología'],
      } as any)

      const { data } = mockPrisma.article.create.mock.calls[0][0]
      expect(data.suggestedSpecialties).toEqual(['Cardiología', 'Neurología'])
    })

    it('reintenta con sufijo en conflicto de slug (P2002)', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['slug'] },
      })
      const created = makeArticle({ type: ArticleType.MEDICAL_ARTICLE, status: ArticleStatus.PENDING })
      mockPrisma.article.create.mockRejectedValueOnce(p2002).mockResolvedValueOnce(created)

      const result = await service.submitPublic(baseDto as any)

      expect(mockPrisma.article.create).toHaveBeenCalledTimes(2)
      expect(result).toEqual(created)
    })

    it('filtra fuentes sin título antes de guardar', async () => {
      mockPrisma.article.create.mockResolvedValue(makeArticle())

      await service.submitPublic({
        ...baseDto,
        sources: [
          { title: 'Fuente Válida', order: 0 },
          { title: '', url: 'https://example.com' },
        ],
      } as any)

      const { data } = mockPrisma.article.create.mock.calls[0][0]
      expect(data.sources.create).toHaveLength(1)
      expect(data.sources.create[0].title).toBe('Fuente Válida')
    })
  })

  // ─── approveSpecialty ────────────────────────────────────────────────────────

  describe('approveSpecialty()', () => {
    it('usa tag existente (insensible a acentos)', async () => {
      const article = makeArticle({ suggestedSpecialties: ['Cardiología'] })
      const tagExistente = { id: 'tag-cardio', name: 'Cardiologia', slug: 'cardiologia' }

      mockPrisma.article.findUnique.mockResolvedValue(article)
      mockPrisma.tag.findMany.mockResolvedValue([tagExistente])
      mockPrisma.articleTag.upsert.mockResolvedValue({})
      mockPrisma.article.update.mockResolvedValue(article)

      await service.approveSpecialty('art-1', 'Cardiología')

      expect(mockPrisma.tag.create).not.toHaveBeenCalled()
      expect(mockPrisma.articleTag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: { articleId: 'art-1', tagId: 'tag-cardio' } }),
      )
    })

    it('crea un tag nuevo cuando no existe ninguno coincidente', async () => {
      const article = makeArticle({ suggestedSpecialties: ['Geriatría'] })
      const nuevoTag = { id: 'tag-nuevo', name: 'Geriatría', slug: 'geriatria' }

      mockPrisma.article.findUnique.mockResolvedValue(article)
      mockPrisma.tag.findMany.mockResolvedValue([])
      mockPrisma.tag.create.mockResolvedValue(nuevoTag)
      mockPrisma.articleTag.upsert.mockResolvedValue({})
      mockPrisma.article.update.mockResolvedValue(article)

      await service.approveSpecialty('art-1', 'Geriatría')

      expect(mockPrisma.tag.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Geriatría' }) }),
      )
    })

    it('elimina la especialidad de suggestedSpecialties tras aprobar', async () => {
      const article = makeArticle({ suggestedSpecialties: ['Cardiología', 'Neurología'] })
      const tag = { id: 'tag-1', name: 'Cardiología', slug: 'cardiologia' }

      mockPrisma.article.findUnique.mockResolvedValue(article)
      mockPrisma.tag.findMany.mockResolvedValue([tag])
      mockPrisma.articleTag.upsert.mockResolvedValue({})
      mockPrisma.article.update.mockResolvedValue(article)

      await service.approveSpecialty('art-1', 'Cardiología')

      const { data } = mockPrisma.article.update.mock.calls[0][0]
      expect(data.suggestedSpecialties).toEqual(['Neurología'])
    })

    it('lanza NotFoundException si el artículo no existe', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null)

      await expect(service.approveSpecialty('inexistente', 'Cardiología')).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  // ─── rejectSpecialty ─────────────────────────────────────────────────────────

  describe('rejectSpecialty()', () => {
    it('elimina la especialidad de suggestedSpecialties', async () => {
      const article = makeArticle({ suggestedSpecialties: ['Cardiología', 'Neurología'] })
      mockPrisma.article.findUnique.mockResolvedValue(article)
      mockPrisma.article.update.mockResolvedValue(article)

      await service.rejectSpecialty('art-1', 'Cardiología')

      expect(mockPrisma.article.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { suggestedSpecialties: ['Neurología'] } }),
      )
    })

    it('es insensible a mayúsculas/minúsculas al rechazar', async () => {
      const article = makeArticle({ suggestedSpecialties: ['Cardiología', 'Neurología'] })
      mockPrisma.article.findUnique.mockResolvedValue(article)
      mockPrisma.article.update.mockResolvedValue(article)

      await service.rejectSpecialty('art-1', 'cardiología') // minúscula

      const { data } = mockPrisma.article.update.mock.calls[0][0]
      expect(data.suggestedSpecialties).toEqual(['Neurología'])
    })

    it('lanza NotFoundException si el artículo no existe', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null)

      await expect(service.rejectSpecialty('inexistente', 'Cardiología')).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  // ─── findByIdAdmin ────────────────────────────────────────────────────────────

  describe('findByIdAdmin()', () => {
    it('devuelve el artículo por id', async () => {
      const article = makeArticle()
      mockPrisma.article.findUnique.mockResolvedValue(article)

      const result = await service.findByIdAdmin('art-1')

      expect(result).toEqual(article)
      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'art-1' } }),
      )
    })

    it('lanza NotFoundException si no existe', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null)

      await expect(service.findByIdAdmin('inexistente')).rejects.toThrow(NotFoundException)
    })
  })

  // ─── findAllAdmin ─────────────────────────────────────────────────────────────

  describe('findAllAdmin()', () => {
    it('aplica todos los filtros admin correctamente', async () => {
      mockPrisma.article.findMany.mockResolvedValue([])
      mockPrisma.article.count.mockResolvedValue(0)

      await service.findAllAdmin({
        page: 1,
        limit: 10,
        type: 'NEWS',
        status: 'PUBLISHED',
        relevance: 2,
        tag: 'cardiologia',
        search: 'diabetes',
      })

      const { where } = mockPrisma.article.findMany.mock.calls[0][0]
      expect(where.type).toBe('NEWS')
      expect(where.status).toBe('PUBLISHED')
      expect(where.relevance).toBe(2)
      expect(where.tags).toBeDefined()
      expect(where.OR).toHaveLength(2) // title + excerpt
    })

    it('devuelve meta de paginación correcta', async () => {
      mockPrisma.article.findMany.mockResolvedValue([])
      mockPrisma.article.count.mockResolvedValue(45)

      const result = await service.findAllAdmin({ page: 3, limit: 20 })

      expect(result.meta).toEqual({ total: 45, page: 3, limit: 20, totalPages: 3 })
    })

    it('no aplica filtros cuando los parámetros son undefined', async () => {
      mockPrisma.article.findMany.mockResolvedValue([])
      mockPrisma.article.count.mockResolvedValue(0)

      await service.findAllAdmin({})

      const { where } = mockPrisma.article.findMany.mock.calls[0][0]
      expect(where).toEqual({}) // sin filtros
    })
  })
})
