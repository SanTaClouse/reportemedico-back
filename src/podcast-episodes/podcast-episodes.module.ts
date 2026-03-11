import { Module } from '@nestjs/common'
import { PodcastEpisodesController } from './podcast-episodes.controller'
import { PodcastEpisodesService } from './podcast-episodes.service'

@Module({
  controllers: [PodcastEpisodesController],
  providers: [PodcastEpisodesService],
})
export class PodcastEpisodesModule {}
