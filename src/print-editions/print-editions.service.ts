import { Injectable, ConflictException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreatePrintEditionDto } from './dto/create-print-edition.dto'
import { UpdatePrintEditionDto } from './dto/update-print-edition.dto'

@Injectable()
export class PrintEditionsService {
  constructor(private prisma: PrismaService) {}

  findAll(onlyVisible = true) {
    return this.prisma.printEdition.findMany({
      where: onlyVisible ? { isVisible: true } : undefined,
      orderBy: { editionNumber: 'desc' },
    })
  }

  async create(dto: CreatePrintEditionDto) {
    try {
      return await this.prisma.printEdition.create({
        data: {
          editionNumber: dto.editionNumber,
          title: dto.title,
          coverImage: dto.coverImage,
          issuuUrl: dto.issuuUrl,
          publishedAt: new Date(dto.publishedAt),
          isVisible: dto.isVisible ?? true,
        },
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`El número de edición ${dto.editionNumber} ya existe`)
      }
      throw e
    }
  }

  async update(id: string, dto: UpdatePrintEditionDto) {
    try {
      return await this.prisma.printEdition.update({
        where: { id },
        data: {
          ...(dto.editionNumber !== undefined && { editionNumber: dto.editionNumber }),
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
          ...(dto.issuuUrl !== undefined && { issuuUrl: dto.issuuUrl }),
          ...(dto.publishedAt !== undefined && { publishedAt: new Date(dto.publishedAt) }),
          ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
        },
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`El número de edición ${dto.editionNumber} ya existe`)
      }
      throw e
    }
  }

  remove(id: string) {
    return this.prisma.printEdition.delete({ where: { id } })
  }
}
