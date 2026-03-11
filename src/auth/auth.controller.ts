import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { LoginDto } from './dto/login.dto'

interface JwtRequest {
  user: { sub: string; role: string; name: string }
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 intentos / 15 min
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req: JwtRequest) {
    return this.authService.getMe(req.user.sub)
  }
}
