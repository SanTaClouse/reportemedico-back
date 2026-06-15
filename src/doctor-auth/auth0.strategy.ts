import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { passportJwtSecret } from 'jwks-rsa'

/**
 * Payload del access token de Auth0 que nos interesa.
 * `email` y `email_verified` requieren que el token los incluya (ver doctor-auth.md):
 * se agregan vía una Action de Auth0 que copia esos claims al access token con
 * un namespace propio. Si no están, quedan undefined (el onboarding los pide).
 */
export interface Auth0Payload {
  sub: string
  email?: string
  emailVerified?: boolean
}

const EMAIL_CLAIM = 'https://reportemedico.com/email'
const EMAIL_VERIFIED_CLAIM = 'https://reportemedico.com/email_verified'

/**
 * Segunda estrategia passport-jwt (nombre 'auth0'), independiente de la del
 * admin ('jwt'). Valida la firma RS256 contra el JWKS del tenant + audience +
 * issuer. No toca el auth de V1.
 */
@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy, 'auth0') {
  constructor(config: ConfigService) {
    const issuer = config.get<string>('AUTH0_ISSUER_BASE_URL') // ej: https://xxx.us.auth0.com
    const audience = config.get<string>('AUTH0_AUDIENCE')
    if (!issuer || !audience) {
      // Falla explícita en arranque si falta config: mejor que tokens "válidos" silenciosos
      throw new Error('AUTH0_ISSUER_BASE_URL y AUTH0_AUDIENCE son obligatorios para doctor-auth')
    }
    const issuerUrl = issuer.endsWith('/') ? issuer : `${issuer}/`

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience,
      issuer: issuerUrl,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuerUrl}.well-known/jwks.json`,
      }),
    })
  }

  validate(payload: Record<string, unknown>): Auth0Payload {
    if (!payload?.sub) throw new UnauthorizedException('Token sin sub')
    return {
      sub: payload.sub as string,
      email: (payload[EMAIL_CLAIM] as string) ?? (payload.email as string) ?? undefined,
      emailVerified:
        (payload[EMAIL_VERIFIED_CLAIM] as boolean) ?? (payload.email_verified as boolean) ?? undefined,
    }
  }
}
