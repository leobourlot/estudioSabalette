import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { bulkInsertTestFallos, clearRulingTables } from './utilidades/fallos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const RULINGS = 10_000;
const KEYWORDS = 60;
const LIMIT_MS = 2000;

/**
 * RNF de rendimiento: con 10.000 fallos, el listado con cualquier combinación de buscador y
 * filtros, y las sugerencias de palabras clave, responden en menos de 2 segundos.
 */
describe('rendimiento de la jurisprudencia', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;
  let keywordIds: number[];

  /** Tiempo de respuesta de una consulta, en milisegundos. */
  const timed = async (path: string, query: Record<string, string>) => {
    const start = performance.now();
    const response = await request(app.getHttpServer())
      .get(path)
      .query(query)
      .set('Cookie', `access_token=${session.accessToken}`)
      .expect(200);
    return { ms: performance.now() - start, body: response.body };
  };
  const list = (query: Record<string, string>) => timed('/api/panel/jurisprudencia', query);
  const suggest = (query: Record<string, string>) =>
    timed('/api/panel/jurisprudencia/palabras-clave', query);

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearRulingTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    session = await loginAs(app, lawyer.email!);

    // Sumarios de unos 4.900 caracteres, cerca del máximo, para que la búsqueda por fragmento
    // recorra un volumen parecido al peor caso (unos 50 MB).
    const filler =
      'El tribunal sostuvo que la responsabilidad del demandado surge de la prueba producida. '.repeat(
        56,
      );
    keywordIds = await bulkInsertTestFallos(app, {
      count: RULINGS,
      creadoPorId: lawyer.id,
      sumarioFiller: filler,
      keywordCount: KEYWORDS,
    });
  }, 900_000);

  afterAll(async () => {
    await clearRulingTables(app);
    await app?.close();
  });

  it('la primera página sin filtros responde en menos de 2 segundos', async () => {
    const { ms, body } = await list({});

    expect(body.items).toHaveLength(20);
    expect(body.haySiguiente).toBe(true);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('una página lejana responde en menos de 2 segundos', async () => {
    const { ms, body } = await list({ pagina: '400' });

    expect(body.items).toHaveLength(20);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('una búsqueda sin coincidencias, que recorre todos los textos, responde en menos de 2 segundos', async () => {
    const { ms, body } = await list({ buscar: 'fragmento que no aparece en ningún fallo' });

    expect(body.items).toEqual([]);
    expect(body.hayFallos).toBe(true);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('una búsqueda que coincide con todos los sumarios responde en menos de 2 segundos', async () => {
    const { ms, body } = await list({ buscar: 'prueba producida' });

    expect(body.items).toHaveLength(20);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('el buscador combinado con todos los filtros responde en menos de 2 segundos', async () => {
    const { ms, body } = await list({
      buscar: 'responsabilidad',
      palabrasClave: `${keywordIds[0]},${keywordIds[1]}`,
      fuero: 'civil',
      desde: '2000-01-01',
      hasta: '2024-12-31',
      incluirDesactivados: 'true',
    });

    expect(body.items.length).toBeGreaterThan(0);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('el filtro por dos palabras clave responde en menos de 2 segundos', async () => {
    const { ms, body } = await list({ palabrasClave: `${keywordIds[5]},${keywordIds[6]}` });

    expect(body.items).toHaveLength(20);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('las sugerencias para la carga y para el filtro responden en menos de 2 segundos', async () => {
    const carga = await suggest({ buscar: 'tema de prueba' });
    const filtro = await suggest({ buscar: 'tema de prueba', para: 'filtro' });

    expect(carga.body).toHaveLength(10);
    // Unos 500 fallos por palabra: 10.000 fallos con tres palabras cada uno, entre 60.
    expect(carga.body[0].cantidad).toBeGreaterThanOrEqual((RULINGS * 3) / KEYWORDS);
    expect(filtro.body).toHaveLength(10);
    expect(carga.ms).toBeLessThan(LIMIT_MS);
    expect(filtro.ms).toBeLessThan(LIMIT_MS);
  });
});
