import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Rol, Usuario } from '../usuarios/usuario.entity.js';
import type { AuthenticatedRequest } from './autenticacion.guard.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const ALLOW_PENDING_PASSWORD_CHANGE_KEY = 'allowPendingPasswordChange';

/** Marca una ruta como accesible sin sesión (RF-18). Todo lo demás exige sesión. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Roles que pueden usar la ruta (RF-19). En un controlador aplica a todas sus rutas;
 * en una ruta reemplaza al del controlador. Sin @Roles, cualquier usuario con sesión pasa.
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);

/** Ruta permitida aunque el usuario tenga pendiente el cambio de contraseña (RF-11). */
export const AllowPendingPasswordChange = () =>
  SetMetadata(ALLOW_PENDING_PASSWORD_CHANGE_KEY, true);

/** Usuario de la sesión, cargado por AuthenticationGuard con su rol vigente (RF-14). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Usuario | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().usuario,
);
