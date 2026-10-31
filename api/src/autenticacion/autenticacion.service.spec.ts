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
  dni: '20111222',
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
    expect(INVALID_CREDENTIALS_MESSAGE).toBe('DNI/CUIT o contraseña incorrectos');
  });

  it('busca un DNI normalizado entre los integrantes y los clientes personas físicas (RF-5, RF-8)', async () => {
    await service.login(' 20.111-222 ', 'clave correcta');

    expect(users.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: [{ dni: '20111222' }, { cliente: { dni: '20111222' } }] }),
    );
  });

  it('busca un CUIT normalizado entre los clientes personas jurídicas (RF-5, RF-8)', async () => {
    await service.login('30-71234567-1', 'clave correcta');

    expect(users.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: [{ cliente: { cuit: '30712345671' } }] }),
    );
  });

  it.each(['juan@estudio.com', '123456', '1234567890', ''])(
    'rechaza "%s", que no puede ser un DNI ni un CUIT, sin consultar la base y comparando igual contra un hash ficticio (RF-9)',
    async (document) => {
      await expect(service.login(document, 'clave correcta')).rejects.toThrow(
        new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
      );
      expect(users.findOne).not.toHaveBeenCalled();
      expect(passwords.verify).toHaveBeenCalledWith('clave correcta', '$2b$12$hash-ficticio');
    },
  );

  it('rechaza un DNI inexistente con el mensaje genérico, comparando igual contra un hash ficticio', async () => {
    givenUser(null);

    await expect(service.login('99888777', 'clave correcta')).rejects.toThrow(
      new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
    );
    expect(passwords.verify).toHaveBeenCalledWith('clave correcta', '$2b$12$hash-ficticio');
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña incorrecta con el mensaje genérico', async () => {
    await expect(service.login('20111222', 'otra clave')).rejects.toThrow(
      new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
    );
    expect(passwords.verify).toHaveBeenCalledWith('otra clave', STORED_HASH);
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('rechaza una cuenta desactivada con el mensaje genérico, aunque la contraseña sea correcta', async () => {
    givenUser({ contrasenaHash: STORED_HASH, activo: false });

    await expect(service.login('20111222', 'clave correcta')).rejects.toThrow(
      new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
    );
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('al ingresar cierra la sesión anterior del usuario (RF-13)', async () => {
    await service.login('20111222', 'clave correcta');

    expect(sessions.delete).toHaveBeenCalledWith({ usuarioId: 7 });
    expect(sessions.delete.mock.invocationCallOrder[0]).toBeLessThan(
      sessions.save.mock.invocationCallOrder[0],
    );
  });

  it('pide el rol junto con las credenciales, para fijar la duración de la sesión', async () => {
    await service.login('20111222', 'clave correcta');

    expect(users.findOne.mock.calls[0][0]).toMatchObject({
      select: { id: true, contrasenaHash: true, activo: true, rol: true },
    });
  });

  it('crea una sesión que guarda solo el hash del secreto de renovación (RF-12)', async () => {
    const result = await service.login('20111222', 'clave correcta');

    const [sessionId, secret] = result.refreshToken.split('.');
    expect(sessionId).toBe('40');
    expect(secret.length).toBeGreaterThanOrEqual(43);

    const saved = sessions.save.mock.calls[0][0] as Partial<Sesion>;
    expect(saved.usuarioId).toBe(7);
    expect(saved.tokenHash).toBe(createHash('sha256').update(secret).digest('hex'));
    expect(saved.tokenHash).not.toContain(secret);
  });

  it('la sesión de un integrante vence en 1 hora sin uso (spec 001, RF-12)', async () => {
    await service.login('20111222', 'clave correcta');

    const saved = sessions.save.mock.calls[0][0] as Partial<Sesion>;
    expect(saved.venceEn).toEqual(new Date(NOW.getTime() + 60 * MINUTE));
  });

  it('la sesión de un cliente vence en 20 minutos sin uso (RF-4; spec 001, RF-12)', async () => {
    givenUser({ contrasenaHash: STORED_HASH, activo: true, rol: 'cliente' });

    await service.login('20111222', 'clave correcta');

    const saved = sessions.save.mock.calls[0][0] as Partial<Sesion>;
    expect(saved.venceEn).toEqual(new Date(NOW.getTime() + 20 * MINUTE));
  });

  it('emite un token de acceso con el usuario y la sesión', async () => {
    const result = await service.login('20111222', 'clave correcta');

    const payload = await jwt.verifyAsync<AccessTokenPayload & { exp: number; iat: number }>(
      result.accessToken,
    );
    expect(payload.sub).toBe(7);
    expect(payload.sid).toBe(40);
    expect(payload.exp - payload.iat).toBe(15 * 60);
  });

  it('registra la fecha de último ingreso (RF-8)', async () => {
    await service.login('20111222', 'clave correcta');

    expect(users.update).toHaveBeenCalledWith(7, { ultimoIngreso: NOW });
  });

  it('devuelve el usuario sin el hash de la contraseña (RF-40)', async () => {
    const result = await service.login('20111222', 'clave correcta');

    expect(result.usuario).toBe(storedUser);
    expect(result.usuario).not.toHaveProperty('contrasenaHash');
  });

  it('genera secretos distintos en cada ingreso', async () => {
    const first = await service.login('20111222', 'clave correcta');
    const second = await service.login('20111222', 'clave correcta');

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

describe('AuthenticationService.sessionSection (spec 007, RF-31)', () => {
  const jwt = new JwtService({ secret: SECRET, signOptions: { algorithm: 'HS256' } });
  let sessions: { findOne: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let service: AuthenticationService;

  function givenSession(usuario: Partial<Usuario>, sesion: Partial<Sesion> = {}) {
    sessions.findOne.mockResolvedValue({
      id: 40,
      usuarioId: 7,
      usuario: { ...storedUser, ...usuario },
      revocadaEn: null,
      venceEn: new Date(NOW.getTime() + MINUTE),
      ...sesion,
    } as Sesion);
  }

  const token = () => jwt.signAsync({ sub: 7, sid: 40 }, { expiresIn: '15m' });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    sessions = { findOne: vi.fn(), update: vi.fn() };
    service = new AuthenticationService(
      { findOne: vi.fn() } as unknown as Repository<Usuario>,
      sessions as unknown as Repository<Sesion>,
      { hash: vi.fn().mockResolvedValue('$2b$12$hash-ficticio') } as unknown as PasswordsService,
      jwt,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    // Nunca escribe: consultar el estado no extiende ni renueva la sesión.
    expect(sessions.update).not.toHaveBeenCalled();
  });

  it.each([
    ['un cliente', { rol: 'cliente' }, 'portal'],
    [
      'un cliente con cambio de contraseña pendiente',
      { rol: 'cliente', debeCambiarContrasena: true },
      'portal',
    ],
    ['un abogado', { rol: 'abogado' }, 'panel'],
    ['un administrador', { rol: 'admin' }, 'panel'],
  ] as const)('devuelve la sección de %s', async (_caso, usuario, seccion) => {
    givenSession(usuario);

    await expect(service.sessionSection(await token())).resolves.toBe(seccion);
  });

  it('devuelve null sin token', async () => {
    await expect(service.sessionSection(undefined)).resolves.toBeNull();
  });

  it('devuelve null con una sesión revocada', async () => {
    givenSession({ rol: 'cliente' }, { revocadaEn: new Date(NOW.getTime() - MINUTE) });

    await expect(service.sessionSection(await token())).resolves.toBeNull();
  });

  it('devuelve null con la cuenta desactivada', async () => {
    givenSession({ rol: 'abogado', activo: false });

    await expect(service.sessionSection(await token())).resolves.toBeNull();
  });
});
