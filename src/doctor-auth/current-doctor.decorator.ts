import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Auth0Payload } from './auth0.strategy'

/**
 * Inyecta el payload validado del token de Auth0 (sub, email, emailVerified).
 * La resolución a un registro Doctor (por auth0Sub) la hace el servicio del
 * área del médico — acá solo exponemos la identidad del token.
 */
export const Auth0User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Auth0Payload => {
    const request = ctx.switchToHttp().getRequest()
    return request.user as Auth0Payload
  },
)
