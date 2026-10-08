import { NotFoundException } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { EstadoCausa } from '../src/causas/causa.entity.js';
import { ClientVisibilityService } from '../src/movimientos/visibilidad-cliente.service.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables, createTestMovimiento } from './utilidades/movimientos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

/** RF-30 a RF-33: qué movimientos puede ver un cliente. */
describe('ClientVisibilityService', () => {
  let app: NestExpressApplication;
  let visibility: ClientVisibilityService;
  let lawyer: Usuario;
  let session: TestSession;
  let clientCounter = 0;

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

  /** Causa con el cliente como parte; devuelve la causa y el id de la parte cliente. */
  const causaWith = async (clienteId: number, estado: EstadoCausa = 'en_tramite') => {
    const causa = await createTestCausa(app, {
      estado,
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      partes: [{ nombre: 'Pedro', apellido: 'López' }, { clienteId }],
    });
    const detail = await request(app.getHttpServer())
      .get(`/api/panel/causas/${causa.id}`)
      .set('Cookie', `access_token=${session.accessToken}`)
      .expect(200);
    return { causaId: causa.id, parteId: detail.body.partes[1].id as number };
  };

  const movement = (
    causaId: number,
    data: {
      visible?: boolean;
      anulado?: boolean;
      textoCliente?: string | null;
      fecha?: string;
    } = {},
  ) =>
    createTestMovimiento(app, {
      causaId,
      creadoPorId: lawyer.id,
      descripcion: 'Descripción técnica interna.',
      visible: true,
      ...data,
    });

  const panel = (method: 'post', path: string) =>
    request(app.getHttpServer())[method](path).set('Cookie', `access_token=${session.accessToken}`);

  const expectNotFound = (promise: Promise<unknown>) =>
    expect(promise).rejects.toThrow(new NotFoundException('No existe ese movimiento'));

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearMovementTables(app);
    visibility = app.get(ClientVisibilityService);
    lawyer = await createTestUser(app, {
      email: 'abogado@estudio.com',
      nombre: 'Luis',
      apellido: 'Sosa',
    });
    session = await loginAs(app, lawyer.email!);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('un cliente vinculado ve un movimiento visible con el texto para el cliente (RF-30, RF-31)', async () => {
    const client = await newClient();
    const { causaId } = await causaWith(client.id);
    const created = await movement(causaId, { textoCliente: 'El juez fijó audiencia.' });

    const seen = await visibility.findVisible(client.id, created.causaId, created.id);

    expect(seen).toEqual({
      id: created.id,
      fecha: created.fecha,
      tipo: created.tipo,
      texto: 'El juez fijó audiencia.',
      anulado: false,
    });
    expect(JSON.stringify(seen)).not.toContain('Descripción técnica');
  });

  it('sin texto para el cliente, ve la descripción (RF-7)', async () => {
    const client = await newClient();
    const { causaId } = await causaWith(client.id);
    const created = await movement(causaId);

    expect((await visibility.findVisible(client.id, created.causaId, created.id)).texto).toBe(
      'Descripción técnica interna.',
    );
  });

  it('responde el mismo 404 para un movimiento oculto, de una causa no vinculada o inexistente (RF-33)', async () => {
    const client = await newClient();
    const other = await newClient();
    const { causaId } = await causaWith(client.id);
    const { causaId: foreignCausa } = await causaWith(other.id);
    const hidden = await movement(causaId, { visible: false });
    const foreign = await movement(foreignCausa);

    await expectNotFound(visibility.findVisible(client.id, hidden.causaId, hidden.id));
    await expectNotFound(visibility.findVisible(client.id, foreign.causaId, foreign.id));
    await expectNotFound(visibility.findVisible(client.id, causaId, 999999));
  });

  it('responde el mismo 404 para un movimiento visible pedido dentro de otra causa del cliente (spec 004, RF-29)', async () => {
    const client = await newClient();
    const { causaId } = await causaWith(client.id);
    const { causaId: otherCausa } = await causaWith(client.id);
    const fromOther = await movement(otherCausa);

    await expectNotFound(visibility.findVisible(client.id, causaId, fromOther.id));
    expect(await visibility.findVisible(client.id, otherCausa, fromOther.id)).toMatchObject({
      id: fromOther.id,
    });
  });

  it('canSeeCausa exige la cuenta de cliente activa y el vínculo vigente', async () => {
    const client = await newClient();
    const other = await newClient();
    const { causaId } = await causaWith(client.id);

    expect(await visibility.canSeeCausa(client.id, causaId)).toBe(true);
    expect(await visibility.canSeeCausa(other.id, causaId)).toBe(false);
    expect(await visibility.canSeeCausa(lawyer.id, causaId)).toBe(false);
    expect(await visibility.canSeeCausa(client.id, 999999)).toBe(false);
  });

  it('un movimiento visible anulado se ve marcado como anulado (RF-17)', async () => {
    const client = await newClient();
    const { causaId } = await causaWith(client.id);
    const created = await movement(causaId, { anulado: true });

    expect(await visibility.findVisible(client.id, created.causaId, created.id)).toMatchObject({
      anulado: true,
    });
  });

  it('ve los movimientos cargados antes de quedar vinculado (RF-32)', async () => {
    const client = await newClient();
    const causa = await createTestCausa(app, { responsableId: lawyer.id, creadoPorId: lawyer.id });
    const earlier = await movement(causa.id);
    await expect(visibility.listVisible(client.id, causa.id)).resolves.toBeNull();

    await panel('post', `/api/panel/causas/${causa.id}/partes`)
      .send({ rol: 'actor', clienteId: client.id })
      .expect(201);

    expect(await visibility.findVisible(client.id, earlier.causaId, earlier.id)).toMatchObject({
      id: earlier.id,
    });
  });

  it('deja de verlos al desvincularlo como parte (RF-32)', async () => {
    const client = await newClient();
    const { causaId, parteId } = await causaWith(client.id);
    const created = await movement(causaId);

    await panel('post', `/api/panel/causas/${causaId}/partes/${parteId}/desvincular`).expect(200);

    await expectNotFound(visibility.findVisible(client.id, created.causaId, created.id));
    await expect(visibility.listVisible(client.id, causaId)).resolves.toBeNull();
  });

  it('deja de verlos al desactivar la causa', async () => {
    const client = await newClient();
    const { causaId } = await causaWith(client.id);
    const created = await movement(causaId);

    await panel('post', `/api/panel/causas/${causaId}/desactivar`).expect(204);

    await expectNotFound(visibility.findVisible(client.id, created.causaId, created.id));
  });

  it('deja de verlos con la cuenta desactivada, y los recupera al reactivarla', async () => {
    const client = await newClient();
    const { causaId } = await causaWith(client.id);
    const created = await movement(causaId);
    const users = app.get(DataSource).getRepository(Usuario);

    await users.update(client.id, { activo: false });
    await expectNotFound(visibility.findVisible(client.id, created.causaId, created.id));

    await users.update(client.id, { activo: true });
    expect(await visibility.findVisible(client.id, created.causaId, created.id)).toMatchObject({
      id: created.id,
    });
  });

  it.each(['archivada', 'finalizada'] as const)(
    'los sigue viendo con la causa %s',
    async (estado) => {
      const client = await newClient();
      const { causaId } = await causaWith(client.id, estado);
      const created = await movement(causaId);

      expect(await visibility.findVisible(client.id, created.causaId, created.id)).toMatchObject({
        id: created.id,
      });
    },
  );

  it('listVisible devuelve solo los visibles, anulados incluidos, en el orden del historial', async () => {
    const client = await newClient();
    const { causaId } = await causaWith(client.id);
    const older = await movement(causaId, { fecha: '2024-01-01' });
    await movement(causaId, { fecha: '2024-02-01', visible: false });
    const annulled = await movement(causaId, { fecha: '2024-03-01', anulado: true });
    const newer = await movement(causaId, { fecha: '2024-04-01', textoCliente: 'Texto.' });

    const page = await visibility.listVisible(client.id, causaId);

    expect(page).toMatchObject({ pagina: 1, haySiguiente: false });
    expect(page).not.toHaveProperty('total');
    expect(page!.items.map((item) => [item.id, item.anulado])).toEqual([
      [newer.id, false],
      [annulled.id, true],
      [older.id, false],
    ]);
    for (const item of page!.items) {
      expect(Object.keys(item).sort()).toEqual(['anulado', 'fecha', 'id', 'texto', 'tipo']);
    }
  });

  it('listVisible pagina de a 20 solo los visibles, con haySiguiente y sin total (spec 004, RF-24, RF-26)', async () => {
    const client = await newClient();
    const { causaId } = await causaWith(client.id);
    for (let day = 1; day <= 21; day++) {
      await movement(causaId, { fecha: `2024-01-${String(day).padStart(2, '0')}` });
    }
    for (let day = 1; day <= 5; day++) {
      await movement(causaId, { fecha: `2024-02-0${day}`, visible: false });
    }

    const first = await visibility.listVisible(client.id, causaId, 1);
    const second = await visibility.listVisible(client.id, causaId, 2);

    expect(first).toMatchObject({ pagina: 1, haySiguiente: true });
    expect(first!.items).toHaveLength(20);
    expect(first!.items[0].fecha).toBe('2024-01-21');
    expect(second).toMatchObject({ pagina: 2, haySiguiente: false });
    expect(second!.items.map((item) => item.fecha)).toEqual(['2024-01-01']);
    expect(first).not.toHaveProperty('total');
    expect(second).not.toHaveProperty('total');
  });

  it('un integrante no es un cliente: no ve movimientos por esta regla', async () => {
    const causa = await createTestCausa(app, { responsableId: lawyer.id, creadoPorId: lawyer.id });
    const created = await movement(causa.id);

    await expectNotFound(visibility.findVisible(lawyer.id, created.causaId, created.id));
  });
});
