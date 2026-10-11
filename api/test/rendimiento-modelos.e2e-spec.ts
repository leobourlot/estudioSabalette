import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import {
  bulkInsertTestModelos,
  clearModelTables,
  createTestModelo,
} from './utilidades/modelos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const MODELS = 500;
const PARTIES = 50;
const LIMIT_MS = 2000;

/**
 * RNF de rendimiento: con 500 modelos de hasta 50.000 caracteres, el listado con cualquier
 * combinación de buscador y filtros responde en menos de 2 segundos, y completar un modelo de
 * 50.000 caracteres en una causa con 50 partes también.
 */
describe('rendimiento de los modelos de escritos', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;
  let causaId: number;
  let longModelId: number;

  /** Tiempo de respuesta de una consulta, en milisegundos. */
  const timed = async (path: string, query: Record<string, string> = {}) => {
    const start = performance.now();
    const response = await request(app.getHttpServer())
      .get(path)
      .query(query)
      .set('Cookie', `access_token=${session.accessToken}`)
      .expect(200);
    return { ms: performance.now() - start, body: response.body };
  };
  const list = (query: Record<string, string>) => timed('/api/panel/modelos-escritos', query);

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearModelTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    session = await loginAs(app, lawyer.email!);

    // Textos de unos 49.900 caracteres, cerca del máximo, para que la búsqueda por fragmento
    // recorra un volumen parecido al peor caso (unos 25 MB).
    const paragraph =
      'Que vengo por el presente a promover formal demanda por los hechos y el derecho que paso a exponer.\n';
    const filler = paragraph.repeat(Math.floor(49_900 / paragraph.length));
    await bulkInsertTestModelos(app, { count: MODELS, creadoPorId: lawyer.id, textFiller: filler });

    // Una causa con 50 partes: 20 actores, 20 demandados y 10 terceros.
    causaId = (
      await createTestCausa(app, {
        responsableId: lawyer.id,
        creadoPorId: lawyer.id,
        numeroExpediente: '1234/2026',
        juzgado: 'Juzgado Civil Nº 3',
        partes: Array.from({ length: PARTIES }, (_, index) => ({
          rol:
            index < 20
              ? ('actor' as const)
              : index < 40
                ? ('demandado' as const)
                : ('tercero' as const),
          nombre: `Nombre${index}`,
          apellido: `Apellido${String(index).padStart(2, '0')}`,
          dni: String(20_000_000 + index),
        })),
      })
    ).id;

    // Un modelo de 50.000 caracteres con todas las variables de partes, varias veces.
    const marks =
      '#ACTORES_CON_DOCUMENTO# contra #DEMANDADOS_CON_DOCUMENTO#, con citación de #TERCEROS#, en "#CARATULA#", Expte. Nº #NUMERO_EXPEDIENTE#, ante #JUZGADO#, el #FECHA_EN_LETRAS#.\n';
    const body = `${marks.repeat(20)}${paragraph.repeat(500)}`;
    longModelId = (
      await createTestModelo(app, {
        creadoPorId: lawyer.id,
        titulo: 'Zzz modelo largo con variables',
        texto: body.slice(0, body.lastIndexOf('\n', 50_000)),
      })
    ).id;
  }, 900_000);

  afterAll(async () => {
    await clearModelTables(app);
    await app?.close();
  });

  it('la primera página sin filtros responde en menos de 2 segundos', async () => {
    const { ms, body } = await list({});

    expect(body.items).toHaveLength(20);
    expect(body.haySiguiente).toBe(true);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('la última página responde en menos de 2 segundos', async () => {
    const { ms, body } = await list({ pagina: '25' });

    expect(body.items).toHaveLength(20);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('una búsqueda sin coincidencias, que recorre todos los textos, responde en menos de 2 segundos', async () => {
    const { ms, body } = await list({ buscar: 'fragmento que no aparece en ningún modelo' });

    expect(body.items).toEqual([]);
    expect(body.hayModelos).toBe(true);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('una búsqueda que coincide con todos los textos responde en menos de 2 segundos', async () => {
    const { ms, body } = await list({ buscar: 'formal demanda' });

    expect(body.items).toHaveLength(20);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('una búsqueda que coincide solo al final de un texto responde en menos de 2 segundos', async () => {
    const { ms, body } = await list({ buscar: 'Modelo número 499.' });

    expect(body.items).toHaveLength(1);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('el buscador combinado con todos los filtros responde en menos de 2 segundos', async () => {
    const { ms, body } = await list({
      buscar: 'derecho que paso a exponer',
      tipo: 'demanda',
      fuero: 'civil',
      incluirDesactivados: 'true',
    });

    expect(body.items.length).toBeGreaterThan(0);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('completar un modelo de 50.000 caracteres en una causa con 50 partes responde en menos de 2 segundos', async () => {
    const { ms, body } = await timed(`/api/panel/causas/${causaId}/escritos/${longModelId}`);

    // Los 20 actores, enumerados con su documento, en cada una de las 20 repeticiones.
    expect(body.texto).toContain('Nombre0 Apellido00, DNI 20.000.000; ');
    expect(body.texto).toContain('; y Nombre19 Apellido19, DNI 20.000.019 contra ');
    expect(body.texto).not.toContain('#');
    expect(body.faltantes).toEqual([]);
    expect(body.texto.length).toBeGreaterThan(50_000);
    expect(ms).toBeLessThan(LIMIT_MS);
  });
});
