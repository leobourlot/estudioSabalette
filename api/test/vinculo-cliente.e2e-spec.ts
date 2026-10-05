import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { EstadoCausa } from '../src/causas/causa.entity.js';
import { ClientLinkService } from '../src/causas/vinculo-cliente.service.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const CAUSAS = '/api/panel/causas';

/**
 * RF-26 a RF-28, RF-42: un cliente está vinculado a una causa solo mientras es parte
 * vigente y la causa está activa, cualquiera sea su estado.
 */
describe('ClientLinkService', () => {
  let app: NestExpressApplication;
  let links: ClientLinkService;
  let lawyer: Usuario;
  let session: TestSession;
  let clientCounter = 0;

  const withSession = (call: request.Test) =>
    call.set('Cookie', `access_token=${session.accessToken}`);

  const newClient = () => {
    clientCounter += 1;
    return createTestUser(app, {
      rol: 'cliente',
      email: `cliente${clientCounter}@correo.com`,
      nombre: 'Cliente',
      apellido: `Número ${clientCounter}`,
      cliente: { tipoPersona: 'fisica', dni: String(30000000 + clientCounter) },
    });
  };

  /** Causa con el cliente como parte y otra parte no cliente; devuelve los ids. */
  const causaWith = async (clienteId: number, estado: EstadoCausa = 'en_tramite') => {
    const causa = await createTestCausa(app, {
      estado,
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      partes: [{ nombre: 'Pedro', apellido: 'López' }, { clienteId }],
    });
    const detail = await withSession(
      request(app.getHttpServer()).get(`${CAUSAS}/${causa.id}`),
    ).expect(200);
    return { causaId: causa.id, parteId: detail.body.partes[1].id as number };
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    links = app.get(ClientLinkService);
    lawyer = await createTestUser(app, {
      email: 'abogado@estudio.com',
      nombre: 'Luis',
      apellido: 'Sosa',
    });
    session = await loginAs(app, 'abogado@estudio.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each<EstadoCausa>(['en_tramite', 'paralizada', 'archivada', 'finalizada'])(
    'vincula al cliente con una causa activa en estado %s (RF-26)',
    async (estado) => {
      const client = await newClient();
      const { causaId } = await causaWith(client.id, estado);

      expect(await links.isLinked(client.id, causaId)).toBe(true);
      expect(await links.linkedCausaIds(client.id)).toEqual([causaId]);
    },
  );

  it('lista todas las causas del cliente, por id y sin repetir', async () => {
    const client = await newClient();
    const first = await causaWith(client.id);
    const second = await causaWith(client.id);

    expect(await links.linkedCausaIds(client.id)).toEqual([first.causaId, second.causaId]);
  });

  it('no vincula a otros clientes ni a una parte no cliente con el mismo DNI', async () => {
    const client = await newClient();
    const other = await newClient();
    const { causaId } = await causaWith(client.id);
    const nonClient = await createTestCausa(app, {
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      partes: [{ nombre: 'Cliente', apellido: 'Homónimo', dni: String(30000000 + clientCounter) }],
    });

    expect(await links.isLinked(other.id, causaId)).toBe(false);
    expect(await links.isLinked(other.id, nonClient.id)).toBe(false);
    expect(await links.linkedCausaIds(other.id)).toEqual([]);
  });

  it('corta el vínculo al desvincular la parte, y lo devuelve al volver a vincularla (RF-27)', async () => {
    const client = await newClient();
    const { causaId, parteId } = await causaWith(client.id);

    await withSession(
      request(app.getHttpServer()).post(`${CAUSAS}/${causaId}/partes/${parteId}/desvincular`),
    ).expect(200);
    expect(await links.isLinked(client.id, causaId)).toBe(false);
    expect(await links.linkedCausaIds(client.id)).toEqual([]);

    await withSession(
      request(app.getHttpServer()).post(`${CAUSAS}/${causaId}/partes/${parteId}/revincular`),
    ).expect(200);
    expect(await links.isLinked(client.id, causaId)).toBe(true);
  });

  it('corta el vínculo al desactivar la causa y lo devuelve al reactivarla (RF-27, RF-42)', async () => {
    const client = await newClient();
    const { causaId } = await causaWith(client.id);

    await withSession(request(app.getHttpServer()).post(`${CAUSAS}/${causaId}/desactivar`)).expect(
      204,
    );
    expect(await links.isLinked(client.id, causaId)).toBe(false);
    expect(await links.linkedCausaIds(client.id)).toEqual([]);

    await withSession(request(app.getHttpServer()).post(`${CAUSAS}/${causaId}/reactivar`))
      .send({})
      .expect(204);
    expect(await links.isLinked(client.id, causaId)).toBe(true);
  });

  it('un cliente desactivado sigue como parte, y al reactivar su cuenta conserva el vínculo (RF-28)', async () => {
    const client = await newClient();
    const { causaId } = await causaWith(client.id);

    await withSession(
      request(app.getHttpServer()).post(`/api/panel/usuarios/${client.id}/desactivar`),
    ).expect(204);
    const detail = await withSession(
      request(app.getHttpServer()).get(`${CAUSAS}/${causaId}`),
    ).expect(200);
    expect(detail.body.partes[1]).toMatchObject({ clienteId: client.id, clienteActivo: false });
    // Desactivado no puede ingresar (spec 001); el vínculo con la causa no se borra.
    expect(await links.isLinked(client.id, causaId)).toBe(true);

    await withSession(
      request(app.getHttpServer()).post(`/api/panel/usuarios/${client.id}/reactivar`),
    )
      .send({ contrasenaTemporal: 'clave temporal 2026' })
      .expect(204);
    expect(await links.linkedCausaIds(client.id)).toEqual([causaId]);
  });

  it('responde false para una causa inexistente', async () => {
    const client = await newClient();

    expect(await links.isLinked(client.id, 99999)).toBe(false);
  });
});
