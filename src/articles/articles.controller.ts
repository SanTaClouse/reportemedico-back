import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ArticlesService } from './articles.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { SubmitPublicDto } from './dto/submit-public.dto'
import { SetStatusDto } from './dto/set-status.dto'
import { SetRelevanceDto } from './dto/set-relevance.dto'
import { SpecialtyActionDto } from './dto/specialty-action.dto'

@Controller('articles')
export class ArticlesController {
  constructor(private articlesService: ArticlesService) {}

  // ─── RUTAS PÚBLICAS ───────────────────────────────────

  @Get('home')
  getHome() {
    return this.articlesService.getHome()
  }

  @Get('type/news')
  getNews(@Query('page') page: string, @Query('limit') limit: string) {
    return this.articlesService.findPublished(+page || 1, +limit || 10, 'NEWS')
  }

  @Get('type/medical')
  getMedical(@Query('page') page: string, @Query('limit') limit: string) {
    return this.articlesService.findPublished(+page || 1, +limit || 10, 'MEDICAL_ARTICLE')
  }

  @Get('tag/:slug')
  getByTag(@Param('slug') slug: string, @Query('page') page: string) {
    return this.articlesService.findPublished(+page || 1, 10, undefined, slug)
  }

  @Get()
  findAll(@Query('page') page: string, @Query('limit') limit: string) {
    return this.articlesService.findPublished(+page || 1, +limit || 10)
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.articlesService.findBySlug(slug)
  }

  @Post(':slug/view')
  incrementView(@Param('slug') slug: string) {
    return this.articlesService.incrementViews(slug)
  }

  @Post('submit')
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 envíos / hora
  submitPublic(@Body() dto: SubmitPublicDto) {
    return this.articlesService.submitPublic(dto)
  }

  // ─── RUTAS ADMIN ──────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateArticleDto) {
    return this.articlesService.create(dto)
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  setStatus(@Param('id') id: string, @Body() dto: SetStatusDto) {
    return this.articlesService.setStatus(id, dto.status)
  }

  @Patch(':id/relevance')
  @UseGuards(JwtAuthGuard)
  setRelevance(@Param('id') id: string, @Body() dto: SetRelevanceDto) {
    return this.articlesService.setRelevance(id, dto.relevance)
  }

  @Patch(':id/approve-specialty')
  @UseGuards(JwtAuthGuard)
  approveSpecialty(@Param('id') id: string, @Body() dto: SpecialtyActionDto) {
    return this.articlesService.approveSpecialty(id, dto.name)
  }

  @Patch(':id/reject-specialty')
  @UseGuards(JwtAuthGuard)
  rejectSpecialty(@Param('id') id: string, @Body() dto: SpecialtyActionDto) {
    return this.articlesService.rejectSpecialty(id, dto.name)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.articlesService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.articlesService.remove(id)
  }
}
