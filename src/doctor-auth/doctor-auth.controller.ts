import { Controller, Get, UseGuards } from '@nestjs/common'
import { DoctorAuthGuard } from './doctor-auth.guard'
import { Auth0User } from './current-doctor.decorator'
import type { Auth0Payload } from './auth0.strategy'

@Controller('doctor-auth')
export class DoctorAuthController {
  /**
   * Diagnóstico / ping autenticado: confirma que el backend valida el access
   * token de Auth0. Devuelve la identidad del token (no datos del Doctor todavía).
   */
  @Get('me')
  @UseGuards(DoctorAuthGuard)
  me(@Auth0User() user: Auth0Payload) {
    return { sub: user.sub, email: user.email ?? null, emailVerified: user.emailVerified ?? null }
  }
}
