import { Controller, Post, Body, HttpCode, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { EngagementService } from './engagement.service'
import { WhatsAppClickDto } from './dto/whatsapp-click.dto'
import { DoctorAuthGuard } from '../doctor-auth/doctor-auth.guard'
import { Auth0User } from '../doctor-auth/current-doctor.decorator'
import type { Auth0Payload } from '../doctor-auth/auth0.strategy'

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

  /** Registra una sesión del médico logueado (lo llama el callback de Auth0). */
  @Post('session')
  @HttpCode(204)
  @UseGuards(DoctorAuthGuard)
  async session(@Auth0User() user: Auth0Payload, @Body('viaEmailToken') viaEmailToken?: string) {
    await this.engagementService.registerSession(user.sub, viaEmailToken)
  }
}
