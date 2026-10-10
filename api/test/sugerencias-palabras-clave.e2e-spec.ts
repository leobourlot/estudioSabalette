import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import {
  clearRulingTables,
  createTestFallo,
  findOrCreateTestKeyword,
} from './utilidades/fallos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const SUGGESTIONS = '/api/panel/jurisprudencia/palabras-clave';

interface Suggestion {
  id: number;
  texto: string;
  cantidad: number;
}

/** RF-13, RF-15, RF-25, RF-30: sugerencias de palabras clave. */
describe('sugerencias de palabras clave', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;
  let counter = 0;

  const suggest = (query: Record<string, string>) =>
    request(app.getHttpServer())
      .get(SUGGESTIONS)
      .query(query)
      .set('Cookie', `access_token=${session.accessToken}`);

  const ruling = (palabrasClave: string[], activo = true) =>
    createTestFallo(app, {
      creadoPorId: lawyer.id,
      caratula: `Fallo de sugerencias ${++counter}`,
      palabrasClave,
      activo,
    });

  const summary = (body: Suggestion[]) => body.map(({ texto, cantidad }) => [texto, cantidad]);

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearRulingTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    session = await loginAs(app, lawyer.email!);

    // "daño moral": 3 fallos activos y 1 desactivado. "daño emergente" y "Daño punitivo": 1 activo.
    await ruling(['daño moral', 'daño emergente']);
    await ruling(['daño moral', 'Daño punitivo']);
    await ruling(['daño moral', 'responsabilidad objetiva']);
    await ruling(['daño moral', 'daño en desuso'], false);
    // Solo la usan fallos desactivados.
    await ruling(['daño en desuso'], false);
    // Está en el catálogo, pero ningún fallo la usa.
    await findOrCreateTestKeyword(app, 'daño sin fallos');
    // Para probar el comodín "_": si actuara como comodín, "art_" encontraría las dos.
    await ruling(['art_1113']);
    await ruling(['art 1113']);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('sugiere por fragmento, sin distinguir mayúsculas ni tildes y con la ñ como n (RF-9, RF-13)', async () => {
    const response = await suggest({ buscar: 'DANO' }).expect(200);

    expect(summary(response.body)).toEqual([
      ['daño moral', 3],
      ['daño emergente', 1],
      ['Daño punitivo', 1],
    ]);
    expect(Object.keys(response.body[0]).sort()).toEqual(['cantidad', 'id', 'texto']);
    expect(typeof response.body[0].cantidad).toBe('number');
  });

  it('encuentra un fragmento en medio de la palabra', async () => {
    const response = await suggest({ buscar: 'objet' }).expect(200);
    expect(summary(response.body)).toEqual([['responsabilidad objetiva', 1]]);
  });

  it('para la carga no sugiere las que solo usan fallos desactivados o ninguno (RF-13, RF-30)', async () => {
    const texts = (await suggest({ buscar: 'daño', para: 'carga' }).expect(200)).body.map(
      (suggestion: Suggestion) => suggestion.texto,
    );

    expect(texts).not.toContain('daño en desuso');
    expect(texts).not.toContain('daño sin fallos');
  });

  it('para el filtro sugiere todo el catálogo, con cantidad 0 si no hay fallos activos (RF-25)', async () => {
    const response = await suggest({ buscar: 'daño', para: 'filtro' }).expect(200);

    expect(summary(response.body)).toEqual([
      ['daño moral', 3],
      ['daño emergente', 1],
      ['Daño punitivo', 1],
      ['daño en desuso', 0],
      ['daño sin fallos', 0],
    ]);
  });

  it('devuelve como mucho 10 sugerencias', async () => {
    for (let index = 0; index < 12; index++) await ruling([`tema repetido ${index}`]);

    const response = await suggest({ buscar: 'tema repetido' }).expect(200);

    expect(response.body).toHaveLength(10);
  });

  it('busca _ como texto, no como comodín', async () => {
    expect(summary((await suggest({ buscar: 'art_' }).expect(200)).body)).toEqual([
      ['art_1113', 1],
    ]);
  });

  it('rechaza %: una palabra clave no puede tenerlo (RF-10)', async () => {
    const response = await suggest({ buscar: '50%' }).expect(400);
    expect(response.body.message).toContain('La búsqueda tiene caracteres no permitidos');
  });

  it('convierte lo escrito antes de buscar (RF-3)', async () => {
    const response = await suggest({ buscar: '  daño  moral ' }).expect(200);
    expect(summary(response.body)).toEqual([['daño moral', 3]]);
  });

  it.each([
    ['sin texto', {}, 'Escribí al menos 2 caracteres'],
    ['con un solo carácter', { buscar: 'd' }, 'Escribí al menos 2 caracteres'],
    ['con <', { buscar: 'da<' }, 'La búsqueda tiene caracteres no permitidos'],
    [
      'con un destino inválido',
      { buscar: 'daño', para: 'listado' },
      'El destino de las sugerencias debe ser carga o filtro',
    ],
  ])('responde 400 %s', async (_case, query, message) => {
    const response = await suggest(query as Record<string, string>).expect(400);
    expect(response.body.message).toContain(message);
  });

  it('no confunde "palabras-clave" con el id de un fallo', async () => {
    // Si la ruta se tomara como GET /:id, respondería 404 "No existe ese fallo".
    await suggest({ buscar: 'daño' }).expect(200);
  });

  it('una palabra deja de sugerirse al desactivar su único fallo y vuelve al reactivarlo (RF-15)', async () => {
    const fallo = await ruling(['prescripción liberatoria']);
    const act = (action: 'desactivar' | 'reactivar') =>
      request(app.getHttpServer())
        .post(`/api/panel/jurisprudencia/${fallo.id}/${action}`)
        .set('Cookie', `access_token=${session.accessToken}`)
        .expect(200);
    const suggested = async () =>
      summary((await suggest({ buscar: 'prescripcion' }).expect(200)).body);

    expect(await suggested()).toEqual([['prescripción liberatoria', 1]]);

    await act('desactivar');
    expect(await suggested()).toEqual([]);
    // Sigue en el catálogo: no se borra, y el filtro la sigue ofreciendo.
    expect(
      summary((await suggest({ buscar: 'prescripcion', para: 'filtro' }).expect(200)).body),
    ).toEqual([['prescripción liberatoria', 0]]);

    await act('reactivar');
    expect(await suggested()).toEqual([['prescripción liberatoria', 1]]);
  });

  it('quitarla del único fallo que la usa también la saca de las sugerencias, sin borrarla (RF-15)', async () => {
    const fallo = await ruling(['caducidad de instancia', 'otra palabra']);

    await request(app.getHttpServer())
      .patch(`/api/panel/jurisprudencia/${fallo.id}`)
      .set('Cookie', `access_token=${session.accessToken}`)
      .send({ palabrasClave: ['otra palabra'] })
      .expect(200);

    expect((await suggest({ buscar: 'caducidad' }).expect(200)).body).toEqual([]);
    expect(
      summary((await suggest({ buscar: 'caducidad', para: 'filtro' }).expect(200)).body),
    ).toEqual([['caducidad de instancia', 0]]);
  });
});
