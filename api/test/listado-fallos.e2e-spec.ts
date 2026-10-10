import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Fallo } from '../src/jurisprudencia/fallo.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { clearRulingTables, createTestFallo } from './utilidades/fallos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const RULINGS = '/api/panel/jurisprudencia';

interface Item {
  id: number;
  caratula: string;
}

/** RF-21, RF-22, RF-25 a RF-28: listado de jurisprudencia, sin el buscador (ver busqueda-fallos). */
describe('listado de jurisprudencia', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;

  const list = (query: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .get(RULINGS)
      .query(query)
      .set('Cookie', `access_token=${session.accessToken}`);

  const captions = (body: { items: Item[] }) => body.items.map((item) => item.caratula);

  /** Inserta fallos en bloque, todos con el mismo momento de carga. */
  const insertRulings = (count: number, data: Partial<Fallo> = {}) => {
    const creadoEn = new Date();
    return app
      .get(DataSource)
      .getRepository(Fallo)
      .insert(
        Array.from({ length: count }, (_, index) => ({
          caratula: `Fallo en bloque ${index + 1}`,
          tribunal: 'CNCiv., Sala A',
          fuero: 'civil' as const,
          fecha: '2018-06-01',
          sumario: 'Sumario.',
          activo: true,
          creadoPorId: lawyer.id,
          creadoEn,
          ...data,
        })),
      );
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    session = await loginAs(app, lawyer.email!);
  });

  beforeEach(async () => {
    await clearRulingTables(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('orden (RF-21)', () => {
    it('ordena por fecha del fallo, después por carga y después por id', async () => {
      const at = (seconds: number) => new Date(Date.UTC(2026, 0, 1, 12, 0, seconds));
      const ruling = (caratula: string, fecha: string, creadoEn: Date) =>
        createTestFallo(app, { creadoPorId: lawyer.id, caratula, fecha, creadoEn });

      await ruling('A: 2020, cargado segundo', '2020-01-01', at(1));
      await ruling('B: 2021, cargado primero', '2021-01-01', at(0));
      await ruling('C: 2020, cargado tercero', '2020-01-01', at(2));
      // Misma fecha y mismo momento de carga: decide el id.
      await ruling('D: 2019, id menor', '2019-01-01', at(3));
      await ruling('E: 2019, id mayor', '2019-01-01', at(3));

      const response = await list().expect(200);

      expect(captions(response.body)).toEqual([
        'B: 2021, cargado primero',
        'C: 2020, cargado tercero',
        'A: 2020, cargado segundo',
        'E: 2019, id mayor',
        'D: 2019, id menor',
      ]);
    });

    it('un fallo cargado hoy con una fecha vieja queda ubicado por su fecha', async () => {
      await createTestFallo(app, {
        creadoPorId: lawyer.id,
        caratula: 'Reciente',
        fecha: '2024-01-01',
      });
      await createTestFallo(app, {
        creadoPorId: lawyer.id,
        caratula: 'Histórico',
        fecha: '1887-05-03',
      });

      expect(captions((await list().expect(200)).body)).toEqual(['Reciente', 'Histórico']);
    });
  });

  describe('paginado (RF-21, RF-28)', () => {
    it('con 45 fallos, las tres páginas no repiten ni omiten ninguno', async () => {
      await insertRulings(45);

      const pages = [];
      for (const pagina of ['1', '2', '3']) pages.push((await list({ pagina }).expect(200)).body);

      expect(pages.map((page) => page.items.length)).toEqual([20, 20, 5]);
      expect(pages.map((page) => page.haySiguiente)).toEqual([true, true, false]);
      expect(pages.map((page) => page.pagina)).toEqual([1, 2, 3]);
      const ids = pages.flatMap((page) => page.items.map((item: Item) => item.id));
      expect(new Set(ids).size).toBe(45);
      // Misma fecha y misma carga: del id mayor al menor, sin saltos entre páginas.
      expect(ids).toEqual([...ids].sort((a, b) => b - a));
    });

    it('con exactamente 20 fallos no hay página siguiente', async () => {
      await insertRulings(20);

      const response = await list().expect(200);

      expect(response.body.items).toHaveLength(20);
      expect(response.body.haySiguiente).toBe(false);
    });

    it('la respuesta no lleva totales', async () => {
      await insertRulings(3);

      const response = await list().expect(200);

      expect(Object.keys(response.body).sort()).toEqual([
        'hayFallos',
        'haySiguiente',
        'items',
        'pagina',
      ]);
    });

    it('una página inexistente devuelve una lista vacía, y hay fallos (RF-28)', async () => {
      await insertRulings(3);

      const response = await list({ pagina: '4' }).expect(200);

      expect(response.body).toEqual({ items: [], pagina: 4, haySiguiente: false, hayFallos: true });
    });

    it('rechaza una página inválida', async () => {
      await list({ pagina: '0' }).expect(400);
    });
  });

  describe('fila del listado (RF-22)', () => {
    it('lleva los datos del fallo, el sumario completo y las palabras clave en orden', async () => {
      const sumario = `${'Párrafo largo. '.repeat(300)}Fin.`;
      const fallo = await createTestFallo(app, {
        creadoPorId: lawyer.id,
        numero: '1234/2018',
        sumario,
        enlace: 'https://www.csjn.gov.ar/fallo',
        palabrasClave: ['responsabilidad objetiva', 'Accidente', 'daño moral'],
      });

      const [item] = (await list().expect(200)).body.items;

      expect(item).toEqual({
        id: fallo.id,
        caratula: 'Pérez c/ López s/ daños',
        tribunal: 'CNCiv., Sala A',
        fuero: 'civil',
        fecha: '2019-05-03',
        numero: '1234/2018',
        sumario,
        palabrasClave: [
          { id: expect.any(Number), texto: 'Accidente' },
          { id: expect.any(Number), texto: 'daño moral' },
          { id: expect.any(Number), texto: 'responsabilidad objetiva' },
        ],
        activo: true,
      });
    });
  });

  describe('filtros (RF-25, RF-26)', () => {
    beforeEach(async () => {
      const ruling = (
        caratula: string,
        data: Pick<Fallo, 'fuero' | 'fecha'> & { activo?: boolean },
      ) => createTestFallo(app, { creadoPorId: lawyer.id, caratula, ...data });
      await ruling('Civil 2015', { fuero: 'civil', fecha: '2015-03-10' });
      await ruling('Civil 2020', { fuero: 'civil', fecha: '2020-08-14' });
      await ruling('Laboral 2020', { fuero: 'laboral', fecha: '2020-08-15' });
      await ruling('Penal 2022', { fuero: 'penal', fecha: '2022-01-05' });
      await ruling('Civil 2021 desactivado', {
        fuero: 'civil',
        fecha: '2021-02-02',
        activo: false,
      });
    });

    it('sin filtros muestra solo los activos', async () => {
      expect(captions((await list().expect(200)).body)).toEqual([
        'Penal 2022',
        'Laboral 2020',
        'Civil 2020',
        'Civil 2015',
      ]);
    });

    it('filtra por fuero', async () => {
      expect(captions((await list({ fuero: 'civil' }).expect(200)).body)).toEqual([
        'Civil 2020',
        'Civil 2015',
      ]);
    });

    it('filtra por rango de fechas, con los dos extremos incluidos', async () => {
      const response = await list({ desde: '2020-08-14', hasta: '2020-08-15' }).expect(200);
      expect(captions(response.body)).toEqual(['Laboral 2020', 'Civil 2020']);
    });

    it('filtra solo desde o solo hasta', async () => {
      expect(captions((await list({ desde: '2020-08-15' }).expect(200)).body)).toEqual([
        'Penal 2022',
        'Laboral 2020',
      ]);
      expect(captions((await list({ hasta: '2020-08-14' }).expect(200)).body)).toEqual([
        'Civil 2020',
        'Civil 2015',
      ]);
    });

    it('"Mostrar desactivados" los incluye, identificados como tales, en su lugar del orden', async () => {
      const response = await list({ incluirDesactivados: 'true' }).expect(200);

      expect(captions(response.body)).toEqual([
        'Penal 2022',
        'Civil 2021 desactivado',
        'Laboral 2020',
        'Civil 2020',
        'Civil 2015',
      ]);
      expect(
        response.body.items.find((item: Item) => item.caratula === 'Civil 2021 desactivado').activo,
      ).toBe(false);
    });

    it('los filtros se combinan entre sí', async () => {
      const response = await list({
        fuero: 'civil',
        desde: '2016-01-01',
        incluirDesactivados: 'true',
      }).expect(200);

      expect(captions(response.body)).toEqual(['Civil 2021 desactivado', 'Civil 2020']);
    });

    it.each([
      ['una fecha inexistente', { desde: '2023-02-29' }, 'La fecha no es válida'],
      [
        'una fecha de 1790',
        { desde: '1790-01-01' },
        'La fecha no puede ser anterior al 01/01/1800',
      ],
      [
        'una fecha futura',
        { hasta: '2999-01-01' },
        'La fecha del fallo no puede ser posterior a hoy',
      ],
      [
        'desde posterior a hasta',
        { desde: '2020-01-02', hasta: '2020-01-01' },
        'La fecha desde no puede ser posterior a la fecha hasta',
      ],
      ['un fuero fuera de la lista', { fuero: 'comercial' }, 'El fuero debe ser'],
    ])('rechaza %s (RF-26)', async (_case, query, message) => {
      const response = await list(query as Record<string, string>).expect(400);
      expect(JSON.stringify(response.body.message)).toContain(message);
    });

    it('con fallos que no coinciden con los filtros, la lista queda vacía y hay fallos (RF-27)', async () => {
      const response = await list({ fuero: 'federal' }).expect(200);

      expect(response.body).toEqual({ items: [], pagina: 1, haySiguiente: false, hayFallos: true });
    });
  });

  describe('hayFallos (RF-27)', () => {
    it('sin ningún fallo es false, aunque haya filtros', async () => {
      expect((await list().expect(200)).body.hayFallos).toBe(false);
      expect((await list({ fuero: 'civil' }).expect(200)).body.hayFallos).toBe(false);
    });

    it('con todos los fallos desactivados es false, salvo con "Mostrar desactivados"', async () => {
      await createTestFallo(app, { creadoPorId: lawyer.id, activo: false });

      expect((await list().expect(200)).body).toMatchObject({ items: [], hayFallos: false });
      expect((await list({ fuero: 'civil' }).expect(200)).body.hayFallos).toBe(false);

      const withDeactivated = (await list({ incluirDesactivados: 'true' }).expect(200)).body;
      expect(withDeactivated.items).toHaveLength(1);
      expect(withDeactivated.hayFallos).toBe(true);
      // Con "Mostrar desactivados" y un filtro que no coincide, igual hay fallos.
      expect(
        (await list({ incluirDesactivados: 'true', fuero: 'penal' }).expect(200)).body,
      ).toMatchObject({ items: [], hayFallos: true });
    });
  });
});
