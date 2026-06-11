import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { ClinicsService } from './clinics.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateClinicDto } from './dto/create-clinic.dto'
import { UpdateClinicDto } from './dto/update-clinic.dto'

@Controller('clinics')
export class ClinicsController {
  constructor(private clinicsService: ClinicsService) {}

  @Get()
  findAll() {
    return this.clinicsService.findAll()
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.clinicsService.findBySlug(slug)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateClinicDto) {
    return this.clinicsService.create(dto)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateClinicDto) {
    return this.clinicsService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.clinicsService.remove(id)
  }
}
