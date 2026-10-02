import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Rol } from '../usuarios/usuario.entity.js';
import type { AuthenticatedRequest } from './autenticacion.guard.js';
import { ROLES_KEY } from './decoradores.js';

export const FORBIDDEN_MESSAGE = 'No tenés permiso para realizar esta acción';

/**
 * Guard global, después de AuthenticationGuard: si la ruta o su controlador declaran
 * @Roles(...), el rol vigente del usuario tiene que estar entre ellos (RF-19). Las reglas
 * finas (por ejemplo, un abogado solo opera sobre clientes) viven en los services.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) return true;

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().usuario;
    if (!user || !roles.includes(user.rol)) throw new ForbiddenException(FORBIDDEN_MESSAGE);
    return true;
  }
}
