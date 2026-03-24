/**
 * create-article.dto.spec.ts
 *
 * Valida que los DTOs de artículos rechacen datos inválidos
 * y acepten datos correctos usando class-validator + class-transformer.
 *
 * Cubre: CreateArticleDto, SubmitPublicDto, SetStatusDto, SetRelevanceDto.
 */

// reflect-metadata es necesario para que funcionen los decoradores de
// class-validator / class-transformer en el contexto de tests Jest (sin NestJS bootstrap).
import 'reflect-metadata'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { ArticleType, ArticleStatus } from '@prisma/client'
import { CreateArticleDto } from './create-article.dto'
import { SubmitPublicDto } from './submit-public.dto'
import { SetStatusDto } from './set-status.dto'
import { SetRelevanceDto } from './set-relevance.dto'

// ─── Helpers ──────────────────────────────────────────────────────────────────

import type { ValidationError } from 'class-validator'

/** Extrae recursivamente todos los mensajes de restricción del árbol de errores.
 *  Los errores de objetos / arrays anidados viven en `error.children`, no en
 *  `error.constraints`, así que hay que descender por el árbol completo.
 */
function extractMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((e) => [
    ...Object.values(e.constraints ?? {}),
    ...extractMessages(e.children ?? []),
  ])
}

async function validateDto<T extends object>(
  cls: new () => T,
  plain: Record<string, unknown>,
): Promise<string[]> {
  const instance = plainToInstance(cls, plain)
  const errors = await validate(instance)
  return extractMessages(errors)
}

// ─── CreateArticleDto ─────────────────────────────────────────────────────────

describe('CreateArticleDto', () => {
  const validBase = {
    type: ArticleType.NEWS,
    title: 'Artículo de prueba',
    content: '<p>Contenido del artículo</p>',
  }

  it('acepta un DTO mínimo válido', async () => {
    const errors = await validateDto(CreateArticleDto, validBase)
    expect(errors).toHaveLength(0)
  })

  it('acepta un DTO completo con todos los campos opcionales', async () => {
    const errors = await validateDto(CreateArticleDto, {
      ...validBase,
      slug: 'articulo-de-prueba',
      excerpt: 'Un resumen corto del artículo',
      featuredImage: 'https://example.com/img.jpg',
      authorName: 'Dr. Martínez',
      status: ArticleStatus.PUBLISHED,
      relevance: 2,
      publishedAt: '2024-01-15T10:00:00Z',
      tagIds: ['550e8400-e29b-41d4-a716-446655440000'],
      sources: [{ title: 'Fuente médica', url: 'https://pubmed.ncbi.nlm.nih.gov/1234' }],
      seoMetadata: { metaTitle: 'SEO Title', metaDescription: 'SEO Description' },
    })
    expect(errors).toHaveLength(0)
  })

  it('rechaza cuando falta type', async () => {
    const errors = await validateDto(CreateArticleDto, { title: 'T', content: 'C' })
    expect(errors.some((e) => /type/i.test(e) || /enum/i.test(e))).toBe(true)
  })

  it('rechaza type inválido (no pertenece al enum)', async () => {
    const errors = await validateDto(CreateArticleDto, {
      ...validBase,
      type: 'INVALID_TYPE',
    })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza cuando falta title', async () => {
    const errors = await validateDto(CreateArticleDto, {
      type: ArticleType.NEWS,
      content: '<p>Contenido</p>',
    })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza title vacío (MinLength=1)', async () => {
    const errors = await validateDto(CreateArticleDto, { ...validBase, title: '' })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza title de más de 300 caracteres', async () => {
    const errors = await validateDto(CreateArticleDto, {
      ...validBase,
      title: 'A'.repeat(301),
    })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza content vacío (MinLength=1)', async () => {
    const errors = await validateDto(CreateArticleDto, { ...validBase, content: '' })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza relevance fuera del rango 1-4', async () => {
    const errorsAbove = await validateDto(CreateArticleDto, { ...validBase, relevance: 5 })
    const errorsBelow = await validateDto(CreateArticleDto, { ...validBase, relevance: 0 })
    expect(errorsAbove.length).toBeGreaterThan(0)
    expect(errorsBelow.length).toBeGreaterThan(0)
  })

  it('rechaza relevance no entero', async () => {
    const errors = await validateDto(CreateArticleDto, { ...validBase, relevance: 2.5 })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza tagIds con valores que no son UUID', async () => {
    const errors = await validateDto(CreateArticleDto, {
      ...validBase,
      tagIds: ['no-es-un-uuid'],
    })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza excerpt de más de 600 caracteres', async () => {
    const errors = await validateDto(CreateArticleDto, {
      ...validBase,
      excerpt: 'X'.repeat(601),
    })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza authorName de más de 100 caracteres', async () => {
    const errors = await validateDto(CreateArticleDto, {
      ...validBase,
      authorName: 'A'.repeat(101),
    })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza publishedAt con formato no ISO 8601', async () => {
    const errors = await validateDto(CreateArticleDto, {
      ...validBase,
      publishedAt: '15/01/2024', // formato incorrecto
    })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza seoMetadata.metaTitle de más de 70 caracteres', async () => {
    const errors = await validateDto(CreateArticleDto, {
      ...validBase,
      seoMetadata: { metaTitle: 'T'.repeat(71) },
    })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza seoMetadata.metaDescription de más de 170 caracteres', async () => {
    const errors = await validateDto(CreateArticleDto, {
      ...validBase,
      seoMetadata: { metaDescription: 'D'.repeat(171) },
    })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza sources con título de más de 300 caracteres', async () => {
    const errors = await validateDto(CreateArticleDto, {
      ...validBase,
      sources: [{ title: 'T'.repeat(301) }],
    })
    expect(errors.length).toBeGreaterThan(0)
  })
})

