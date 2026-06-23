import { Controller, Get, Post, Body, Query, UseGuards, Logger } from '@nestjs/common'
import { SkipThrottle, Throttle } from '@nestjs/throttler'
import { SubscribersService } from './subscribers.service'
import { CreateSubscriberDto } from './dto/create-subscriber.dto'
import { SendNewsletterDto, UnsubscribeDto } from './dto/newsletter.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'

@Controller('subscribers')
export class SubscribersController {
  private readonly logger = new Logger(SubscribersController.name)

  constructor(private subscribersService: SubscribersService) {}

  /**
   * POST /subscribers
   * Suscripción pública al newsletter.
   * Throttled: 10 suscripciones por hora por IP.
   */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  subscribe(@Body() dto: CreateSubscriberDto) {
    this.logger.log(`[POST /subscribers] Recibido → email=${dto.email}`)
    return this.subscribersService.subscribeNewsletter(dto)
  }

  /**
   * POST /subscribers/unsubscribe  (público)
   * Baja del digest desde el link del email (id + token HMAC).
   */
  @Post('unsubscribe')
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.subscribersService.unsubscribe(dto.s, dto.t)
  }

  /**
   * GET /subscribers/stats
   * Solo admin. Devuelve totales por fuente.
   */
  @SkipThrottle()
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getStats() {
    return this.subscribersService.getStats()
  }

  /**
   * GET /subscribers/newsletter/preview
   * Solo admin. Artículos que entrarían en el digest + cantidad de destinatarios.
   */
  @SkipThrottle()
  @Get('newsletter/preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  newsletterPreview(@Query('days') days?: string, @Query('limit') limit?: string) {
    return this.subscribersService.previewNewsletter(
      days ? +days : undefined,
      limit ? +limit : undefined,
    )
  }

  /**
   * POST /subscribers/newsletter/send
   * Solo admin. Envía el digest a todos los suscriptores activos.
   */
  @SkipThrottle()
  @Post('newsletter/send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  sendNewsletter(@Body() dto: SendNewsletterDto) {
    return this.subscribersService.sendNewsletter(dto.days, dto.limit)
  }

  /**
   * GET /subscribers?page=1&limit=20
   * Solo admin. Lista paginada de suscriptores.
   */
  @SkipThrottle()
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll(@Query('page') page: string, @Query('limit') limit: string) {
    return this.subscribersService.findAll(+page || 1, +limit || 20)
  }
}
