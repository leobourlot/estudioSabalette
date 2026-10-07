import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Movimiento, MOVEMENT_TYPES } from '../src/movimientos/movimiento.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables } from './utilidades/movimientos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const MOVEMENTS = 5000;
const BATCH = 250;
const LIMIT_MS = 2000;

/** RNF de rendimiento: historial de una causa con 5.000 movimientos en menos de 2 segundos. */
describe('rendimiento del historial de movimientos', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;
  let causaId: number;

  /** Tiempo de respuesta de una consulta del historial, en milisegundos. */
  const timed = async (query: Record<string, string | boolean>) => {
    const start = performance.now();
    const response = await request(app.getHttpServer())
      .get(`/api/panel/causas/${causaId}/movimientos`)
      .query(query)
      .set('Cookie', `access_token=${session.accessToken}`)
      .expect(200);
    return { ms: performance.now() - start, body: response.body };
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearMovementTables(app);
    lawyer = await createTestUser(app, {
      email: 'abogado@estudio.com',
      nombre: 'Luis',
      apellido: 'Sosa',
    });
    session = await loginAs(app, lawyer.email!);
    causaId = (await createTestCausa(app, { responsableId: lawyer.id, creadoPorId: lawyer.id })).id;

    // Descripciones largas (unos 1.900 caracteres), para que la búsqueda por fragmento
    // recorra un volumen parecido al peor caso.
    const filler = 'Se agrega a autos la documental acompañada por la parte actora. '.repeat(30);
    const repository = app.get(DataSource).getRepository(Movimiento);
    const creadoEn = new Date();
    for (let start = 0; start < MOVEMENTS; start += BATCH) {
      const rows = Array.from({ length: BATCH }, (_, offset) => {
        const index = start + offset;
        const day = String((index % 28) + 1).padStart(2, '0');
        const month = String((index % 12) + 1).padStart(2, '0');
        return {
          causaId,
          fecha: `${2000 + (index % 25)}-${month}-${day}`,
          tipo: MOVEMENT_TYPES[index % MOVEMENT_TYPES.length],
          descripcion: `${filler} Movimiento número ${index}.`,
          textoCliente: index % 2 === 0 ? `Texto para el cliente del movimiento ${index}.` : null,
          visible: index % 2 === 0,
          anulado: index % 10 === 0,
          creadoPorId: lawyer.id,
          creadoEn,
        };
      });
      await repository.insert(rows);
    }
  }, 300_000);

  afterAll(async () => {
    await clearMovementTables(app);
    await app?.close();
  });

  it('la primera página sin filtros responde en menos de 2 segundos', async () => {
    const { ms, body } = await timed({});

    expect(body.total).toBe(MOVEMENTS);
    expect(body.items).toHaveLength(20);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('una búsqueda sin coincidencias, que recorre todos los textos, responde en menos de 2 segundos', async () => {
    const { ms, body } = await timed({ buscar: 'fragmento que no aparece en ningún movimiento' });

    expect(body.total).toBe(0);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('el buscador combinado con todos los filtros responde en menos de 2 segundos', async () => {
    const { ms, body } = await timed({
      buscar: 'documental',
      tipo: 'providencia',
      visibilidad: 'visibles',
      desde: '2005-01-01',
      hasta: '2020-12-31',
      ocultarAnulados: true,
      pagina: '3',
    });

    expect(body.total).toBeGreaterThan(0);
    expect(ms).toBeLessThan(LIMIT_MS);
  });
});
