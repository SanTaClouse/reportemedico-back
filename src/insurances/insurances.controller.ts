import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { InsurancesService } from './insurances.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateInsuranceDto } from './dto/create-insurance.dto'
import { UpdateInsuranceDto } from './dto/update-insurance.dto'

@Controller('insurances')
export class InsurancesController {
  constructor(private insurancesService: InsurancesService) {}

  @Get()
  findAll() {
    return this.insurancesService.findAll()
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.insurancesService.findBySlug(slug)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateInsuranceDto) {
    return this.insurancesService.create(dto)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateInsuranceDto) {
    return this.insurancesService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.insurancesService.remove(id)
  }
}
