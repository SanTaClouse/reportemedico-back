import { Module } from '@nestjs/common'
import { PrintEditionsController } from './print-editions.controller'
import { PrintEditionsService } from './print-editions.service'

@Module({
  controllers: [PrintEditionsController],
  providers: [PrintEditionsService],
})
export class PrintEditionsModule {}
