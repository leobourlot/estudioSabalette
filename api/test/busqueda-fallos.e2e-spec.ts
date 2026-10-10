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

const RULINGS = '/api/panel/jurisprudencia';

/** RF-23 a RF-25: buscador y filtro por palabras clave del listado de jurisprudencia. */
describe('búsqueda de jurisprudencia', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;
  const keywordIds: Record<string, number> = {};

  const list = (query: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .get(RULINGS)
      .query(query)
      .set('Cookie', `access_token=${session.accessToken}`);

  const captions = async (query: Record<string, string>) =>
    ((await list(query).expect(200)).body.items as { caratula: string }[])
      .map((item) => item.caratula)
      .sort();

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearRulingTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    session = await loginAs(app, lawyer.email!);

    const ruling = (caratula: string, data: Parameters<typeof createTestFallo>[1]) =>
      createTestFallo(app, { ...data, caratula });
    const base = { creadoPorId: lawyer.id };

    await ruling('Pérez c/ López s/ daños', {
      ...base,
      tribunal: 'CNCiv., Sala A',
      fuero: 'civil',
      fecha: '2019-05-03',
      numero: '1234/2018',
      sumario: 'La responsabilidad del dueño de la cosa es objetiva.',
      palabrasClave: ['daño moral', 'accidente de tránsito'],
    });
    await ruling('Muñoz c/ Clínica del Sur', {
      ...base,
      tribunal: 'Cámara Federal de Rosario',
      fuero: 'federal',
      fecha: '2021-03-10',
      numero: 'FRO 5678-2020',
      sumario: 'Mala praxis: "(...) el consentimiento informado" es exigible. Incapacidad del 50%.',
      palabrasClave: ['daño moral', 'mala praxis'],
    });
    await ruling('Gómez c/ Seguros SA', {
      ...base,
      tribunal: 'Juzgado Laboral Nº 3',
      fuero: 'laboral',
      fecha: '2022-07-01',
      sumario: 'Despido en el año de prueba. Aplica el art_245 y una multa de 500 pesos.',
      palabrasClave: ['despido'],
    });
    await ruling('Fallo desactivado sobre daños', {
      ...base,
      tribunal: 'CNCiv., Sala B',
      fecha: '2018-01-01',
      sumario: 'Sumario de un fallo desactivado.',
      palabrasClave: ['daño moral', 'en desuso'],
      activo: false,
    });

    for (const texto of [
      'daño moral',
      'accidente de tránsito',
      'mala praxis',
      'despido',
      'en desuso',
    ]) {
      keywordIds[texto] = (await findOrCreateTestKeyword(app, texto)).id;
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('buscador (RF-23)', () => {
    it.each([
      ['un fragmento de la carátula', 'ere', ['Pérez c/ López s/ daños']],
      ['la carátula en mayúsculas y sin tildes', 'PEREZ', ['Pérez c/ López s/ daños']],
      ['un fragmento del tribunal', 'federal de ros', ['Muñoz c/ Clínica del Sur']],
      ['un fragmento del sumario', 'consentimiento', ['Muñoz c/ Clínica del Sur']],
      ['un fragmento del número', '5678', ['Muñoz c/ Clínica del Sur']],
      ['una palabra clave', 'transito', ['Pérez c/ López s/ daños']],
      [
        'una palabra clave sin la ñ',
        'dano moral',
        ['Muñoz c/ Clínica del Sur', 'Pérez c/ López s/ daños'],
      ],
      ['"ano" para "año"', 'ano de prueba', ['Gómez c/ Seguros SA']],
      ['"munoz" para "Muñoz"', 'munoz', ['Muñoz c/ Clínica del Sur']],
    ])('encuentra por %s', async (_case, buscar, expected) => {
      expect(await captions({ buscar })).toEqual(expected);
    });

    it.each([
      ['otro separador', '1234-2018'],
      ['sin separador', '12342018'],
      ['el mismo separador', '1234/2018'],
    ])('encuentra el número escrito con %s', async (_case, buscar) => {
      expect(await captions({ buscar })).toEqual(['Pérez c/ López s/ daños']);
    });

    it('encuentra un número con letras y otro separador', async () => {
      expect(await captions({ buscar: 'FRO 5678/2020' })).toEqual(['Muñoz c/ Clínica del Sur']);
    });

    it('"[...]" se convierte y encuentra los sumarios con "(...)" (RF-3, RF-24)', async () => {
      expect(await captions({ buscar: '[...]' })).toEqual(['Muñoz c/ Clínica del Sur']);
    });

    it('busca % y _ como texto, no como comodines (RF-24)', async () => {
      // "50%" no encuentra "500 pesos", y "art_" no encuentra otros "art" seguidos de algo.
      expect(await captions({ buscar: '50%' })).toEqual(['Muñoz c/ Clínica del Sur']);
      expect(await captions({ buscar: 'art_2' })).toEqual(['Gómez c/ Seguros SA']);
      expect(await captions({ buscar: 'a_t' })).toEqual([]);
    });

    it('con solo espacios muestra el listado como si no se hubiera buscado', async () => {
      expect(await captions({ buscar: '   ' })).toHaveLength(3);
    });

    it('no encuentra fallos desactivados, salvo con "Mostrar desactivados"', async () => {
      expect(await captions({ buscar: 'desactivado' })).toEqual([]);
      expect(await captions({ buscar: 'desactivado', incluirDesactivados: 'true' })).toEqual([
        'Fallo desactivado sobre daños',
      ]);
    });

    it('sin coincidencias, la lista queda vacía y hay fallos (RF-27)', async () => {
      const response = await list({ buscar: 'texto que no existe' }).expect(200);
      expect(response.body).toEqual({ items: [], pagina: 1, haySiguiente: false, hayFallos: true });
    });

    it.each([
      ['<script>', 'La búsqueda tiene caracteres no permitidos'],
      ['a=b', 'La búsqueda tiene caracteres no permitidos'],
      ['a'.repeat(101), 'La búsqueda puede tener hasta 100 caracteres'],
    ])('rechaza la búsqueda %j', async (buscar, message) => {
      const response = await list({ buscar }).expect(400);
      expect(response.body.message).toContain(message);
    });
  });

  describe('filtro por palabras clave (RF-25)', () => {
    it('con una palabra, muestra los fallos activos que la tienen', async () => {
      expect(await captions({ palabrasClave: String(keywordIds['daño moral']) })).toEqual([
        'Muñoz c/ Clínica del Sur',
        'Pérez c/ López s/ daños',
      ]);
    });

    it('con dos palabras, solo los fallos que tienen las dos', async () => {
      const palabrasClave = `${keywordIds['daño moral']},${keywordIds['mala praxis']}`;
      expect(await captions({ palabrasClave })).toEqual(['Muñoz c/ Clínica del Sur']);
    });

    it('si ningún fallo tiene todas, la lista queda vacía', async () => {
      const palabrasClave = `${keywordIds['mala praxis']},${keywordIds['despido']}`;
      expect(await captions({ palabrasClave })).toEqual([]);
    });

    it('un id repetido cuenta una sola vez', async () => {
      const id = keywordIds['despido'];
      expect(await captions({ palabrasClave: `${id},${id}` })).toEqual(['Gómez c/ Seguros SA']);
    });

    it('una palabra que solo usan fallos desactivados filtra con "Mostrar desactivados"', async () => {
      const palabrasClave = String(keywordIds['en desuso']);

      expect(await captions({ palabrasClave })).toEqual([]);
      expect(await captions({ palabrasClave, incluirDesactivados: 'true' })).toEqual([
        'Fallo desactivado sobre daños',
      ]);
    });

    it('un id que no existe no encuentra nada', async () => {
      expect(await captions({ palabrasClave: '999999' })).toEqual([]);
    });

    it('se combina con el buscador y con los demás filtros', async () => {
      const palabrasClave = String(keywordIds['daño moral']);

      expect(await captions({ palabrasClave, buscar: 'clinica' })).toEqual([
        'Muñoz c/ Clínica del Sur',
      ]);
      expect(await captions({ palabrasClave, fuero: 'civil' })).toEqual([
        'Pérez c/ López s/ daños',
      ]);
      expect(
        await captions({
          palabrasClave,
          buscar: 'daños',
          desde: '2019-01-01',
          hasta: '2019-12-31',
        }),
      ).toEqual(['Pérez c/ López s/ daños']);
      expect(await captions({ palabrasClave, buscar: 'despido' })).toEqual([]);
    });
  });

  it('el buscador y los filtros no cambian el orden del listado (RF-25)', async () => {
    const response = await list({ buscar: 'daño moral' }).expect(200);

    expect(response.body.items.map((item: { caratula: string }) => item.caratula)).toEqual([
      'Muñoz c/ Clínica del Sur',
      'Pérez c/ López s/ daños',
    ]);
  });
});
