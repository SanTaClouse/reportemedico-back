import { Module } from '@nestjs/common'
import { ProgrammaticContentController } from './programmatic-content.controller'
import { ProgrammaticContentService } from './programmatic-content.service'

@Module({
  controllers: [ProgrammaticContentController],
  providers: [ProgrammaticContentService],
})
export class ProgrammaticContentModule {}
