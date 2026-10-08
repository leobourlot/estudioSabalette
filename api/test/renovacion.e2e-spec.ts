import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Sesion } from '../src/usuarios/sesion.entity.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { cookieValue, cookieWasCleared, loginAs } from './utilidades/sesion-de-prueba.js';

const REFRESH = '/api/sesion/renovar';
const INVALID_SESSION = 'Tu sesión no es válida o venció. Volvé a ingresar';
// createTestUser crea un abogado: su sesión dura 1 hora sin uso (spec 001, RF-12).
const LAWYER_SESSION_TTL = 60 * 60 * 1000;

describe('POST /api/sesion/renovar', () => {
  let app: NestExpressApplication;
  let sessions: ReturnType<DataSource['getRepository']>;

  beforeAll(async () => {
    app = await createTestApp();
    sessions = app.get(DataSource).getRepository(Sesion);
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await clearTables(app);
    await createTestUser(app);
  });

  function refresh(refreshToken?: string) {
    const call = request(app.getHttpServer()).post(REFRESH);
    return refreshToken === undefined ? call : call.set('Cookie', `refresh_token=${refreshToken}`);
  }

  async function storedSession(): Promise<Sesion> {
    const [session] = (await sessions.find()) as Sesion[];
    return session;
  }

  it('entrega tokens nuevos y corre el vencimiento según el rol (RF-12)', async () => {
    const original = await loginAs(app, 'juan@estudio.com');
    const before = await storedSession();
    await sessions.update(before.id, { venceEn: new Date(Date.now() + 60_000) });

    const response = await refresh(original.refreshToken);

    expect(response.status).toBe(204);
    const newAccess = cookieValue(response, 'access_token');
    const newRefresh = cookieValue(response, 'refresh_token');
    expect(newAccess).toBeTruthy();
    expect(newRefresh).toBeTruthy();
    expect(newRefresh).not.toBe(original.refreshToken);
    expect(newRefresh!.split('.')[0]).toBe(String(before.id));

    const after = await storedSession();
    expect(after.tokenHash).not.toBe(before.tokenHash);
    expect(after.tokenAnteriorHash).toBe(before.tokenHash);
    expect(Math.abs(after.venceEn.getTime() - (Date.now() + LAWYER_SESSION_TTL))).toBeLessThan(
      60_000,
    );
  });

  it('permite renovar varias veces seguidas con el token más reciente', async () => {
    let { refreshToken } = await loginAs(app, 'juan@estudio.com');

    for (let i = 0; i < 3; i++) {
      const response = await refresh(refreshToken).expect(204);
      refreshToken = cookieValue(response, 'refresh_token')!;
    }
  });

  it('si se presenta el token ya reemplazado, revoca la sesión y responde 401 (RF-15)', async () => {
    const original = await loginAs(app, 'juan@estudio.com');
    const rotated = cookieValue(await refresh(original.refreshToken).expect(204), 'refresh_token')!;

    const reuse = await refresh(original.refreshToken);

    expect(reuse.status).toBe(401);
    expect(reuse.body.message).toBe(INVALID_SESSION);
    expect((await storedSession()).revocadaEn).toBeInstanceOf(Date);
    // El token legítimo más reciente también deja de servir: la sesión quedó cerrada.
    await refresh(rotated).expect(401);
  });

  it('responde 401 y borra las cookies si la sesión venció', async () => {
    const { refreshToken } = await loginAs(app, 'juan@estudio.com');
    await sessions.update((await storedSession()).id, { venceEn: new Date(Date.now() - 1000) });

    const response = await refresh(refreshToken);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(INVALID_SESSION);
    expect(cookieWasCleared(response, 'access_token')).toBe(true);
    expect(cookieWasCleared(response, 'refresh_token')).toBe(true);
  });

  it('responde 401 si la sesión fue revocada', async () => {
    const { refreshToken } = await loginAs(app, 'juan@estudio.com');
    await sessions.update((await storedSession()).id, { revocadaEn: new Date() });

    await refresh(refreshToken).expect(401);
  });

  it('responde 401 si el usuario fue desactivado', async () => {
    const { refreshToken } = await loginAs(app, 'juan@estudio.com');
    await app
      .get(DataSource)
      .getRepository(Usuario)
      .update({ email: 'juan@estudio.com' }, { activo: false });

    await refresh(refreshToken).expect(401);
  });

  it.each([
    ['sin cookie', undefined],
    ['con un formato inválido', 'no-es-un-token'],
    ['con un secreto que no corresponde', '1.secreto-inventado'],
    ['con una sesión inexistente', '999999.secreto-inventado'],
  ])('responde 401 %s', async (_case, token) => {
    await loginAs(app, 'juan@estudio.com');

    const response = await refresh(token);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(INVALID_SESSION);
  });

  it('es pública: funciona sin el token de acceso', async () => {
    const { refreshToken } = await loginAs(app, 'juan@estudio.com');

    await request(app.getHttpServer())
      .post(REFRESH)
      .set('Cookie', `refresh_token=${refreshToken}`)
      .expect(204);
  });
});
