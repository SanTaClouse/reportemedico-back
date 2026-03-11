import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { TagsService } from './tags.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateTagDto } from './dto/create-tag.dto'
import { UpdateTagDto } from './dto/update-tag.dto'

@Controller('tags')
export class TagsController {
  constructor(private tagsService: TagsService) {}

  @Get()
  findAll() {
    return this.tagsService.findAll()
  }

  // IMPORTANTE: esta ruta debe ir ANTES de :slug para evitar conflictos
  @Get('check')
  check(@Query('name') name: string) {
    if (!name?.trim()) return { exists: false, tag: null }
    return this.tagsService.checkExists(name.trim())
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.tagsService.findBySlug(slug)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateTagDto) {
    return this.tagsService.create(dto)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.tagsService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.tagsService.remove(id)
  }
}
