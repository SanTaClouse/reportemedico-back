import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { WhatsAppClickDto } from './dto/whatsapp-click.dto'

@Injectable()
export class EngagementService {
  constructor(private prisma: PrismaService) {}

  /** Silencioso ante doctorId inexistente: el clic nunca rompe la navegación del paciente */
  async registerWhatsAppClick(dto: WhatsAppClickDto): Promise<void> {
    try {
      await this.prisma.whatsAppClick.create({
        data: { doctorId: dto.doctorId, source: dto.source },
      })
    } catch {
      // FK inválida u otro error: se ignora a propósito
    }
  }

  /**
   * Registra una sesión del médico logueado (06 §5bis). Si todavía no tiene
   * perfil (Doctor), no hay sesión que registrar. Si la navegación traía un
   * token de email, se atribuye (viaEmail).
   */
  async registerSession(auth0Sub: string, viaEmailToken?: string): Promise<void> {
    const doctor = await this.prisma.doctor.findUnique({ where: { auth0Sub }, select: { id: true } })
    if (!doctor) return
    let viaEmailId: string | undefined
    if (viaEmailToken) {
      const emailLog = await this.prisma.emailLog.findUnique({ where: { token: viaEmailToken }, select: { id: true } })
      viaEmailId = emailLog?.id
    }
    await this.prisma.sessionLog.create({ data: { doctorId: doctor.id, viaEmailId } })
  }
}
