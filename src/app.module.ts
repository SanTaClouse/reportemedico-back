import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { ArticlesModule } from './articles/articles.module'
import { TagsModule } from './tags/tags.module'
import { MediaModule } from './media/media.module'
import { PrintEditionsModule } from './print-editions/print-editions.module'
import { PodcastEpisodesModule } from './podcast-episodes/podcast-episodes.module'
import { AdminModule } from './admin/admin.module'
import { CouncilMembersModule } from './council-members/council-members.module'
import { AdsModule } from './ads/ads.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,   // ventana de 1 minuto
        limit: 120,   // 120 req/min por IP para rutas públicas (~2 req/seg)
      },
    ]),
    PrismaModule,
    AuthModule,
    ArticlesModule,
    TagsModule,
    MediaModule,
    PrintEditionsModule,
    PodcastEpisodesModule,
    AdminModule,
    CouncilMembersModule,
    AdsModule,
  ],
})
export class AppModule {}
