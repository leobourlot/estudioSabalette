import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './autenticacion.guard.js';
import { ALLOW_PENDING_PASSWORD_CHANGE_KEY } from './decoradores.js';

export const PENDING_PASSWORD_CHANGE_MESSAGE = 'Tenés que cambiar tu contraseña antes de continuar';

/**
 * Guard global, después de AuthenticationGuard: mientras el usuario tiene pendiente el
 * cambio de contraseña, solo pasa por las rutas marcadas con @AllowPendingPasswordChange()
 * (RF-11). La renovación de sesión es pública, así que tampoco se ve afectada.
 */
@Injectable()
export class PendingPasswordChangeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().usuario;
    // Sin usuario es una ruta pública: AuthenticationGuard ya rechazó lo demás.
    if (!user?.debeCambiarContrasena) return true;

    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_PASSWORD_CHANGE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed) throw new ForbiddenException(PENDING_PASSWORD_CHANGE_MESSAGE);
    return true;
  }
}
