import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { EstadoCausa } from '../src/causas/causa.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestClient, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables } from './utilidades/movimientos-de-prueba.js';
import { loginAs } from './utilidades/sesion-de-prueba.js';

const LIST = '/api/portal/causas';

/** Lista de causas del portal (spec 004, RF-7 a RF-12, RF-24, RF-25). */
describe('GET /api/portal/causas', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;

  beforeAll(async () => {
    app = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await clearTables(app);
    await clearMovementTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
  });

  /** Causa con el cliente como parte vigente (salvo que se indique otra cosa). */
  const causaOf = (
    clienteId: number,
    data: { caratula?: string; estado?: EstadoCausa; activa?: boolean; vigente?: boolean } = {},
  ) =>
    createTestCausa(app, {
      caratula: data.caratula ?? 'Pérez c/ Gómez s/ daños',
      estado: data.estado ?? 'en_tramite',
      activa: data.activa ?? true,
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      partes: [
        { nombre: 'Pedro', apellido: 'López' },
        { clienteId, vigente: data.vigente ?? true },
      ],
    });

  /** Ingresa como el cliente, pide la lista y verifica el código de respuesta. */
  async function listAs(client: Usuario, status: number, query = '') {
    const { accessToken } = await loginAs(app, client.email!);
    return request(app.getHttpServer())
      .get(`${LIST}${query}`)
      .set('Cookie', `access_token=${accessToken}`)
      .expect(status);
  }

  it('el cliente ve solo sus causas vinculadas, incluidas las archivadas y finalizadas (RF-7)', async () => {
    const client = await createTestClient(app);
    const other = await createTestClient(app);
    const enTramite = await causaOf(client.id, { estado: 'en_tramite' });
    const archivada = await causaOf(client.id, { estado: 'archivada' });
    const finalizada = await causaOf(client.id, { estado: 'finalizada' });
    await causaOf(client.id, { activa: false });
    await causaOf(client.id, { vigente: false });
    await causaOf(other.id);

    const response = await listAs(client, 200);

    expect(response.body.items.map((item: { id: number }) => item.id).sort()).toEqual(
      [enTramite.id, archivada.id, finalizada.id].sort(),
    );
  });

  it('de cada causa envía solo carátula, número, estado, grupo y fecha del último movimiento (RF-9, RF-30)', async () => {
    const client = await createTestClient(app);
    const causa = await causaOf(client.id, { caratula: 'Gómez c/ López', estado: 'paralizada' });

    const response = await listAs(client, 200);

    expect(response.body).toEqual({
      items: [
        {
          id: causa.id,
          caratula: 'Gómez c/ López',
          numeroExpediente: null,
          estado: 'paralizada',
          grupo: 'en_curso',
          fechaUltimoMovimiento: null,
        },
      ],
      pagina: 1,
      haySiguiente: false,
    });
  });

  it('un cliente sin causas recibe la lista vacía (RF-12)', async () => {
    const client = await createTestClient(app);

    const response = await listAs(client, 200);

    expect(response.body).toEqual({ items: [], pagina: 1, haySiguiente: false });
  });

  it.each(['0', '-1', 'abc', '1.5'])('pagina=%s responde 400', async (pagina) => {
    const client = await createTestClient(app);

    const response = await listAs(client, 400, `?pagina=${pagina}`);

    expect(response.body.message).toEqual([
      'La página debe ser un número entero mayor o igual a 1',
    ]);
  });
});
