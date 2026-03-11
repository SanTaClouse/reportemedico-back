import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { PodcastEpisodesService } from './podcast-episodes.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreatePodcastEpisodeDto } from './dto/create-podcast-episode.dto'
import { UpdatePodcastEpisodeDto } from './dto/update-podcast-episode.dto'

@Controller('podcast-episodes')
export class PodcastEpisodesController {
  constructor(private service: PodcastEpisodesService) {}

  @Get()
  findAll() {
    return this.service.findAll()
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  findAllAdmin() {
    return this.service.findAllAdmin()
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreatePodcastEpisodeDto) {
    return this.service.create(dto)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdatePodcastEpisodeDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}
