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
}
