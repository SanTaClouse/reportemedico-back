import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreatePodcastEpisodeDto } from './dto/create-podcast-episode.dto'
import { UpdatePodcastEpisodeDto } from './dto/update-podcast-episode.dto'

@Injectable()
export class PodcastEpisodesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.podcastEpisode.findMany({
      where: { isVisible: true },
      orderBy: { order: 'asc' },
    })
  }

  findAllAdmin() {
    return this.prisma.podcastEpisode.findMany({
      orderBy: { order: 'asc' },
    })
  }

  create(dto: CreatePodcastEpisodeDto) {
    return this.prisma.podcastEpisode.create({
      data: {
        title: dto.title,
        description: dto.description,
        youtubeId: dto.youtubeId,
        thumbnailUrl: dto.thumbnailUrl,
        isVisible: dto.isVisible ?? true,
        order: dto.order ?? 0,
      },
    })
  }

  update(id: string, dto: UpdatePodcastEpisodeDto) {
    return this.prisma.podcastEpisode.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        youtubeId: dto.youtubeId,
        thumbnailUrl: dto.thumbnailUrl,
        isVisible: dto.isVisible,
        order: dto.order,
      },
    })
  }

  remove(id: string) {
    return this.prisma.podcastEpisode.delete({ where: { id } })
  }
}
