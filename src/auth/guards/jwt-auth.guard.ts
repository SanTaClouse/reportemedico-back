import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'

/**
 * Valida el JWT del panel y, además, el ROL: por defecto solo pasa ADMIN.
 *
 * Hasta que existió el rol SCANNER (personal de puerta del evento, docs/v2/11)
 * todo usuario era ADMIN y bastaba con un token válido. Ahora un token de
 * SCANNER no debe abrir ningún endpoint del admin, así que la regla es
 * "ADMIN salvo que el endpoint diga otra cosa con @Roles(...)".
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super()
  }

  handleRequest<TUser = { role?: string }>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    const authed = super.handleRequest(err, user, info, context) as TUser & { role?: string }
    const allowed = this.reflector.getAllAndOverride<string[] | undefined>('roles', [
      context.getHandler(),
      context.getClass(),
    ]) ?? ['ADMIN']
    if (!authed.role || !allowed.includes(authed.role)) {
      throw new ForbiddenException('Acceso denegado')
    }
    return authed
  }
}
