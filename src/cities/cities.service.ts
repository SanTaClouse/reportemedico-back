import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import slugify from 'slugify'
import { CreateCityDto } from './dto/create-city.dto'
import { UpdateCityDto } from './dto/update-city.dto'

@Injectable()
export class CitiesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.city.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { clinics: true } } },
    })
  }

  async findBySlug(slug: string) {
    const city = await this.prisma.city.findUnique({
      where: { slug },
      include: { clinics: { orderBy: { name: 'asc' } } },
    })
    if (!city) throw new NotFoundException('Ciudad no encontrada')
    return city
  }

  async create(dto: CreateCityDto) {
    const slug = slugify(dto.name, { lower: true, strict: true, locale: 'es' })
    try {
      return await this.prisma.city.create({ data: { name: dto.name, slug } })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`La ciudad "${dto.name}" ya existe`)
      }
      throw e
    }
  }

  async update(id: string, dto: UpdateCityDto) {
    const data: { name?: string; slug?: string } = { name: dto.name }
    if (dto.name) data.slug = slugify(dto.name, { lower: true, strict: true, locale: 'es' })
    try {
      return await this.prisma.city.update({ where: { id }, data })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`La ciudad "${dto.name}" ya existe`)
      }
      throw e
    }
  }

  // P3: ciudad con clínicas asociadas no se elimina — primero reasignar (07 §5)
  async remove(id: string) {
    const city = await this.prisma.city.findUnique({
      where: { id },
      include: { _count: { select: { clinics: true } } },
    })
    if (!city) throw new NotFoundException('Ciudad no encontrada')
    if (city._count.clinics > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${city._count.clinics} clínica(s) pertenecen a esta ciudad. Reasignalas primero.`,
      )
    }
    return this.prisma.city.delete({ where: { id } })
  }
}
