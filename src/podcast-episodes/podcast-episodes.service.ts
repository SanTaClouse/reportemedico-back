import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreatePodcastEpisodeDto } from './dto/create-podcast-episode.dto'
import { UpdatePodcastEpisodeDto } from './dto/update-podcast-episode.dto'

@Injectable()
export class PodcastEpisodesService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 100, q?: string) {
    const where: Prisma.PodcastEpisodeWhereInput = {
      isVisible: true,
      ...(q ? { title: { contains: q, mode: Prisma.QueryMode.insensitive } } : {}),
    }
    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.prisma.podcastEpisode.findMany({ where, orderBy: { order: 'asc' }, skip, take: limit }),
      this.prisma.podcastEpisode.count({ where }),
    ])
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
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

  async update(id: string, dto: UpdatePodcastEpisodeDto) {
    try {
      return await this.prisma.podcastEpisode.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.youtubeId !== undefined && { youtubeId: dto.youtubeId }),
          ...(dto.thumbnailUrl !== undefined && { thumbnailUrl: dto.thumbnailUrl }),
          ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
          ...(dto.order !== undefined && { order: dto.order }),
        },
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException(`Episodio ${id} no encontrado`)
      }
      throw e
    }
  }

  async reorder(items: { id: string; order: number }[]) {
    await Promise.all(
      items.map(({ id, order }) =>
        this.prisma.podcastEpisode.update({ where: { id }, data: { order } }),
      ),
    )
  }

  async remove(id: string) {
    try {
      return await this.prisma.podcastEpisode.delete({ where: { id } })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException(`Episodio ${id} no encontrado`)
      }
      throw e
    }
  }
}
