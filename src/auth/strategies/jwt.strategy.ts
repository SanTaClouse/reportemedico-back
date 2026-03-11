import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { Request } from 'express'

interface JwtPayload {
  sub: string
  role: string
  name: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Cookie httpOnly rm_token (Next.js SSR / middleware)
        (req: Request) => (req?.cookies as Record<string, string> | undefined)?.rm_token ?? null,
        // 2. Authorization: Bearer <token> (fetch desde el cliente)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    })
  }

  async validate(payload: JwtPayload) {
    return { sub: payload.sub, role: payload.role, name: payload.name }
  }
}
