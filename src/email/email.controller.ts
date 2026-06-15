import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { IsEmail } from 'class-validator'
import { SkipThrottle } from '@nestjs/throttler'
import { EmailService } from './email.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

class TestEmailDto {
  @IsEmail()
  to!: string
}

/** Diagnóstico de email — solo admin. Sirve para validar la config de Brevo. */
@SkipThrottle()
@Controller('email')
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(private emailService: EmailService) {}

  /** Verifica conexión/credenciales SMTP sin enviar nada */
  @Get('verify')
  verify() {
    return this.emailService.verifyConnection()
  }

  /** Envía un correo de prueba a la dirección indicada */
  @Post('test')
  async test(@Body() dto: TestEmailDto) {
    const sent = await this.emailService.sendTest(dto.to)
    return { sent, to: dto.to }
  }
}
