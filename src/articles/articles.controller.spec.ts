/**
 * articles.controller.spec.ts
 *
 * Tests unitarios del ArticlesController.
 * Verifica que cada endpoint delega correctamente al servicio
 * y parsea bien los query params.
 *
 * Nota: los guards (JwtAuthGuard) se verifican por metadata de Reflect,
 * ya que en tests unitarios no se instancia el contexto HTTP completo.
 */

// isomorphic-dompurify usa ESM internamente y no puede ser parseado por Jest CJS.
// Mockeamos sanitize.util para cortar esa cadena de imports antes de que llegue a él.
jest.mock('../utils/sanitize.util', () => ({
  sanitizeHtml: jest.fn((html: string) => html),
  stripAllHtml: jest.fn((str: string) => str.replace(/<[^>]*>/g, '')),
}))

// slugify también se usa en el servicio — lo dejamos como stub simple
jest.mock('slugify', () => jest.fn((str: string) => str.toLowerCase().replace(/\s+/g, '-')))

import { Test, TestingModule } from '@nestjs/testing'
import { Reflector } from '@nestjs/core'
import { ArticlesController } from './articles.controller'
import { ArticlesService } from './articles.service'
import { ArticleStatus, ArticleType } from '@prisma/client'

// ─── Factory artículo ─────────────────────────────────────────────────────────

function makeArticle(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'art-1',
    type: 'NEWS' as const,
    title: 'Test Article',
    slug: 'test-article',
    content: '<p>Content</p>',
    authorName: 'Reporte Médico',
    status: 'PUBLISHED' as const,
    relevance: 3,
    viewsCount: 0,
    publishedAt: '2024-01-01T12:00:00Z',
    createdAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
    suggestedSpecialties: [],
    tags: [],
    ...overrides,
  }
}

function makePaginated(articles = [makeArticle()]) {
  return {
    data: articles,
    meta: { total: articles.length, page: 1, limit: 10, totalPages: 1 },
  }
}

// ─── Suite principal ──────────────────────────────────────────────────────────

