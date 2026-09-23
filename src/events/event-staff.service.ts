import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { CreateStaffDto, UpdateStaffDto } from './dto/admin-event.dto'

const select = { id: true, name: true, email: true, isActive: true, createdAt: true } as const

/**
 * Usuarios de puerta (rol SCANNER): entran con el mismo login del panel pero
 * solo ven el escáner. Los crea y desactiva el admin desde /admin/eventos.
 */
@Injectable()
export class EventStaffService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({ where: { role: 'SCANNER' }, orderBy: { createdAt: 'desc' }, select })
  }

  async create(dto: CreateStaffDto) {
    const email = dto.email.trim().toLowerCase()
    const exists = await this.prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (exists) throw new ConflictException('Ya existe un usuario con ese email')
    return this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        password: await bcrypt.hash(dto.password, 10),
        role: 'SCANNER',
      },
      select,
    })
  }

  async update(id: string, dto: UpdateStaffDto) {
    // Solo se tocan usuarios SCANNER: este endpoint nunca puede editar un ADMIN
    const user = await this.prisma.user.findFirst({ where: { id, role: 'SCANNER' }, select: { id: true } })
    if (!user) throw new NotFoundException('Usuario no encontrado')
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.password ? { password: await bcrypt.hash(dto.password, 10) } : {}),
      },
      select,
    })
  }
}
