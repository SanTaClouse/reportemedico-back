import { Module } from '@nestjs/common'
import { BioService } from './bio.service'
import { BioController } from './bio.controller'
import { RevalidationModule } from '../revalidation/revalidation.module'

@Module({
  imports: [RevalidationModule],
  controllers: [BioController],
  providers: [BioService],
})
export class BioModule {}
