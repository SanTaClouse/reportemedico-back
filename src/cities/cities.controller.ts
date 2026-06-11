import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { CitiesService } from './cities.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateCityDto } from './dto/create-city.dto'
import { UpdateCityDto } from './dto/update-city.dto'

@Controller('cities')
export class CitiesController {
  constructor(private citiesService: CitiesService) {}

  @Get()
  findAll() {
    return this.citiesService.findAll()
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.citiesService.findBySlug(slug)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateCityDto) {
    return this.citiesService.create(dto)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.citiesService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.citiesService.remove(id)
  }
}
