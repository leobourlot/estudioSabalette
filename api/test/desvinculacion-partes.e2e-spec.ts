import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Causa } from '../src/causas/causa.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const CAUSAS = '/api/panel/causas';

interface PartyBody {
  id: number;
  nombre: string | null;
  esCliente: boolean;
}

/** RF-22 a RF-25, RF-27: desvincular y volver a vincular partes. */
describe('POST /:id/partes/:parteId/desvincular y /revincular', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let ana: Usuario;
  let session: TestSession;

  const withSession = (call: request.Test) =>
    call.set('Cookie', `access_token=${session.accessToken}`);
  const unlink = (causaId: number, parteId: number | string) =>
    withSession(
      request(app.getHttpServer()).post(`${CAUSAS}/${causaId}/partes/${parteId}/desvincular`),
    );
  const relink = (causaId: number, parteId: number | string) =>
    withSession(
      request(app.getHttpServer()).post(`${CAUSAS}/${causaId}/partes/${parteId}/revincular`),
    );
  const addParty = (causaId: number, body: object) =>
    withSession(request(app.getHttpServer()).post(`${CAUSAS}/${causaId}/partes`)).send(body);
  const getCausa = (id: number) => withSession(request(app.getHttpServer()).get(`${CAUSAS}/${id}`));

  /** Causa con Pedro López (no cliente) y Ana Gómez (cliente). */
  const freshCausa = async (changes: Partial<Causa> = {}) => {
    const causa = await createTestCausa(app, {
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      partes: [{ nombre: 'Pedro', apellido: 'López', dni: '20111222' }, { clienteId: ana.id }],
      ...changes,
    });
    const detail = await getCausa(causa.id).expect(200);
    const [pedro, anaParty] = detail.body.partes as PartyBody[];
    return { causa, pedro, anaParty };
  };

  const setActive = (table: string, id: number | string, column: string, value: boolean) =>
    app.get(DataSource).query(`UPDATE ${table} SET ${column} = ? WHERE id = ?`, [value, id]);

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);

    lawyer = await createTestUser(app, {
      email: 'abogado@estudio.com',
      nombre: 'Luis',
      apellido: 'Sosa',
    });
    ana = await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });
    session = await loginAs(app, 'abogado@estudio.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('desvincular (RF-22, RF-23, RF-27)', () => {
    it('pasa la parte a las desvinculadas, la conserva y registra la modificación', async () => {
      const { causa, anaParty } = await freshCausa();

      const response = await unlink(causa.id, anaParty.id).expect(200);

      expect(response.body.partes.map((parte: PartyBody) => parte.nombre)).toEqual(['Pedro']);
      expect(response.body.partesDesvinculadas).toEqual([
        expect.objectContaining({ id: anaParty.id, esCliente: true, nombre: 'Ana' }),
      ]);
      expect(response.body.modificadoPor).toMatchObject({ id: lawyer.id });
      const [row]: { vigente: number }[] = await app
        .get(DataSource)
        .query('SELECT vigente FROM partes WHERE id = ?', [anaParty.id]);
      expect(Number(row.vigente)).toBe(0);
    });

    it('rechaza desvincular la única parte vigente', async () => {
      const { causa, pedro, anaParty } = await freshCausa();
      await unlink(causa.id, anaParty.id).expect(200);

      const response = await unlink(causa.id, pedro.id).expect(409);

      expect(response.body.message).toBe('La causa debe tener al menos una parte');
    });

    it('de dos desvinculaciones simultáneas de las dos últimas partes, solo una se aplica', async () => {
      const { causa, pedro, anaParty } = await freshCausa();

      const responses = await Promise.all([
        unlink(causa.id, pedro.id),
        unlink(causa.id, anaParty.id),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      const detail = await getCausa(causa.id).expect(200);
      expect(detail.body.partes).toHaveLength(1);
    });

    it('responde 404 a una parte ya desvinculada, de otra causa o inexistente (RF-25)', async () => {
      const { causa, anaParty } = await freshCausa();
      const other = await freshCausa();
      await unlink(causa.id, anaParty.id).expect(200);

      await unlink(causa.id, anaParty.id).expect(404);
      await unlink(causa.id, other.pedro.id).expect(404);
      const response = await unlink(causa.id, 'abc').expect(404);

      expect(response.body.message).toBe('No existe esa parte');
    });
  });

  describe('volver a vincular (RF-24)', () => {
    it('vuelve a poner la parte entre las vigentes', async () => {
      const { causa, anaParty } = await freshCausa();
      await unlink(causa.id, anaParty.id).expect(200);

      const response = await relink(causa.id, anaParty.id).expect(200);

      expect(response.body.causa.partes.map((parte: PartyBody) => parte.id)).toContain(anaParty.id);
      expect(response.body.causa.partesDesvinculadas).toEqual([]);
    });

    it('avisa en qué causas figura como no cliente el cliente que vuelve a vincular (RF-20)', async () => {
      const asNonClient = await createTestCausa(app, {
        responsableId: lawyer.id,
        creadoPorId: lawyer.id,
        partes: [{ nombre: 'Ana', apellido: 'Gómez', dni: '30123456' }],
      });
      const { causa, anaParty } = await freshCausa();
      await unlink(causa.id, anaParty.id).expect(200);

      const response = await relink(causa.id, anaParty.id).expect(200);

      expect(response.body.causasComoNoCliente.map((other: { id: number }) => other.id)).toContain(
        asNonClient.id,
      );
    });

    it('rechaza volver a vincular a un cliente desactivado (RF-17)', async () => {
      const bruno = await createTestUser(app, {
        rol: 'cliente',
        email: 'bruno@correo.com',
        nombre: 'Bruno',
        apellido: 'Díaz',
        cliente: { tipoPersona: 'fisica', dni: '28999888' },
      });
      const causa = await createTestCausa(app, {
        responsableId: lawyer.id,
        creadoPorId: lawyer.id,
        partes: [{ nombre: 'Pedro', apellido: 'López' }, { clienteId: bruno.id }],
      });
      const detail = await getCausa(causa.id).expect(200);
      const brunoParty = detail.body.partes[1] as PartyBody;
      await unlink(causa.id, brunoParty.id).expect(200);
      await setActive('usuarios', bruno.id, 'activo', false);

      const response = await relink(causa.id, brunoParty.id).expect(409);

      expect(response.body.message).toBe('El cliente está desactivado');
    });

    it('rechaza volver a vincular a una persona que ya volvió a ser parte (RF-18)', async () => {
      const { causa, anaParty } = await freshCausa();
      await unlink(causa.id, anaParty.id).expect(200);
      await addParty(causa.id, { rol: 'tercero', clienteId: ana.id }).expect(201);

      const response = await relink(causa.id, anaParty.id).expect(409);

      expect(response.body.message).toBe('Esa persona ya es parte de la causa');
    });

    it('responde 404 a una parte vigente o de otra causa', async () => {
      const { causa, pedro } = await freshCausa();
      const other = await freshCausa();
      await unlink(other.causa.id, other.anaParty.id).expect(200);

      await relink(causa.id, pedro.id).expect(404);
      await relink(causa.id, other.anaParty.id).expect(404);
    });
  });

  it('no desvincula ni vuelve a vincular en una causa desactivada (RF-41)', async () => {
    const { causa, pedro } = await freshCausa();
    await setActive('causas', causa.id, 'activa', false);

    const response = await unlink(causa.id, pedro.id).expect(409);
    await relink(causa.id, pedro.id).expect(409);

    expect(response.body.message).toBe('La causa está desactivada. Reactivala para modificarla');
  });
});
