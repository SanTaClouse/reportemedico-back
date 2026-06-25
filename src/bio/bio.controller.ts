import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  HttpCode,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { BioService } from './bio.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateBioLinkDto } from './dto/create-bio-link.dto'
import { UpdateBioLinkDto } from './dto/update-bio-link.dto'
import { UpdateBioPageDto } from './dto/update-bio-page.dto'
import { ReorderBioLinksDto } from './dto/reorder-bio-links.dto'
import { TrackBioEventDto } from './dto/track-bio-event.dto'

const DEFAULT_SLUG = 'bio'

function parseDevice(ua?: string): 'mobile' | 'desktop' {
  if (!ua) return 'desktop'
  return /mobile|android|iphone|ipad|ipod|windows phone/i.test(ua) ? 'mobile' : 'desktop'
}

@Controller('bio')
export class BioController {
  constructor(private readonly bio: BioService) {}

  // ─── PÚBLICO ────────────────────────────────────────────

  /** Página + enlaces visibles para renderizar /bio (ISR en el front). */
  @Get('page')
  getPublic(@Query('slug') slug?: string) {
    return this.bio.getPublicPage(slug || DEFAULT_SLUG)
  }

  /** Vista de página (beacon desde el front). Fire-and-forget. */
  @Post('view')
  @HttpCode(204)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async view(@Body() dto: TrackBioEventDto, @Headers('user-agent') ua?: string) {
    await this.bio.registerView(dto.slug || DEFAULT_SLUG, dto.referrer, dto.device ?? parseDevice(ua))
  }

  /** Registra el clic y devuelve la URL destino (lo consume el redirect /r/:id). */
  @Post('links/:id/click')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  click(@Param('id') id: string, @Body() dto: TrackBioEventDto, @Headers('user-agent') ua?: string) {
    return this.bio.registerClickAndGetUrl(id, dto.referrer, dto.device ?? parseDevice(ua))
  }

  // ─── ADMIN ──────────────────────────────────────────────

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  getAdmin(@Query('slug') slug?: string) {
    return this.bio.getAdminPage(slug || DEFAULT_SLUG)
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard)
  stats(@Query('slug') slug?: string, @Query('range') range?: string) {
    const days = Math.min(Math.max(parseInt(range ?? '30', 10) || 30, 1), 365)
    return this.bio.getStats(slug || DEFAULT_SLUG, days)
  }

  @Patch('admin/page')
  @UseGuards(JwtAuthGuard)
  updatePage(@Body() dto: UpdateBioPageDto, @Query('slug') slug?: string) {
    return this.bio.updatePage(slug || DEFAULT_SLUG, dto)
  }

  @Post('admin/links')
  @UseGuards(JwtAuthGuard)
  createLink(@Body() dto: CreateBioLinkDto, @Query('slug') slug?: string) {
    return this.bio.createLink(slug || DEFAULT_SLUG, dto)
  }

  // ⚠️ Debe declararse ANTES de 'admin/links/:id' para que Express no lo capture como :id
  @Patch('admin/links/reorder')
  @UseGuards(JwtAuthGuard)
  reorder(@Body() dto: ReorderBioLinksDto, @Query('slug') slug?: string) {
    return this.bio.reorderLinks(slug || DEFAULT_SLUG, dto.orderedLinkIds)
  }

  @Patch('admin/links/:id')
  @UseGuards(JwtAuthGuard)
  updateLink(@Param('id') id: string, @Body() dto: UpdateBioLinkDto) {
    return this.bio.updateLink(id, dto)
  }

  @Delete('admin/links/:id')
  @UseGuards(JwtAuthGuard)
  removeLink(@Param('id') id: string) {
    return this.bio.removeLink(id)
  }
}
