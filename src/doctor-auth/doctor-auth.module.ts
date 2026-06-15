import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { Auth0Strategy } from './auth0.strategy'
import { DoctorAuthController } from './doctor-auth.controller'

@Module({
  imports: [PassportModule],
  controllers: [DoctorAuthController],
  providers: [Auth0Strategy],
  exports: [Auth0Strategy],
})
export class DoctorAuthModule {}
