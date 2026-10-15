import { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sesion } from '../usuarios/sesion.entity.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import { findValidSession } from './sesion-valida.js';

const SECRET = 'secreto-de-tests-con-mas-de-32-caracteres';
const MINUTE = 60_000;
const NOW = new Date();

function buildSession(overrides: Partial<Sesion> = {}): Sesion {
  return {
    id: 40,
    usuarioId: 7,
    usuario: { id: 7, rol: 'cliente', activo: true } as Usuario,
    revocadaEn: null,
    venceEn: new Date(NOW.getTime() + 20 * MINUTE),
    ...overrides,
  } as Sesion;
}

describe('findValidSession', () => {
  const jwt = new JwtService({ secret: SECRET, signOptions: { algorithm: 'HS256' } });
  let sessions: { findOne: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    sessions = { findOne: vi.fn().mockResolvedValue(buildSession()) };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const find = (token: unknown) =>
    findValidSession(sessions as unknown as Repository<Sesion>, jwt, token);

  const sign = (payload: object) => jwt.signAsync(payload, { expiresIn: '15m' });

  it('devuelve la sesión con su usuario cuando es válida', async () => {
    const session = await find(await sign({ sub: 7, sid: 40 }));

    expect(session?.id).toBe(40);
    expect(session?.usuario.id).toBe(7);
    expect(sessions.findOne).toHaveBeenCalledWith({
      where: { id: 40 },
      relations: { usuario: true },
    });
  });

  it.each([
    ['sin token', undefined],
    ['con un token vacío', ''],
    ['con un token que no es texto', 123],
    ['con un token que no es un JWT', 'no-es-un-token'],
  ])('devuelve null %s, sin consultar la base', async (_caso, token) => {
    await expect(find(token)).resolves.toBeNull();
    expect(sessions.findOne).not.toHaveBeenCalled();
  });

  it('devuelve null con un token firmado con otro secreto', async () => {
    const other = new JwtService({ secret: 'otro-secreto-de-tests-con-32-caracteres' });
    const token = await other.signAsync({ sub: 7, sid: 40 }, { algorithm: 'HS256' });

    await expect(find(token)).resolves.toBeNull();
  });

  it('devuelve null con un token vencido', async () => {
    const token = await jwt.signAsync({ sub: 7, sid: 40 }, { expiresIn: '15m' });
    vi.setSystemTime(new Date(NOW.getTime() + 16 * MINUTE));

    await expect(find(token)).resolves.toBeNull();
  });

  it.each([
    ['sub no entero', { sub: '7', sid: 40 }],
    ['sid no entero', { sub: 7, sid: 4.5 }],
    ['sin sid', { sub: 7 }],
  ])('devuelve null con %s', async (_caso, payload) => {
    await expect(find(await sign(payload))).resolves.toBeNull();
    expect(sessions.findOne).not.toHaveBeenCalled();
  });

  it.each([
    ['inexistente', null],
    ['revocada', buildSession({ revocadaEn: new Date(NOW.getTime() - MINUTE) })],
    ['vencida', buildSession({ venceEn: new Date(NOW.getTime() - 1) })],
    ['que vence justo ahora', buildSession({ venceEn: new Date(NOW.getTime()) })],
    ['de otro usuario', buildSession({ usuarioId: 8 })],
    [
      'de una cuenta desactivada',
      buildSession({ usuario: { id: 7, rol: 'cliente', activo: false } as Usuario }),
    ],
  ])('devuelve null con una sesión %s', async (_caso, stored) => {
    sessions.findOne.mockResolvedValue(stored);

    await expect(find(await sign({ sub: 7, sid: 40 }))).resolves.toBeNull();
  });
});
