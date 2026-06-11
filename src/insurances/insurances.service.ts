import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import slugify from 'slugify'
import { CreateInsuranceDto } from './dto/create-insurance.dto'
import { UpdateInsuranceDto } from './dto/update-insurance.dto'

@Injectable()
export class InsurancesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.insurance.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { doctors: true } } },
    })
  }

  async findBySlug(slug: string) {
    const insurance = await this.prisma.insurance.findUnique({ where: { slug } })
    if (!insurance) throw new NotFoundException('Seguro no encontrado')
    return insurance
  }

  async create(dto: CreateInsuranceDto) {
    const slug = slugify(dto.name, { lower: true, strict: true, locale: 'es' })
    try {
      return await this.prisma.insurance.create({ data: { name: dto.name, slug } })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`El seguro "${dto.name}" ya existe`)
      }
      throw e
    }
  }

  async update(id: string, dto: UpdateInsuranceDto) {
    const data: { name?: string; slug?: string } = { name: dto.name }
    if (dto.name) data.slug = slugify(dto.name, { lower: true, strict: true, locale: 'es' })
    try {
      return await this.prisma.insurance.update({ where: { id }, data })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`El seguro "${dto.name}" ya existe`)
      }
      throw e
    }
  }

  // P3: seguro con médicos asociados no se elimina — primero reasignar (07 §5)
  async remove(id: string) {
    const insurance = await this.prisma.insurance.findUnique({
      where: { id },
      include: { _count: { select: { doctors: true } } },
    })
    if (!insurance) throw new NotFoundException('Seguro no encontrado')
    if (insurance._count.doctors > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${insurance._count.doctors} médico(s) aceptan este seguro. Reasignalos primero.`,
      )
    }
    return this.prisma.insurance.delete({ where: { id } })
  }
}
