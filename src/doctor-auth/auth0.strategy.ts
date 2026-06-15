import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
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
    const rawIssuer = config.get<string>('AUTH0_ISSUER_BASE_URL')?.trim()
    const audience = config.get<string>('AUTH0_AUDIENCE')?.trim()
    const configured = Boolean(rawIssuer && audience)

    // Degradación elegante: si falta la config NO se cae todo el backend.
    // Se construye con un issuer dummy (URL válida pero irresoluble) → los
    // tokens fallan la validación (401) y el resto de la API sigue operativa.
    const baseIssuer = configured ? (rawIssuer as string) : 'https://auth0-no-configurado.invalid'
    const withProtocol = /^https?:\/\//i.test(baseIssuer) ? baseIssuer : `https://${baseIssuer}`
    const issuerUrl = withProtocol.endsWith('/') ? withProtocol : `${withProtocol}/`

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: audience ?? 'audiencia-no-configurada',
      issuer: issuerUrl,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuerUrl}.well-known/jwks.json`,
      }),
    })

    if (!configured) {
      new Logger(Auth0Strategy.name).error(
        'doctor-auth DESHABILITADO: faltan AUTH0_ISSUER_BASE_URL y/o AUTH0_AUDIENCE. ' +
          'El login de médicos rechazará todos los tokens hasta configurarlas.',
      )
    }
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
