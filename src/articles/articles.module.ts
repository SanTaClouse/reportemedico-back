import { Module } from '@nestjs/common'
import { ArticlesController } from './articles.controller'
import { ArticlesService } from './articles.service'
import { SubscribersModule } from '../subscribers/subscribers.module'

@Module({
  imports: [SubscribersModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
