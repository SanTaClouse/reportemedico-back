import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import slugify from 'slugify'
import { CreateClinicDto } from './dto/create-clinic.dto'
import { UpdateClinicDto } from './dto/update-clinic.dto'

// Bounding box de República Dominicana (07 §5) — caza coordenadas invertidas
// o typos antes de que un pin aparezca en el océano. Advertencia, no bloqueo.
const RD_BOUNDS = { latMin: 17.4, latMax: 20.0, lngMin: -72.1, lngMax: -68.2 }

@Injectable()
export class ClinicsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.clinic.findMany({
      orderBy: { name: 'asc' },
      include: {
        city: true,
        _count: { select: { doctors: true } },
      },
    })
  }

  async findBySlug(slug: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { slug },
      include: { city: true },
    })
    if (!clinic) throw new NotFoundException('Clínica no encontrada')
    return clinic
  }

  async create(dto: CreateClinicDto) {
    const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } })
    if (!city) throw new NotFoundException('Ciudad no encontrada')

    const slug = slugify(dto.name, { lower: true, strict: true, locale: 'es' })
    try {
      const clinic = await this.prisma.clinic.create({
        data: { ...dto, slug },
        include: { city: true },
      })
      return this.withLocationWarning(clinic)
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`La clínica "${dto.name}" ya existe`)
      }
      throw e
    }
  }

  async update(id: string, dto: UpdateClinicDto) {
    if (dto.cityId) {
      const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } })
      if (!city) throw new NotFoundException('Ciudad no encontrada')
    }

    const data: Prisma.ClinicUpdateInput = { ...dto }
    if (dto.name) data.slug = slugify(dto.name, { lower: true, strict: true, locale: 'es' })
    try {
      const clinic = await this.prisma.clinic.update({
        where: { id },
        data,
        include: { city: true },
      })
      return this.withLocationWarning(clinic)
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`La clínica "${dto.name}" ya existe`)
      }
      throw e
    }
  }

  // P3: clínica con médicos asociados no se elimina — primero reasignar (07 §5)
  async remove(id: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: { _count: { select: { doctors: true } } },
    })
    if (!clinic) throw new NotFoundException('Clínica no encontrada')
    if (clinic._count.doctors > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${clinic._count.doctors} médico(s) atienden en esta clínica. Reasígnalos primero.`,
      )
    }
    return this.prisma.clinic.delete({ where: { id } })
  }

  private withLocationWarning<T extends { latitude: number; longitude: number }>(clinic: T) {
    const outOfRd =
      clinic.latitude < RD_BOUNDS.latMin ||
      clinic.latitude > RD_BOUNDS.latMax ||
      clinic.longitude < RD_BOUNDS.lngMin ||
      clinic.longitude > RD_BOUNDS.lngMax
    return outOfRd
      ? { ...clinic, locationWarning: 'Esta ubicación está fuera de República Dominicana' }
      : clinic
  }
}
