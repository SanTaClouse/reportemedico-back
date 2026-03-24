import { Module } from '@nestjs/common'
import { AdsService } from './ads.service'
import { AdsController, AdSlotsController } from './ads.controller'

@Module({
  controllers: [AdsController, AdSlotsController],
  providers: [AdsService],
})
export class AdsModule {}
