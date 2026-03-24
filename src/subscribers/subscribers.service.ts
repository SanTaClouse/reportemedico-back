import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateSubscriberDto } from './dto/create-subscriber.dto'

@Injectable()
export class SubscribersService {
  private readonly logger = new Logger(SubscribersService.name)

  constructor(private prisma: PrismaService) {}

  async subscribeNewsletter(dto: CreateSubscriberDto) {
    this.logger.log(`[subscribe] email=${dto.email} name=${dto.name ?? '(sin nombre)'}`)
    try {
      const result = await this.prisma.subscriber.upsert({
        where: { email: dto.email },
        create: { email: dto.email, name: dto.name, source: 'NEWSLETTER_SIGNUP' },
        update: { name: dto.name ?? undefined },
      })
      this.logger.log(`[subscribe] ✓ Guardado id=${result.id} source=${result.source}`)
      return result
    } catch (err) {
      this.logger.error(`[subscribe] ✗ Error Prisma: ${(err as Error).message}`)
      throw err
    }
  }

  async subscribeFromArticle(email: string, name: string, tagIds: string[]) {
    const subscriber = await this.prisma.subscriber.upsert({
      where: { email },
      create: { email, name, source: 'ARTICLE_SUBMISSION' },
      update: { name },
    })

    if (tagIds.length > 0) {
      await Promise.allSettled(
        tagIds.map((tagId) =>
          this.prisma.subscriberTag.upsert({
            where: { subscriberId_tagId: { subscriberId: subscriber.id, tagId } },
            create: { subscriberId: subscriber.id, tagId },
            update: {},
          }),
        ),
      )
    }

    return subscriber
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.prisma.subscriber.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { tags: { include: { tag: true } } },
      }),
      this.prisma.subscriber.count(),
    ])
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async getStats() {
    const [total, fromArticles, fromNewsletter] = await Promise.all([
      this.prisma.subscriber.count(),
      this.prisma.subscriber.count({ where: { source: 'ARTICLE_SUBMISSION' } }),
      this.prisma.subscriber.count({ where: { source: 'NEWSLETTER_SIGNUP' } }),
    ])
    return { total, fromArticles, fromNewsletter }
  }
}
