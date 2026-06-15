import { Module } from '@nestjs/common'
import { DoctorsController } from './doctors.controller'
import { DoctorsService } from './doctors.service'
import { RevalidationModule } from '../revalidation/revalidation.module'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [RevalidationModule, EmailModule],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
