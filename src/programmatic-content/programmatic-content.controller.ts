import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common'
import { ProgrammaticContentService } from './programmatic-content.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UpsertIntroDto } from './dto/upsert-intro.dto'

@Controller('programmatic-content')
export class ProgrammaticContentController {
  constructor(private service: ProgrammaticContentService) {}

  // Público: texto editorial de una combinación (lo consume la página esp × ciudad)
  @Get(':specialtySlug/:citySlug')
  getIntro(
    @Param('specialtySlug') specialtySlug: string,
    @Param('citySlug') citySlug: string,
  ) {
    return this.service.getIntro(specialtySlug, citySlug)
  }

  // Admin: lista de combinaciones indexables con conteo + introText
  @Get()
  @UseGuards(JwtAuthGuard)
  list() {
    return this.service.listEditable()
  }

  // Admin: upsert (introText vacío = borrar)
  @Put()
  @UseGuards(JwtAuthGuard)
  upsert(@Body() dto: UpsertIntroDto) {
    return this.service.upsertIntro(dto.specialtyId, dto.cityId, dto.introText)
  }
}