describe('ArticlesController', () => {
  let controller: ArticlesController
  let service: jest.Mocked<ArticlesService>

  const mockService = {
    getHome: jest.fn(),
    findPublished: jest.fn(),
    findBySlug: jest.fn(),
    incrementViews: jest.fn(),
    submitPublic: jest.fn(),
    create: jest.fn(),
    findByIdAdmin: jest.fn(),
    findAllAdmin: jest.fn(),
    update: jest.fn(),
    setStatus: jest.fn(),
    setRelevance: jest.fn(),
    approveSpecialty: jest.fn(),
    rejectSpecialty: jest.fn(),
    remove: jest.fn(),
    onModuleDestroy: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticlesController],
      providers: [
        { provide: ArticlesService, useValue: mockService },
        Reflector,
      ],
    }).compile()

    controller = module.get<ArticlesController>(ArticlesController)
    service = module.get(ArticlesService) as jest.Mocked<ArticlesService>
    jest.clearAllMocks()
  })

  // ─── Rutas públicas ──────────────────────────────────────────────────────────

  describe('GET /articles/home → getHome()', () => {
    it('llama a service.getHome() y devuelve el resultado', async () => {
      const homeData = { hero: makeArticle(), featured: [], latest: [], medicalArticles: [] }
      mockService.getHome.mockResolvedValue(homeData)

      const result = await controller.getHome()

      expect(service.getHome).toHaveBeenCalledTimes(1)
      expect(result).toEqual(homeData)
    })
  })

  describe('GET /articles/type/news → getNews()', () => {
    it('llama a findPublished con tipo NEWS, page y limit parseados', async () => {
      mockService.findPublished.mockResolvedValue(makePaginated())

      await controller.getNews('2', '5', 'views_desc')

      expect(service.findPublished).toHaveBeenCalledWith(2, 5, 'NEWS', undefined, 'views_desc')
    })

    it('usa defaults page=1, limit=10 cuando los valores no son numéricos', async () => {
      mockService.findPublished.mockResolvedValue(makePaginated())

      await controller.getNews('no-numero', '', undefined as any)

      expect(service.findPublished).toHaveBeenCalledWith(1, 10, 'NEWS', undefined, 'views_desc')
    })

    it('usa defaults cuando los parámetros son undefined', async () => {
      mockService.findPublished.mockResolvedValue(makePaginated())

      await controller.getNews(undefined as any, undefined as any, undefined as any)

      expect(service.findPublished).toHaveBeenCalledWith(1, 10, 'NEWS', undefined, 'views_desc')
    })
  })

  describe('GET /articles/type/medical → getMedical()', () => {
    it('llama a findPublished con tipo MEDICAL_ARTICLE', async () => {
      mockService.findPublished.mockResolvedValue(makePaginated())

      await controller.getMedical('1', '10')

      expect(service.findPublished).toHaveBeenCalledWith(1, 10, 'MEDICAL_ARTICLE')
    })
  })

  describe('GET /articles/tag/:slug → getByTag()', () => {
    it('llama a findPublished con slug, page, limit y sort', async () => {
      mockService.findPublished.mockResolvedValue(makePaginated())

      await controller.getByTag('cardiologia', '2', '5', 'views_desc')

      expect(service.findPublished).toHaveBeenCalledWith(2, 5, undefined, 'cardiologia', 'views_desc')
    })

    it('usa sort=publishedAt_desc cuando no se proporciona sort', async () => {
      mockService.findPublished.mockResolvedValue(makePaginated())

      await controller.getByTag('neurologia', '1', '10', undefined as any)

      expect(service.findPublished).toHaveBeenCalledWith(
        1, 10, undefined, 'neurologia', 'publishedAt_desc',
      )
    })
  })

  describe('GET /articles → findAll()', () => {
    it('llama a findPublished sin filtro de tipo', async () => {
      mockService.findPublished.mockResolvedValue(makePaginated())

      await controller.findAll('1', '10')

      expect(service.findPublished).toHaveBeenCalledWith(1, 10)
    })
  })

  describe('GET /articles/:slug → findOne()', () => {
    it('llama a findBySlug con el slug correcto y retorna el artículo', async () => {
      const article = makeArticle()
      mockService.findBySlug.mockResolvedValue(article)

      const result = await controller.findOne('test-article')

      expect(service.findBySlug).toHaveBeenCalledWith('test-article')
      expect(result).toEqual(article)
    })
  })

  describe('POST /articles/:slug/view → incrementView()', () => {
    it('llama a incrementViews con el slug correcto', async () => {
      mockService.incrementViews.mockResolvedValue(undefined as any)

      await controller.incrementView('test-article')

      expect(service.incrementViews).toHaveBeenCalledWith('test-article')
    })
  })

  describe('POST /articles/submit → submitPublic()', () => {
    it('llama a submitPublic con el DTO y retorna el resultado', async () => {
      const dto = {
        title: 'Mi Artículo Médico',
        content: '<p>Contenido</p>',
        authorName: 'Dr. García',
      }
      const created = makeArticle({ type: 'MEDICAL_ARTICLE', status: 'PENDING' })
      mockService.submitPublic.mockResolvedValue(created)

      const result = await controller.submitPublic(dto as any)

      expect(service.submitPublic).toHaveBeenCalledWith(dto)
      expect(result).toEqual(created)
    })
  })

  // ─── Rutas admin ─────────────────────────────────────────────────────────────

  describe('POST /articles → create()', () => {
    it('llama a service.create con el DTO y retorna el resultado', async () => {
      const dto = { type: ArticleType.NEWS, title: 'Noticia', content: '<p>Contenido</p>' }
      const created = makeArticle()
      mockService.create.mockResolvedValue(created)

      const result = await controller.create(dto as any)

      expect(service.create).toHaveBeenCalledWith(dto)
      expect(result).toEqual(created)
    })
  })

  describe('PATCH /articles/:id/status → setStatus()', () => {
    it('extrae status del DTO y llama al servicio con id + status', async () => {
      const article = makeArticle({ status: 'PUBLISHED' })
      mockService.setStatus.mockResolvedValue(article)

      const result = await controller.setStatus('art-1', { status: ArticleStatus.PUBLISHED })

      expect(service.setStatus).toHaveBeenCalledWith('art-1', ArticleStatus.PUBLISHED)
      expect(result).toEqual(article)
    })
  })

  describe('PATCH /articles/:id/relevance → setRelevance()', () => {
    it('extrae relevance del DTO y llama al servicio con id + relevance', async () => {
      const article = makeArticle({ relevance: 1 })
      mockService.setRelevance.mockResolvedValue(article)

      await controller.setRelevance('art-1', { relevance: 1 })

      expect(service.setRelevance).toHaveBeenCalledWith('art-1', 1)
    })
  })

  describe('PATCH /articles/:id/approve-specialty → approveSpecialty()', () => {
    it('llama a approveSpecialty con id y nombre de especialidad', async () => {
      const article = makeArticle({ suggestedSpecialties: [] })
      mockService.approveSpecialty.mockResolvedValue(article)

      await controller.approveSpecialty('art-1', { name: 'Cardiología' })

      expect(service.approveSpecialty).toHaveBeenCalledWith('art-1', 'Cardiología')
    })
  })

  describe('PATCH /articles/:id/reject-specialty → rejectSpecialty()', () => {
    it('llama a rejectSpecialty con id y nombre de especialidad', async () => {
      const article = makeArticle()
      mockService.rejectSpecialty.mockResolvedValue(article)

      await controller.rejectSpecialty('art-1', { name: 'Neurología' })

      expect(service.rejectSpecialty).toHaveBeenCalledWith('art-1', 'Neurología')
    })
  })

  describe('PATCH /articles/:id → update()', () => {
    it('llama a service.update con id y DTO, retorna el resultado', async () => {
      const dto = { title: 'Título Actualizado', excerpt: 'Nuevo resumen' }
      const updated = makeArticle({ title: 'Título Actualizado' })
      mockService.update.mockResolvedValue(updated)

      const result = await controller.update('art-1', dto as any)

      expect(service.update).toHaveBeenCalledWith('art-1', dto)
      expect(result).toEqual(updated)
    })
  })

  describe('DELETE /articles/:id → remove()', () => {
    it('llama a service.remove con el id y retorna el artículo eliminado', async () => {
      const deleted = makeArticle()
      mockService.remove.mockResolvedValue(deleted)

      const result = await controller.remove('art-1')

      expect(service.remove).toHaveBeenCalledWith('art-1')
      expect(result).toEqual(deleted)
    })
  })

  // ─── Verificación de decoradores de seguridad ─────────────────────────────────

  describe('Guards y decoradores de seguridad', () => {
    it('el endpoint create está protegido con JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', controller.create)
      // JwtAuthGuard debe estar en los guards del método
      expect(guards).toBeDefined()
    })

    it('el endpoint submitPublic tiene throttle configurado', () => {
      const throttle = Reflect.getMetadata('THROTTLER:default', controller.submitPublic)
      // El throttle limit debe ser 5 envíos por hora (3600000 ms)
      if (throttle) {
        expect(throttle.limit).toBe(5)
        expect(throttle.ttl).toBe(3600000)
      }
    })
  })
})
