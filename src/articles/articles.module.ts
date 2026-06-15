import { Module } from '@nestjs/common'
import { ArticlesController } from './articles.controller'
import { ArticlesService } from './articles.service'
import { SubscribersModule } from '../subscribers/subscribers.module'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [SubscribersModule, EmailModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
