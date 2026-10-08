import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sesion } from '../usuarios/sesion.entity.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import type { AccessTokenPayload } from './autenticacion.guard.js';
import { AuthenticationService, INVALID_CREDENTIALS_MESSAGE } from './autenticacion.service.js';
import type { PasswordsService } from './contrasenas.service.js';

const SECRET = 'secreto-de-tests-con-mas-de-32-caracteres';
const NOW = new Date('2026-10-02T12:00:00-03:00');
const MINUTE = 60_000;
const STORED_HASH = '$2b$12$hash-guardado';

const storedUser = {
  id: 7,
  rol: 'abogado',
  email: 'juan@estudio.com',
  nombre: 'Juan',
  apellido: 'Pérez',
  activo: true,
  debeCambiarContrasena: false,
  cliente: null,
} as Usuario;

describe('AuthenticationService.login', () => {
  const jwt = new JwtService({ secret: SECRET, signOptions: { algorithm: 'HS256' } });
  let users: { findOne: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let sessions: { delete: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };
  let passwords: { verify: ReturnType<typeof vi.fn>; hash: ReturnType<typeof vi.fn> };
  let service: AuthenticationService;

  function givenUser(
    credentials: { contrasenaHash: string; activo: boolean; rol?: Usuario['rol'] } | null,
  ) {
    users.findOne.mockImplementation(async (options: { select?: object }) => {
      if (credentials === null) return null;
      // La primera consulta pide solo las credenciales y el rol; la segunda, el usuario completo.
      return options.select
        ? { id: storedUser.id, rol: storedUser.rol, ...credentials }
        : storedUser;
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    users = { findOne: vi.fn(), update: vi.fn().mockResolvedValue(undefined) };
    sessions = {
      delete: vi.fn().mockResolvedValue(undefined),
      save: vi.fn(async (session: Partial<Sesion>) => ({ ...session, id: 40 })),
    };
    passwords = {
      verify: vi.fn(async (password: string) => password === 'clave correcta'),
      hash: vi.fn().mockResolvedValue('$2b$12$hash-ficticio'),
    };
    service = new AuthenticationService(
      users as unknown as Repository<Usuario>,
      sessions as unknown as Repository<Sesion>,
      passwords as unknown as PasswordsService,
      jwt,
    );
    givenUser({ contrasenaHash: STORED_HASH, activo: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('usa el mensaje exacto de RF-9', () => {
    expect(INVALID_CREDENTIALS_MESSAGE).toBe('Email o contraseña incorrectos');
  });

  it('busca el email normalizado (RF-5)', async () => {
    await service.login('  Juan@Estudio.COM ', 'clave correcta');

    expect(users.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'juan@estudio.com' } }),
    );
  });

  it('rechaza un email inexistente con el mensaje genérico, comparando igual contra un hash ficticio', async () => {
    givenUser(null);

    await expect(service.login('nadie@estudio.com', 'clave correcta')).rejects.toThrow(
      new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
    );
    expect(passwords.verify).toHaveBeenCalledWith('clave correcta', '$2b$12$hash-ficticio');
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña incorrecta con el mensaje genérico', async () => {
    await expect(service.login('juan@estudio.com', 'otra clave')).rejects.toThrow(
      new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
    );
    expect(passwords.verify).toHaveBeenCalledWith('otra clave', STORED_HASH);
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('rechaza una cuenta desactivada con el mensaje genérico, aunque la contraseña sea correcta', async () => {
    givenUser({ contrasenaHash: STORED_HASH, activo: false });

    await expect(service.login('juan@estudio.com', 'clave correcta')).rejects.toThrow(
      new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
    );
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('al ingresar cierra la sesión anterior del usuario (RF-13)', async () => {
    await service.login('juan@estudio.com', 'clave correcta');

    expect(sessions.delete).toHaveBeenCalledWith({ usuarioId: 7 });
    expect(sessions.delete.mock.invocationCallOrder[0]).toBeLessThan(
      sessions.save.mock.invocationCallOrder[0],
    );
  });

  it('pide el rol junto con las credenciales, para fijar la duración de la sesión', async () => {
    await service.login('juan@estudio.com', 'clave correcta');

    expect(users.findOne.mock.calls[0][0]).toMatchObject({
      select: { id: true, contrasenaHash: true, activo: true, rol: true },
    });
  });

  it('crea una sesión que guarda solo el hash del secreto de renovación (RF-12)', async () => {
    const result = await service.login('juan@estudio.com', 'clave correcta');

    const [sessionId, secret] = result.refreshToken.split('.');
    expect(sessionId).toBe('40');
    expect(secret.length).toBeGreaterThanOrEqual(43);

    const saved = sessions.save.mock.calls[0][0] as Partial<Sesion>;
    expect(saved.usuarioId).toBe(7);
    expect(saved.tokenHash).toBe(createHash('sha256').update(secret).digest('hex'));
    expect(saved.tokenHash).not.toContain(secret);
  });

  it('la sesión de un integrante vence en 1 hora sin uso (spec 001, RF-12)', async () => {
    await service.login('juan@estudio.com', 'clave correcta');

    const saved = sessions.save.mock.calls[0][0] as Partial<Sesion>;
    expect(saved.venceEn).toEqual(new Date(NOW.getTime() + 60 * MINUTE));
  });

  it('la sesión de un cliente vence en 20 minutos sin uso (RF-4; spec 001, RF-12)', async () => {
    givenUser({ contrasenaHash: STORED_HASH, activo: true, rol: 'cliente' });

    await service.login('juan@estudio.com', 'clave correcta');

    const saved = sessions.save.mock.calls[0][0] as Partial<Sesion>;
    expect(saved.venceEn).toEqual(new Date(NOW.getTime() + 20 * MINUTE));
  });

  it('emite un token de acceso con el usuario y la sesión', async () => {
    const result = await service.login('juan@estudio.com', 'clave correcta');

    const payload = await jwt.verifyAsync<AccessTokenPayload & { exp: number; iat: number }>(
      result.accessToken,
    );
    expect(payload.sub).toBe(7);
    expect(payload.sid).toBe(40);
    expect(payload.exp - payload.iat).toBe(15 * 60);
  });

  it('registra la fecha de último ingreso (RF-8)', async () => {
    await service.login('juan@estudio.com', 'clave correcta');

    expect(users.update).toHaveBeenCalledWith(7, { ultimoIngreso: NOW });
  });

  it('devuelve el usuario sin el hash de la contraseña (RF-40)', async () => {
    const result = await service.login('juan@estudio.com', 'clave correcta');

    expect(result.usuario).toBe(storedUser);
    expect(result.usuario).not.toHaveProperty('contrasenaHash');
  });

  it('genera secretos distintos en cada ingreso', async () => {
    const first = await service.login('juan@estudio.com', 'clave correcta');
    const second = await service.login('juan@estudio.com', 'clave correcta');

    expect(first.refreshToken).not.toBe(second.refreshToken);
  });
});

describe('AuthenticationService.refresh', () => {
  const jwt = new JwtService({ secret: SECRET, signOptions: { algorithm: 'HS256' } });
  const SECRET_TOKEN = 'secreto-de-renovacion';
  const hashOf = (value: string) => createHash('sha256').update(value).digest('hex');
  let sessions: { findOne: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let service: AuthenticationService;

  function givenSession(rol: Usuario['rol']) {
    sessions.findOne.mockResolvedValue({
      id: 40,
      usuarioId: 7,
      usuario: { ...storedUser, rol },
      tokenHash: hashOf(SECRET_TOKEN),
      tokenAnteriorHash: null,
      revocadaEn: null,
      venceEn: new Date(NOW.getTime() + MINUTE),
    } as Sesion);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    sessions = { findOne: vi.fn(), update: vi.fn().mockResolvedValue({ affected: 1 }) };
    service = new AuthenticationService(
      { findOne: vi.fn() } as unknown as Repository<Usuario>,
      sessions as unknown as Repository<Sesion>,
      { hash: vi.fn().mockResolvedValue('$2b$12$hash-ficticio') } as unknown as PasswordsService,
      jwt,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['cliente', 20],
    ['abogado', 60],
    ['admin', 60],
  ] as const)(
    'corre el vencimiento de la sesión de un %s a %i minutos (spec 001, RF-12)',
    async (rol, minutes) => {
      givenSession(rol);

      await service.refresh(`40.${SECRET_TOKEN}`);

      const [, changes] = sessions.update.mock.calls[0] as [unknown, Partial<Sesion>];
      expect(changes.venceEn).toEqual(new Date(NOW.getTime() + minutes * MINUTE));
    },
  );
});