// ─── SubmitPublicDto ──────────────────────────────────────────────────────────

describe('SubmitPublicDto', () => {
  const validBase = {
    title: 'Mi Artículo Médico Profesional',         // >= 10 chars
    content: 'Este es el contenido del artículo médico con más de cincuenta caracteres para cumplir el mínimo.',
    authorName: 'Dr. García',                         // >= 2 chars
  }

  it('acepta un DTO mínimo válido', async () => {
    const errors = await validateDto(SubmitPublicDto, validBase)
    expect(errors).toHaveLength(0)
  })

  it('acepta un DTO completo con todos los campos opcionales', async () => {
    const errors = await validateDto(SubmitPublicDto, {
      ...validBase,
      excerpt: 'Resumen breve del artículo',
      featuredImage: 'https://cloudinary.com/img.jpg',
      tagIds: ['550e8400-e29b-41d4-a716-446655440000'],
      suggestedSpecialties: ['Cardiología', 'Neurología'],
      sources: [{ title: 'PubMed Reference', url: 'https://pubmed.ncbi.nlm.nih.gov/1234', order: 0 }],
    })
    expect(errors).toHaveLength(0)
  })

  it('rechaza title con menos de 10 caracteres', async () => {
    const errors = await validateDto(SubmitPublicDto, { ...validBase, title: 'Corto' })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza title de más de 300 caracteres', async () => {
    const errors = await validateDto(SubmitPublicDto, { ...validBase, title: 'A'.repeat(301) })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza content con menos de 50 caracteres', async () => {
    const errors = await validateDto(SubmitPublicDto, { ...validBase, content: 'Muy corto' })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza authorName con menos de 2 caracteres', async () => {
    const errors = await validateDto(SubmitPublicDto, { ...validBase, authorName: 'X' })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza authorName de más de 100 caracteres', async () => {
    const errors = await validateDto(SubmitPublicDto, { ...validBase, authorName: 'N'.repeat(101) })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza tagIds con valores que no son UUID válidos', async () => {
    const errors = await validateDto(SubmitPublicDto, {
      ...validBase,
      tagIds: ['tag-no-valido'],
    })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza specialties con más de 100 caracteres cada una', async () => {
    const errors = await validateDto(SubmitPublicDto, {
      ...validBase,
      suggestedSpecialties: ['E'.repeat(101)],
    })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza URLs de fuentes inválidas', async () => {
    const errors = await validateDto(SubmitPublicDto, {
      ...validBase,
      sources: [{ title: 'Fuente válida', url: 'no-es-una-url' }],
    })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('acepta fuente sin URL (campo opcional)', async () => {
    const errors = await validateDto(SubmitPublicDto, {
      ...validBase,
      sources: [{ title: 'Fuente sin URL' }],
    })
    expect(errors).toHaveLength(0)
  })
})

// ─── SetStatusDto ─────────────────────────────────────────────────────────────

describe('SetStatusDto', () => {
  it('acepta todos los valores válidos del enum ArticleStatus', async () => {
    for (const status of Object.values(ArticleStatus)) {
      const errors = await validateDto(SetStatusDto, { status })
      expect(errors).toHaveLength(0)
    }
  })

  it('rechaza un status que no existe en el enum', async () => {
    const errors = await validateDto(SetStatusDto, { status: 'ELIMINADO' })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza cuando falta el campo status', async () => {
    const errors = await validateDto(SetStatusDto, {})
    expect(errors.length).toBeGreaterThan(0)
  })
})

// ─── SetRelevanceDto ──────────────────────────────────────────────────────────

describe('SetRelevanceDto', () => {
  it.each([1, 2, 3, 4])('acepta relevance=%i', async (relevance) => {
    const errors = await validateDto(SetRelevanceDto, { relevance })
    expect(errors).toHaveLength(0)
  })

  it('rechaza relevance=0 (fuera del rango mínimo)', async () => {
    const errors = await validateDto(SetRelevanceDto, { relevance: 0 })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza relevance=5 (fuera del rango máximo)', async () => {
    const errors = await validateDto(SetRelevanceDto, { relevance: 5 })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza relevance no entero', async () => {
    const errors = await validateDto(SetRelevanceDto, { relevance: 1.5 })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rechaza cuando falta el campo relevance', async () => {
    const errors = await validateDto(SetRelevanceDto, {})
    expect(errors.length).toBeGreaterThan(0)
  })
})
