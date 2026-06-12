import { Controller, Post, Body, HttpCode } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { EngagementService } from './engagement.service'
import { WhatsAppClickDto } from './dto/whatsapp-click.dto'

@Controller('engagement')
export class EngagementController {
  constructor(private engagementService: EngagementService) {}

  /**
   * Clic en el botón de WhatsApp de un médico (fire-and-forget desde el front).
   * Público con throttling agresivo — es la métrica de valor del directorio (P5).
   */
  @Post('whatsapp-click')
  @HttpCode(204)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async whatsappClick(@Body() dto: WhatsAppClickDto) {
    await this.engagementService.registerWhatsAppClick(dto)
  }
}
