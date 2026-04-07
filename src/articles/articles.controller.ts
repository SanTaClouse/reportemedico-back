import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { Throttle, SkipThrottle } from '@nestjs/throttler'
import { ArticlesService } from './articles.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { SubmitPublicDto } from './dto/submit-public.dto'
import { SetStatusDto } from './dto/set-status.dto'
import { SetRelevanceDto } from './dto/set-relevance.dto'
import { SpecialtyActionDto } from './dto/specialty-action.dto'
import { AddGalleryImageDto } from './dto/add-gallery-image.dto'
import { ReorderGalleryDto } from './dto/reorder-gallery.dto'

@Controller('articles')
export class ArticlesController {
  constructor(private articlesService: ArticlesService) {}

  // ─── RUTAS PÚBLICAS ───────────────────────────────────

  @Get('home')
  getHome() {
    return this.articlesService.getHome()
  }

  @Get('relevance-counts')
  @UseGuards(JwtAuthGuard)
  getRelevanceCounts() {
    return this.articlesService.getRelevanceCounts()
  }

  @SkipThrottle()
  @Get('pending-specialties')
  @UseGuards(JwtAuthGuard)
  getPendingSpecialties() {
    return this.articlesService.getPendingSpecialties()
  }

  @Get('type/news')
  getNews(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('sort') sort: 'publishedAt_desc' | 'views_desc',
  ) {
    return this.articlesService.findPublished(+page || 1, +limit || 10, 'NEWS', undefined, sort || 'views_desc')
  }

  @Get('type/medical')
  getMedical(@Query('page') page: string, @Query('limit') limit: string) {
    return this.articlesService.findPublished(+page || 1, +limit || 10, 'MEDICAL_ARTICLE')
  }

  @Get('tag/:slug')
  getByTag(
    @Param('slug') slug: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('sort') sort: 'publishedAt_desc' | 'views_desc',
  ) {
    return this.articlesService.findPublished(+page || 1, +limit || 10, undefined, slug, sort || 'publishedAt_desc')
  }

  @Get('search')
  search(
    @Query('q') q: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    if (!q || q.trim().length < 2) {
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
    }
    return this.articlesService.search(q.trim(), +page || 1, +limit || 10)
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

  @SkipThrottle()
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateArticleDto) {
    return this.articlesService.create(dto)
  }

  @SkipThrottle()
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  setStatus(@Param('id') id: string, @Body() dto: SetStatusDto) {
    return this.articlesService.setStatus(id, dto.status)
  }

  @SkipThrottle()
  @Patch(':id/relevance')
  @UseGuards(JwtAuthGuard)
  setRelevance(@Param('id') id: string, @Body() dto: SetRelevanceDto) {
    return this.articlesService.setRelevance(id, dto.relevance)
  }

  @SkipThrottle()
  @Patch(':id/approve-specialty')
  @UseGuards(JwtAuthGuard)
  approveSpecialty(@Param('id') id: string, @Body() dto: SpecialtyActionDto) {
    return this.articlesService.approveSpecialty(id, dto.name)
  }

  @SkipThrottle()
  @Patch(':id/reject-specialty')
  @UseGuards(JwtAuthGuard)
  rejectSpecialty(@Param('id') id: string, @Body() dto: SpecialtyActionDto) {
    return this.articlesService.rejectSpecialty(id, dto.name)
  }

  @SkipThrottle()
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.articlesService.update(id, dto)
  }

  @SkipThrottle()
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.articlesService.remove(id)
  }

  // ─── GALERÍA ──────────────────────────────────────────

  @SkipThrottle()
  @Post(':id/gallery')
  @UseGuards(JwtAuthGuard)
  addGalleryImage(@Param('id') id: string, @Body() dto: AddGalleryImageDto) {
    return this.articlesService.addGalleryImage(id, dto.mediaId, dto.caption, dto.position)
  }

  @SkipThrottle()
  @Delete(':id/gallery/:mediaId')
  @UseGuards(JwtAuthGuard)
  removeGalleryImage(@Param('id') id: string, @Param('mediaId') mediaId: string) {
    return this.articlesService.removeGalleryImage(id, mediaId)
  }

  @SkipThrottle()
  @Patch(':id/gallery/reorder')
  @UseGuards(JwtAuthGuard)
  reorderGallery(@Param('id') id: string, @Body() dto: ReorderGalleryDto) {
    return this.articlesService.reorderGallery(id, dto.items)
  }

  @SkipThrottle()
  @Patch(':id/gallery/:mediaId/caption')
  @UseGuards(JwtAuthGuard)
  updateGalleryCaption(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @Body('caption') caption: string,
  ) {
    return this.articlesService.updateGalleryCaption(id, mediaId, caption)
  }
}
