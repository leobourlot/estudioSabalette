import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import type { Usuario } from '../usuarios/usuario.entity.js';
import type { AuthenticatedRequest } from './autenticacion.guard.js';
import {
  PENDING_PASSWORD_CHANGE_MESSAGE,
  PendingPasswordChangeGuard,
} from './cambio-pendiente.guard.js';
import { AllowPendingPasswordChange, Public, Roles } from './decoradores.js';
import { FORBIDDEN_MESSAGE, RolesGuard } from './roles.guard.js';

// Controlador de ejemplo con los decoradores reales, para probar guards y decoradores juntos.
class SampleController {
  @Public()
  publicRoute() {}

  ownData() {}

  @AllowPendingPasswordChange()
  changePassword() {}

  @Roles('admin', 'abogado')
  panelRoute() {}

  @Roles('admin')
  adminRoute() {}

  @Roles('cliente')
  portalRoute() {}
}

@Roles('admin')
class AdminController {
  anyRoute() {}

  @Roles('admin', 'abogado')
  sharedRoute() {}
}

type Route = keyof SampleController;

function contextFor(
  controller: new () => object,
  route: string,
  usuario?: Partial<Usuario>,
): ExecutionContext {
  const request = { usuario } as Partial<AuthenticatedRequest>;
  return {
    getHandler: () => (controller.prototype as Record<string, unknown>)[route],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const user = (overrides: Partial<Usuario>): Partial<Usuario> => ({
  id: 1,
  rol: 'abogado',
  debeCambiarContrasena: false,
  ...overrides,
});

describe('PendingPasswordChangeGuard (RF-11)', () => {
  const guard = new PendingPasswordChangeGuard(new Reflector());
  const pending = user({ debeCambiarContrasena: true });

  it('deja pasar a un usuario sin cambio pendiente a cualquier ruta', () => {
    expect(guard.canActivate(contextFor(SampleController, 'ownData', user({})))).toBe(true);
  });

  it('con cambio pendiente, deja pasar solo a las rutas marcadas', () => {
    expect(guard.canActivate(contextFor(SampleController, 'changePassword', pending))).toBe(true);
  });

  it.each<Route>(['ownData', 'panelRoute', 'adminRoute'])(
    'con cambio pendiente, rechaza %s con 403',
    (route) => {
      const context = contextFor(SampleController, route, pending);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(PENDING_PASSWORD_CHANGE_MESSAGE);
    },
  );

  it('no interviene en rutas públicas (no hay usuario)', () => {
    expect(guard.canActivate(contextFor(SampleController, 'publicRoute'))).toBe(true);
  });
});

describe('RolesGuard (RF-19)', () => {
  const guard = new RolesGuard(new Reflector());

  it('deja pasar cualquier rol en rutas sin @Roles', () => {
    expect(
      guard.canActivate(contextFor(SampleController, 'ownData', user({ rol: 'cliente' }))),
    ).toBe(true);
  });

  it.each([
    ['panelRoute', 'admin'],
    ['panelRoute', 'abogado'],
    ['adminRoute', 'admin'],
    ['portalRoute', 'cliente'],
  ] as const)('deja pasar %s al rol %s', (route, rol) => {
    expect(guard.canActivate(contextFor(SampleController, route, user({ rol })))).toBe(true);
  });

  it.each([
    ['panelRoute', 'cliente'],
    ['adminRoute', 'abogado'],
    ['adminRoute', 'cliente'],
    ['portalRoute', 'admin'],
    ['portalRoute', 'abogado'],
  ] as const)('rechaza %s para el rol %s con el mensaje de RF-19', (route, rol) => {
    const context = contextFor(SampleController, route, user({ rol }));

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(FORBIDDEN_MESSAGE);
  });

  it('usa el mensaje exacto de la spec', () => {
    expect(FORBIDDEN_MESSAGE).toBe('No tenés permiso para realizar esta acción');
  });

  it('aplica @Roles del controlador, y el de la ruta lo reemplaza', () => {
    const lawyer = user({ rol: 'abogado' });

    expect(() => guard.canActivate(contextFor(AdminController, 'anyRoute', lawyer))).toThrow(
      FORBIDDEN_MESSAGE,
    );
    expect(guard.canActivate(contextFor(AdminController, 'sharedRoute', lawyer))).toBe(true);
  });

  it('no interviene en rutas públicas', () => {
    expect(guard.canActivate(contextFor(SampleController, 'publicRoute'))).toBe(true);
  });
});
