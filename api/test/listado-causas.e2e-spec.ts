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

/** RF-36, RF-38, RF-39: listado paginado, orden y filtros. */
describe('GET /api/panel/causas (listado y filtros)', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let colleague: Usuario;
  let inactive: Usuario;
  let session: TestSession;
  const ids: Record<'A' | 'B' | 'C' | 'D', number> = { A: 0, B: 0, C: 0, D: 0 };

  const list = (query = '') =>
    request(app.getHttpServer())
      .get(`${CAUSAS}${query}`)
      .set('Cookie', `access_token=${session.accessToken}`);

  const idsOf = (body: { items: { id: number }[] }) => body.items.map((item) => item.id);

  /** Crea una causa y fija sus fechas de alta y de modificación. */
  const causaAt = async (
    creadoEn: string,
    modificadoEn: string | null,
    changes: Partial<Causa> & { colaboradorIds?: number[] },
  ) => {
    const causa = await createTestCausa(app, {
      creadoPorId: lawyer.id,
      responsableId: lawyer.id,
      ...changes,
    });
    await app
      .get(DataSource)
      .query('UPDATE causas SET creadoEn = ?, modificadoEn = ? WHERE id = ?', [
        creadoEn,
        modificadoEn,
        causa.id,
      ]);
    return causa.id;
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);

    lawyer = await createTestUser(app, {
      email: 'juan@estudio.com',
      nombre: 'Juan',
      apellido: 'Álvarez',
    });
    colleague = await createTestUser(app, {
      email: 'lucia@estudio.com',
      nombre: 'Lucía',
      apellido: 'Benítez',
    });
    inactive = await createTestUser(app, {
      email: 'bruno@estudio.com',
      nombre: 'Bruno',
      apellido: 'Méndez',
    });

    ids.A = await causaAt('2026-01-01 10:00:00', null, {
      caratula: 'Causa A',
      fuero: 'civil',
      estado: 'en_tramite',
    });
    ids.B = await causaAt('2026-01-02 10:00:00', '2026-03-01 10:00:00', {
      caratula: 'Causa B',
      fuero: 'laboral',
      estado: 'archivada',
      responsableId: colleague.id,
      colaboradorIds: [lawyer.id],
    });
    ids.C = await causaAt('2026-02-01 10:00:00', null, {
      caratula: 'Causa C',
      fuero: 'civil',
      estado: 'finalizada',
      responsableId: inactive.id,
      esIncidente: true,
      expedientePrincipal: '1/2020',
    });
    ids.D = await causaAt('2026-02-15 10:00:00', null, {
      caratula: 'Causa D',
      fuero: 'civil',
      responsableId: colleague.id,
      activa: false,
    });
    await app.get(DataSource).query('UPDATE usuarios SET activo = 0 WHERE id = ?', [inactive.id]);

    session = await loginAs(app, 'juan@estudio.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('lista las causas activas, primero las modificadas o creadas más recientemente (RF-36)', async () => {
    const response = await list().expect(200);

    expect(idsOf(response.body)).toEqual([ids.B, ids.C, ids.A]);
    expect(response.body).toMatchObject({ total: 3, pagina: 1, porPagina: 20 });
  });

  it('muestra los datos del listado de cada causa, incluido si es incidente y su responsable (RF-36)', async () => {
    const response = await list().expect(200);

    expect(response.body.items[1]).toEqual({
      id: ids.C,
      caratula: 'Causa C',
      numeroExpediente: null,
      juzgado: null,
      fuero: 'civil',
      estado: 'finalizada',
      esIncidente: true,
      expedientePrincipal: '1/2020',
      activa: true,
      responsable: {
        id: inactive.id,
        nombre: 'Bruno',
        apellido: 'Méndez',
        rol: 'abogado',
        activo: false,
      },
      creadoEn: expect.any(String),
      modificadoEn: null,
    });
  });

  // Consultas y resultados como funciones: los ids existen recién después de beforeAll.
  it.each<[string, () => string, () => number[]]>([
    ['fuero', () => '?fuero=civil', () => [ids.C, ids.A]],
    ['estado', () => '?estado=archivada', () => [ids.B]],
    ['responsable', () => `?responsableId=${colleague.id}`, () => [ids.B]],
    ['"solo mis causas" (responsable o colaborador)', () => '?mias=true', () => [ids.B, ids.A]],
    ['"con responsable desactivado"', () => '?responsableDesactivado=true', () => [ids.C]],
  ])('filtra por %s (RF-38)', async (_case, query, expected) => {
    const response = await list(query()).expect(200);

    expect(idsOf(response.body)).toEqual(expected());
  });

  it('combina los filtros (RF-38)', async () => {
    const civilAndMine = await list('?fuero=civil&mias=true').expect(200);
    const civilFinished = await list(
      '?fuero=civil&estado=finalizada&responsableDesactivado=true',
    ).expect(200);

    expect(idsOf(civilAndMine.body)).toEqual([ids.A]);
    expect(idsOf(civilFinished.body)).toEqual([ids.C]);
  });

  it('los filtros en false no filtran', async () => {
    const response = await list(
      '?mias=false&responsableDesactivado=false&incluirDesactivadas=false',
    ).expect(200);

    expect(idsOf(response.body)).toEqual([ids.B, ids.C, ids.A]);
  });

  it('"mostrar desactivadas" incluye las desactivadas, identificadas como tales (RF-39)', async () => {
    const response = await list('?incluirDesactivadas=true').expect(200);

    expect(idsOf(response.body)).toEqual([ids.B, ids.D, ids.C, ids.A]);
    expect(response.body.items[1]).toMatchObject({ id: ids.D, activa: false });

    const combined = await list(`?incluirDesactivadas=true&responsableId=${colleague.id}`).expect(
      200,
    );
    expect(idsOf(combined.body)).toEqual([ids.B, ids.D]);
  });

  it('rechaza parámetros inválidos', async () => {
    const response = await list('?fuero=comercial&pagina=0').expect(400);

    expect(response.body.message).toEqual([
      'La página debe ser un número entero mayor o igual a 1',
      'El fuero debe ser civil, penal, familia, laboral, federal u otro',
    ]);
  });

  it('pagina de a 20 causas, sin repetirlas entre páginas (RF-36)', async () => {
    for (let index = 0; index < 22; index++) {
      await causaAt(`2025-06-${String(index + 1).padStart(2, '0')} 10:00:00`, null, {
        caratula: `Causa vieja ${index}`,
      });
    }

    const first = await list('?pagina=1').expect(200);
    const second = await list('?pagina=2').expect(200);

    expect(first.body).toMatchObject({ total: 25, pagina: 1, porPagina: 20 });
    expect(first.body.items).toHaveLength(20);
    expect(second.body.items).toHaveLength(5);
    expect(new Set([...idsOf(first.body), ...idsOf(second.body)]).size).toBe(25);
    expect(idsOf(first.body).slice(0, 3)).toEqual([ids.B, ids.C, ids.A]);
  });
});
