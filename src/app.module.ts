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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,  // 1 minute
        limit: 10,
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
  ],
})
export class AppModule {}
