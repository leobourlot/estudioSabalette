import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ModeloEscrito } from '../src/modelos-escritos/modelo-escrito.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { clearModelTables, createTestModelo } from './utilidades/modelos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const MODELS = '/api/panel/modelos-escritos';

interface Item {
  id: number;
  titulo: string;
}

/** RF-18, RF-19, RF-22 a RF-24: listado de modelos, sin el buscador (ver busqueda-modelos). */
describe('listado de modelos de escritos', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;

  const list = (query: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .get(MODELS)
      .query(query)
      .set('Cookie', `access_token=${session.accessToken}`);

  const titles = (body: { items: Item[] }) => body.items.map((item) => item.titulo);

  const create = (data: Partial<ModeloEscrito>) =>
    createTestModelo(app, { creadoPorId: lawyer.id, ...data });

  /** Inserta modelos en bloque: "Modelo 001", "Modelo 002"… */
  const insertModels = (count: number) =>
    app
      .get(DataSource)
      .getRepository(ModeloEscrito)
      .insert(
        Array.from({ length: count }, (_, index) => ({
          titulo: `Modelo ${String(index + 1).padStart(3, '0')}`,
          tipo: 'oficio' as const,
          fuero: 'otro' as const,
          descripcion: null,
          texto: 'Texto.',
          activo: true,
          creadoPorId: lawyer.id,
          creadoEn: new Date(),
        })),
      );

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    session = await loginAs(app, lawyer.email!);
  });

  beforeEach(async () => {
    await clearModelTables(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('orden (RF-18)', () => {
    it('ordena por título, sin distinguir mayúsculas, minúsculas ni tildes', async () => {
      for (const titulo of ['Zeta', 'ábaco', 'Banco', 'cédula', 'CARTA', 'Árbol']) {
        await create({ titulo });
      }

      const response = await list().expect(200);

      expect(titles(response.body)).toEqual(['ábaco', 'Árbol', 'Banco', 'CARTA', 'cédula', 'Zeta']);
    });

    it('a igual título, primero el último registrado en el sistema', async () => {
      const first = await create({ titulo: 'Oficio' });
      const second = await create({ titulo: 'OFICIO' });
      const third = await create({ titulo: 'oficio' });
      await create({ titulo: 'Demanda' });

      const response = await list().expect(200);

      expect(response.body.items.map((item: Item) => item.id)).toEqual([
        expect.any(Number),
        third.id,
        second.id,
        first.id,
      ]);
    });
  });

  describe('paginado (RF-18, RF-24)', () => {
    it('con 45 modelos, las tres páginas no repiten ni omiten ninguno', async () => {
      await insertModels(45);

      const pages = [];
      for (const pagina of ['1', '2', '3']) pages.push((await list({ pagina }).expect(200)).body);

      expect(pages.map((page) => page.items.length)).toEqual([20, 20, 5]);
      expect(pages.map((page) => page.pagina)).toEqual([1, 2, 3]);
      expect(pages.map((page) => page.haySiguiente)).toEqual([true, true, false]);
      const all = pages.flatMap((page) => titles(page));
      expect(new Set(all).size).toBe(45);
      expect(all).toEqual([...all].sort());
    });

    it('con exactamente 20 modelos no hay página siguiente', async () => {
      await insertModels(20);

      const response = await list().expect(200);

      expect(response.body.items).toHaveLength(20);
      expect(response.body.haySiguiente).toBe(false);
    });

    it('una página que no existe llega vacía', async () => {
      await insertModels(3);

      const response = await list({ pagina: '5' }).expect(200);

      expect(response.body).toEqual({
        items: [],
        pagina: 5,
        haySiguiente: false,
        hayModelos: true,
      });
    });

    it('la respuesta no lleva totales, y ninguna fila trae el texto (RF-19)', async () => {
      await create({
        titulo: 'Oficio al Banco',
        tipo: 'oficio',
        fuero: 'civil',
        descripcion: 'Para pedir saldos',
        texto: 'TEXTO-QUE-NO-VIAJA #CARATULA#',
      });

      const response = await list().expect(200);

      expect(Object.keys(response.body).sort()).toEqual(
        ['items', 'pagina', 'haySiguiente', 'hayModelos'].sort(),
      );
      expect(response.body.items).toEqual([
        {
          id: expect.any(Number),
          titulo: 'Oficio al Banco',
          tipo: 'oficio',
          fuero: 'civil',
          descripcion: 'Para pedir saldos',
          activo: true,
        },
      ]);
      expect(JSON.stringify(response.body)).not.toContain('TEXTO-QUE-NO-VIAJA');
    });

    it.each(['0', 'dos', '1.5'])('rechaza la página %j', async (pagina) => {
      const response = await list({ pagina }).expect(400);

      expect(response.body.message).toEqual([
        'La página debe ser un número entero mayor o igual a 1',
      ]);
    });
  });

  describe('filtros (RF-22)', () => {
    beforeEach(async () => {
      await create({ titulo: 'A demanda civil', tipo: 'demanda', fuero: 'civil' });
      await create({ titulo: 'B demanda laboral', tipo: 'demanda', fuero: 'laboral' });
      await create({ titulo: 'C cédula laboral', tipo: 'cedula', fuero: 'laboral' });
      await create({ titulo: 'D oficio general', tipo: 'oficio', fuero: 'otro' });
      await create({ titulo: 'E cédula general', tipo: 'cedula', fuero: 'otro' });
      await create({
        titulo: 'F cédula laboral desactivada',
        tipo: 'cedula',
        fuero: 'laboral',
        activo: false,
      });
    });

    it('sin filtros muestra todos los modelos activos, de cualquier fuero', async () => {
      const response = await list().expect(200);

      expect(titles(response.body)).toEqual([
        'A demanda civil',
        'B demanda laboral',
        'C cédula laboral',
        'D oficio general',
        'E cédula general',
      ]);
    });

    it('filtra por tipo de escrito', async () => {
      const response = await list({ tipo: 'cedula' }).expect(200);

      expect(titles(response.body)).toEqual(['C cédula laboral', 'E cédula general']);
    });

    it('con un fuero, muestra los de ese fuero y los de fuero otro', async () => {
      const laboral = await list({ fuero: 'laboral' }).expect(200);
      expect(titles(laboral.body)).toEqual([
        'B demanda laboral',
        'C cédula laboral',
        'D oficio general',
        'E cédula general',
      ]);

      const penal = await list({ fuero: 'penal' }).expect(200);
      expect(titles(penal.body)).toEqual(['D oficio general', 'E cédula general']);
    });

    it('con el fuero otro, muestra solo los de fuero otro', async () => {
      const response = await list({ fuero: 'otro' }).expect(200);

      expect(titles(response.body)).toEqual(['D oficio general', 'E cédula general']);
    });

    it('con "Mostrar desactivados" incluye los desactivados, identificados como tales', async () => {
      const response = await list({ incluirDesactivados: 'true' }).expect(200);

      expect(titles(response.body)).toHaveLength(6);
      expect(
        response.body.items.find((item: Item) => item.titulo === 'F cédula laboral desactivada'),
      ).toMatchObject({ activo: false });
    });

    it('los filtros se combinan entre sí y no cambian el orden', async () => {
      const response = await list({
        tipo: 'cedula',
        fuero: 'laboral',
        incluirDesactivados: 'true',
      }).expect(200);

      expect(titles(response.body)).toEqual([
        'C cédula laboral',
        'E cédula general',
        'F cédula laboral desactivada',
      ]);
    });

    it.each([
      [{ tipo: 'carta' }, /^El tipo de escrito debe ser/],
      [{ fuero: 'marítimo' }, /^El fuero debe ser/],
      [{ incluirDesactivados: 'si' }, /^El filtro incluirDesactivados/],
    ])('rechaza el filtro %j', async (query, message) => {
      const response = await list(query).expect(400);

      expect(response.body.message).toHaveLength(1);
      expect(response.body.message[0]).toMatch(message);
    });
  });

  describe('listado vacío (RF-23)', () => {
    it('sin ningún modelo, hayModelos es false aunque haya filtros', async () => {
      expect((await list().expect(200)).body).toEqual({
        items: [],
        pagina: 1,
        haySiguiente: false,
        hayModelos: false,
      });
      expect((await list({ tipo: 'cedula', fuero: 'civil' }).expect(200)).body.hayModelos).toBe(
        false,
      );
    });

    it('con todos los modelos desactivados, hayModelos es false salvo con "Mostrar desactivados"', async () => {
      await create({ titulo: 'Desactivado', activo: false });

      expect((await list().expect(200)).body).toMatchObject({ items: [], hayModelos: false });
      expect((await list({ tipo: 'demanda' }).expect(200)).body.hayModelos).toBe(false);

      const withDeactivated = await list({ incluirDesactivados: 'true', tipo: 'demanda' }).expect(
        200,
      );
      expect(withDeactivated.body).toMatchObject({ items: [], hayModelos: true });
    });

    it('con modelos que no coinciden con los filtros, hayModelos es true', async () => {
      await create({ titulo: 'Oficio', tipo: 'oficio' });

      const response = await list({ tipo: 'demanda' }).expect(200);

      expect(response.body).toMatchObject({ items: [], hayModelos: true });
    });
  });
});
