import { Module } from '@nestjs/common'
import { InsurancesController } from './insurances.controller'
import { InsurancesService } from './insurances.service'

@Module({
  controllers: [InsurancesController],
  providers: [InsurancesService],
  exports: [InsurancesService],
})
export class InsurancesModule {}
