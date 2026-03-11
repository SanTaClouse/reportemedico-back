import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { ArticlesModule } from '../articles/articles.module'

@Module({
  imports: [ArticlesModule],
  controllers: [AdminController],
})
export class AdminModule {}
