import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IsNull, type Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sesion } from '../usuarios/sesion.entity.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import { AuthenticationGuard, type AuthenticatedRequest } from './autenticacion.guard.js';
import { ACCESS_TOKEN_COOKIE } from './constantes.js';
import { IS_PUBLIC_KEY } from './decoradores.js';

const SECRET = 'secreto-de-tests-con-mas-de-32-caracteres';
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60_000;
// Del reloj real: los casos de la tabla arman sus fechas con Date.now() al cargar el archivo.
const NOW = new Date();

function buildUser(overrides: Partial<Usuario> = {}): Usuario {
  return { id: 7, rol: 'abogado', activo: true, ...overrides } as Usuario;
}

function buildSession(overrides: Partial<Sesion> = {}): Sesion {
  return {
    id: 40,
    usuarioId: 7,
    usuario: buildUser(),
    revocadaEn: null,
    venceEn: new Date(Date.now() + 7 * DAY),
    ...overrides,
  } as Sesion;
}

function contextFor(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controlador {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AuthenticationGuard', () => {
  const jwt = new JwtService({ secret: SECRET, signOptions: { algorithm: 'HS256' } });
  let reflector: Reflector;
  let sessions: { findOne: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let guard: AuthenticationGuard;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    reflector = new Reflector();
    sessions = {
      findOne: vi.fn().mockResolvedValue(buildSession()),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    guard = new AuthenticationGuard(reflector, jwt, sessions as unknown as Repository<Sesion>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function requestWithToken(payload: object = { sub: 7, sid: 40 }) {
    const token = await jwt.signAsync(payload, { expiresIn: '15m' });
    return { cookies: { [ACCESS_TOKEN_COOKIE]: token } } as Partial<AuthenticatedRequest>;
  }

  it('deja pasar una ruta pública sin token', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => key === IS_PUBLIC_KEY);

    await expect(guard.canActivate(contextFor({ cookies: {} }))).resolves.toBe(true);
    expect(sessions.findOne).not.toHaveBeenCalled();
    expect(sessions.update).not.toHaveBeenCalled();
  });

  it('acepta un token válido y deja el usuario y la sesión en la petición', async () => {
    const request = await requestWithToken();

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.usuario?.id).toBe(7);
    expect(request.sesion?.id).toBe(40);
    expect(sessions.findOne).toHaveBeenCalledWith({
      where: { id: 40 },
      relations: { usuario: true },
    });
  });

  it('rechaza una petición sin token', async () => {
    await expect(guard.canActivate(contextFor({ cookies: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un token alterado', async () => {
    const request = await requestWithToken();
    const token = request.cookies![ACCESS_TOKEN_COOKIE] as string;
    const [header, , signature] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 1, sid: 40 })).toString('base64url');
    request.cookies![ACCESS_TOKEN_COOKIE] = `${header}.${forgedPayload}.${signature}`;

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const other = new JwtService({ secret: 'otro-secreto-de-tests-con-mas-de-32-caracteres' });
    const token = await other.signAsync({ sub: 7, sid: 40 }, { expiresIn: '15m' });

    await expect(
      guard.canActivate(contextFor({ cookies: { [ACCESS_TOKEN_COOKIE]: token } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un token vencido', async () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 10;
    const token = await jwt.signAsync({ sub: 7, sid: 40, exp: expiredAt });

    await expect(
      guard.canActivate(contextFor({ cookies: { [ACCESS_TOKEN_COOKIE]: token } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([
    ['la sesión no existe', null],
    ['la sesión fue revocada', buildSession({ revocadaEn: new Date() })],
    ['la sesión venció', buildSession({ venceEn: new Date(Date.now() - 1000) })],
    [
      'la sesión es de otro usuario',
      buildSession({ usuarioId: 99, usuario: buildUser({ id: 99 }) }),
    ],
    ['el usuario está inactivo', buildSession({ usuario: buildUser({ activo: false }) })],
  ])('rechaza la petición si %s', async (_case, session) => {
    sessions.findOne.mockResolvedValue(session);
    const request = await requestWithToken();

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.usuario).toBeUndefined();
    expect(sessions.update).not.toHaveBeenCalled();
  });

  it.each([
    ['cliente', 20],
    ['abogado', 60],
    ['admin', 60],
  ] as const)(
    'cada petición de un %s corre el vencimiento de la sesión a %i minutos (spec 001, RF-12)',
    async (rol, minutes) => {
      sessions.findOne.mockResolvedValue(buildSession({ usuario: buildUser({ rol }) }));

      await guard.canActivate(contextFor(await requestWithToken()));

      expect(sessions.update).toHaveBeenCalledTimes(1);
      expect(sessions.update).toHaveBeenCalledWith(
        { id: 40, revocadaEn: IsNull() },
        { venceEn: new Date(NOW.getTime() + minutes * MINUTE) },
      );
    },
  );

  it('usa el rol vigente leído de la base, no el que tenía al ingresar (RF-14)', async () => {
    sessions.findOne.mockResolvedValue(buildSession({ usuario: buildUser({ rol: 'admin' }) }));

    await guard.canActivate(contextFor(await requestWithToken()));

    expect(sessions.update.mock.calls[0][1]).toEqual({
      venceEn: new Date(NOW.getTime() + 60 * MINUTE),
    });
  });
});
