import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas')
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas')
    }

    const payload = { sub: user.id, role: user.role, name: user.name }
    const token = this.jwt.sign(payload)

    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } }
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    })
  }
}
