import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import slugify from 'slugify'
import { CreateTagDto } from './dto/create-tag.dto'
import { UpdateTagDto } from './dto/update-tag.dto'

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { articles: true } } },
    })
  }

  findBySlug(slug: string) {
    return this.prisma.tag.findUnique({
      where: { slug },
      include: {
        articles: {
          include: { article: true },
          where: { article: { status: 'PUBLISHED' } },
        },
      },
    })
  }

  async checkExists(name: string): Promise<{ exists: boolean; tag: { id: string; name: string; slug: string; description: string | null } | null }> {
    const normalizedInput = this.stripAccents(name)

    // Traer todos los tags y comparar sin acentos en JS
    // (PostgreSQL no tiene unaccent disponible por defecto)
    const allTags = await this.prisma.tag.findMany({
      select: { id: true, name: true, slug: true, description: true },
    })

    const match = allTags.find(
      (t) => this.stripAccents(t.name) === normalizedInput,
    )
    return { exists: !!match, tag: match ?? null }
  }

  /** Quita acentos y pasa a minúsculas para comparación */
  private stripAccents(str: string): string {
    return str
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  }

  async create(dto: CreateTagDto) {
    const slug = slugify(dto.name, { lower: true, strict: true, locale: 'es' })
    try {
      return await this.prisma.tag.create({ data: { name: dto.name, description: dto.description, slug } })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`El tag "${dto.name}" ya existe`)
      }
      throw e
    }
  }

  async update(id: string, dto: UpdateTagDto) {
    const data: { name?: string; description?: string; slug?: string } = {
      name: dto.name,
      description: dto.description,
    }
    if (dto.name) data.slug = slugify(dto.name, { lower: true, strict: true, locale: 'es' })
    try {
      return await this.prisma.tag.update({ where: { id }, data })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`El tag "${dto.name}" ya existe`)
      }
      throw e
    }
  }

  async remove(id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { articles: true } } },
    })
    if (!tag) throw new NotFoundException('Tag no encontrado')
    return this.prisma.tag.delete({ where: { id } })
  }
}
