import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { PodcastEpisodesService } from './podcast-episodes.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreatePodcastEpisodeDto } from './dto/create-podcast-episode.dto'
import { UpdatePodcastEpisodeDto } from './dto/update-podcast-episode.dto'

@Controller('podcast-episodes')
export class PodcastEpisodesController {
  constructor(private service: PodcastEpisodesService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('q') q?: string) {
    return this.service.findAll(
      page ? Math.max(1, parseInt(page, 10)) : 1,
      limit ? Math.max(1, Math.min(100, parseInt(limit, 10))) : 100,
      q?.trim() || undefined,
    )
  }

  @SkipThrottle()
  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  findAllAdmin() {
    return this.service.findAllAdmin()
  }

  @SkipThrottle()
  @Post('reorder')
  @UseGuards(JwtAuthGuard)
  async reorder(@Body() body: { items: { id: string; order: number }[] }) {
    await this.service.reorder(body.items)
    return { ok: true }
  }

  @SkipThrottle()
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreatePodcastEpisodeDto) {
    return this.service.create(dto)
  }

  @SkipThrottle()
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdatePodcastEpisodeDto) {
    return this.service.update(id, dto)
  }

  @SkipThrottle()
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}
