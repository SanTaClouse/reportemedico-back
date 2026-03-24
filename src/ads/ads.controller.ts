import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common'
import { Response } from 'express'
import { AdsService } from './ads.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateAdDto } from './dto/create-ad.dto'
import { UpdateAdDto } from './dto/update-ad.dto'
import { UpdateAdSlotDto } from './dto/update-ad-slot.dto'
import { ReorderAdsDto } from './dto/reorder-ads.dto'

// ─── AD SLOTS ─────────────────────────────────────────────

@Controller('ad-slots')
export class AdSlotsController {
  constructor(private readonly adsService: AdsService) {}

  /** Admin: lista todos los slots con sus anuncios asignados */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.adsService.findAllSlots()
  }

  /** Admin: reordena los anuncios dentro de un slot */
  @Patch(':slotId/reorder')
  @UseGuards(JwtAuthGuard)
  reorder(@Param('slotId') slotId: string, @Body() dto: ReorderAdsDto) {
    return this.adsService.reorderSlotAds(slotId, dto.orderedAdIds)
  }

  /** Admin: actualiza un slot (displayMode, isActive, description) */
  @Patch(':slotId')
  @UseGuards(JwtAuthGuard)
  updateSlot(@Param('slotId') slotId: string, @Body() dto: UpdateAdSlotDto) {
    return this.adsService.updateSlot(slotId, dto)
  }
}

// ─── ADS ──────────────────────────────────────────────────

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  /** Público: devuelve todos los anuncios activos para un slot (array ordenado) */
  @Get('slot')
  async findBySlot(@Query('name') slotName: string, @Res() res: Response) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    if (!slotName?.trim()) return res.json([])
    const ads = await this.adsService.findActiveBySlot(slotName.trim())
    return res.json(ads)
  }

  /** Admin: lista todos los anuncios */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.adsService.findAll()
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateAdDto) {
    return this.adsService.create(dto)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateAdDto) {
    return this.adsService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.adsService.remove(id)
  }

  /** Público: incrementa el contador de clicks */
  @Patch(':id/click')
  click(@Param('id') id: string) {
    return this.adsService.incrementClicks(id)
  }

  /** Público: incrementa el contador de impresiones */
  @Patch(':id/impression')
  impression(@Param('id') id: string) {
    return this.adsService.incrementImpressions(id)
  }

  /** Admin: asigna un anuncio a un slot (banner) */
  @Post(':adId/slots/:slotId')
  @UseGuards(JwtAuthGuard)
  assignToSlot(@Param('adId') adId: string, @Param('slotId') slotId: string) {
    return this.adsService.assignAdToSlot(adId, slotId)
  }

  /** Admin: quita un anuncio de un slot */
  @Delete(':adId/slots/:slotId')
  @UseGuards(JwtAuthGuard)
  removeFromSlot(@Param('adId') adId: string, @Param('slotId') slotId: string) {
    return this.adsService.removeAdFromSlot(adId, slotId)
  }
}
