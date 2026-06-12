import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import slugify from 'slugify'
import { CreateSpecialtyDto } from './dto/create-specialty.dto'
import { UpdateSpecialtyDto } from './dto/update-specialty.dto'

@Injectable()
export class SpecialtiesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.specialty.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { doctors: true, tags: true } } },
    })
  }

  async findBySlug(slug: string) {
    const specialty = await this.prisma.specialty.findUnique({
      where: { slug },
      include: { tags: { include: { tag: true } } },
    })
    if (!specialty) throw new NotFoundException('Especialidad no encontrada')
    return specialty
  }

  /**
   * Noticias V1 relacionadas con la especialidad vía SpecialtyTag (03 §6):
   * alimentan la ficha del médico y las páginas programáticas.
   */
  async findArticles(slug: string, limit = 4) {
    const specialty = await this.prisma.specialty.findUnique({
      where: { slug },
      include: { tags: { select: { tagId: true } } },
    })
    if (!specialty) throw new NotFoundException('Especialidad no encontrada')
    const tagIds = specialty.tags.map((t) => t.tagId)
    if (!tagIds.length) return []
    return this.prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        tags: { some: { tagId: { in: tagIds } } },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true, title: true, slug: true, excerpt: true,
        featuredImage: true, publishedAt: true, type: true, authorName: true,
      },
    })
  }

  async create(dto: CreateSpecialtyDto) {
    const slug = slugify(dto.name, { lower: true, strict: true, locale: 'es' })
    try {
      return await this.prisma.specialty.create({
        data: { name: dto.name, schemaOrgValue: dto.schemaOrgValue, slug },
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`La especialidad "${dto.name}" ya existe`)
      }
      throw e
    }
  }

  async update(id: string, dto: UpdateSpecialtyDto) {
    const data: { name?: string; schemaOrgValue?: string; slug?: string } = {
      name: dto.name,
      schemaOrgValue: dto.schemaOrgValue,
    }
    if (dto.name) data.slug = slugify(dto.name, { lower: true, strict: true, locale: 'es' })
    try {
      return await this.prisma.specialty.update({ where: { id }, data })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`La especialidad "${dto.name}" ya existe`)
      }
      throw e
    }
  }

  // P3: catálogo con médicos asociados no se elimina — primero reasignar (07 §5)
  async remove(id: string) {
    const specialty = await this.prisma.specialty.findUnique({
      where: { id },
      include: { _count: { select: { doctors: true } } },
    })
    if (!specialty) throw new NotFoundException('Especialidad no encontrada')
    if (specialty._count.doctors > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${specialty._count.doctors} médico(s) tienen esta especialidad. Reasignalos primero.`,
      )
    }
    return this.prisma.specialty.delete({ where: { id } })
  }
}
