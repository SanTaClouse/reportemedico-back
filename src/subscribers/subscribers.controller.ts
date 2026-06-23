import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Logger } from '@nestjs/common'
import { SkipThrottle, Throttle } from '@nestjs/throttler'
import { SubscribersService } from './subscribers.service'
import { CreateSubscriberDto } from './dto/create-subscriber.dto'
import {
  UnsubscribeDto, SendArticleEmailDto, UpdateNewsletterScheduleDto,
} from './dto/newsletter.dto'
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
  newsletterPreview() {
    return this.subscribersService.previewNewsletter()
  }

  /**
   * POST /subscribers/newsletter/send
   * Solo admin. Envía el digest (lo nuevo desde el último envío) a los activos.
   */
  @SkipThrottle()
  @Post('newsletter/send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  sendNewsletter() {
    return this.subscribersService.sendNewsletter({ auto: false })
  }

  /**
   * GET / PUT /subscribers/newsletter/schedule
   * Solo admin. Programación del envío semanal automático.
   */
  @SkipThrottle()
  @Get('newsletter/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getSchedule() {
    return this.subscribersService.getSchedule()
  }

  @SkipThrottle()
  @Put('newsletter/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateSchedule(@Body() dto: UpdateNewsletterScheduleDto) {
    return this.subscribersService.updateSchedule(dto)
  }

  /**
   * GET/POST /subscribers/doctor-digest/...
   * Digest de noticias por especialidad para los médicos (08 §1).
   */
  @SkipThrottle()
  @Get('doctor-digest/preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  doctorDigestPreview() {
    return this.subscribersService.previewDoctorDigest()
  }

  @SkipThrottle()
  @Post('doctor-digest/send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  sendDoctorDigest() {
    return this.subscribersService.sendDoctorDigest({ auto: false })
  }

  /** Opt-out del digest a médicos (público, desde el link del email) */
  @SkipThrottle()
  @Post('doctor-digest/optout')
  doctorDigestOptOut(@Body('d') d: string, @Body('t') t: string) {
    return this.subscribersService.doctorDigestOptOut(d, t)
  }

  /**
   * GET /subscribers/article/:id/audience
   * Solo admin. Interesados (por tema) + lista de activos para selección manual.
   */
  @SkipThrottle()
  @Get('article/:id/audience')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  articleAudience(@Param('id') id: string) {
    return this.subscribersService.articleAudience(id)
  }

  /**
   * POST /subscribers/article/:id/send
   * Solo admin. Envía la noticia a los interesados o a una selección manual.
   */
  @SkipThrottle()
  @Post('article/:id/send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  sendArticleEmail(@Param('id') id: string, @Body() dto: SendArticleEmailDto) {
    return this.subscribersService.sendArticleEmail(id, dto)
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

  /**
   * DELETE /subscribers/:id
   * Solo admin. Elimina un suscriptor (limpieza de duplicados/typos).
   */
  @SkipThrottle()
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  deleteSubscriber(@Param('id') id: string) {
    return this.subscribersService.deleteSubscriber(id)
  }
}
