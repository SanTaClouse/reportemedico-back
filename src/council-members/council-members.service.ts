import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCouncilMemberDto } from './dto/create-council-member.dto'
import { UpdateCouncilMemberDto } from './dto/update-council-member.dto'

@Injectable()
export class CouncilMembersService {
  constructor(private prisma: PrismaService) {}

  findAll(onlyVisible = true) {
    return this.prisma.councilMember.findMany({
      where: onlyVisible ? { isVisible: true } : undefined,
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
  }

  async create(dto: CreateCouncilMemberDto) {
    // Si el nuevo miembro es featured, quitar featured del anterior
    if (dto.isFeatured) {
      await this.prisma.councilMember.updateMany({
        where: { isFeatured: true },
        data: { isFeatured: false },
      })
    }

    return this.prisma.councilMember.create({
      data: {
        name: dto.name,
        role: dto.role,
        photo: dto.photo,
        linkedinUrl: dto.linkedinUrl,
        isFeatured: dto.isFeatured ?? false,
        isVisible: dto.isVisible ?? true,
        order: dto.order ?? 0,
      },
    })
  }

  async update(id: string, dto: UpdateCouncilMemberDto) {
    // Si se marca como featured, quitar featured de los demás
    if (dto.isFeatured) {
      await this.prisma.councilMember.updateMany({
        where: { isFeatured: true, id: { not: id } },
        data: { isFeatured: false },
      })
    }

    return this.prisma.councilMember.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.photo !== undefined && { photo: dto.photo }),
        ...(dto.linkedinUrl !== undefined && { linkedinUrl: dto.linkedinUrl }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    })
  }

  remove(id: string) {
    return this.prisma.councilMember.delete({ where: { id } })
  }
}
