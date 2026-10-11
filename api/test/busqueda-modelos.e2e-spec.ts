import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { clearModelTables, createTestModelo } from './utilidades/modelos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const MODELS = '/api/panel/modelos-escritos';

/** RF-20, RF-21: buscador del listado de modelos. */
describe('buscador de modelos de escritos', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;

  const list = (query: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .get(MODELS)
      .query(query)
      .set('Cookie', `access_token=${session.accessToken}`);

  const search = async (buscar: string, query: Record<string, string> = {}) => {
    const response = await list({ buscar, ...query }).expect(200);
    return (response.body.items as { titulo: string }[]).map((item) => item.titulo);
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearModelTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    session = await loginAs(app, lawyer.email!);

    const create = (data: Parameters<typeof createTestModelo>[1]) => createTestModelo(app, data);
    await create({
      creadoPorId: lawyer.id,
      titulo: 'Cédula de notificación',
      tipo: 'cedula',
      fuero: 'laboral',
      descripcion: 'Para notificar el traslado de la demanda',
      texto: 'Señor/a #DEMANDADOS#:\n\nSe le hace saber que en #JUZGADO# tramita la causa.',
    });
    await create({
      creadoPorId: lawyer.id,
      titulo: 'Demanda de daños',
      tipo: 'demanda',
      fuero: 'civil',
      descripcion: 'Accidentes de tránsito, con rubros al 50% y más',
      texto: 'Señor Juez:\n\n#ACTORES#, por el Sr. Pérez, reclama el año de intereses.',
    });
    await create({
      creadoPorId: lawyer.id,
      titulo: 'Oficio al banco',
      tipo: 'oficio',
      fuero: 'otro',
      descripcion: null,
      texto:
        'Señor Gerente:\n\nConstituyo domicilio en estudio@ejemplo.com (sic). Cuenta tipo_caja 500 pesos.',
    });
    await create({
      creadoPorId: lawyer.id,
      titulo: 'Oficio desactivado',
      tipo: 'oficio',
      fuero: 'otro',
      texto: 'Texto de un oficio viejo sobre el Sr. Pérez.',
      activo: false,
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('busca un fragmento en el título, sin distinguir mayúsculas ni tildes (RF-20)', async () => {
    expect(await search('CEDULA')).toEqual(['Cédula de notificación']);
    expect(await search('édul')).toEqual(['Cédula de notificación']);
    expect(await search('oficio')).toEqual(['Oficio al banco']);
  });

  it('busca en la descripción', async () => {
    expect(await search('transito')).toEqual(['Demanda de daños']);
    expect(await search('TRASLADO')).toEqual(['Cédula de notificación']);
  });

  it('busca en el texto del modelo, aunque el listado no lo muestre', async () => {
    expect(await search('ére')).toEqual(['Demanda de daños', 'Oficio al banco']);
    expect(await search('PEREZ')).toEqual(['Demanda de daños']);
    expect(await search('gerente')).toEqual(['Oficio al banco']);
  });

  it('toma la ñ como n (comparación flexible de la spec 005)', async () => {
    expect(await search('ano de intereses')).toEqual(['Demanda de daños']);
    expect(await search('danos')).toEqual(['Demanda de daños']);
  });

  it('encuentra los modelos que usan una variable', async () => {
    expect(await search('#JUZGADO#')).toEqual(['Cédula de notificación']);
    expect(await search('#juzgado#')).toEqual(['Cédula de notificación']);
    expect(await search('#ACTORES#')).toEqual(['Demanda de daños']);
  });

  it('encuentra los modelos que tienen un email en su texto', async () => {
    expect(await search('@ejemplo.com')).toEqual(['Oficio al banco']);
    expect(await search('estudio@ejemplo.com')).toEqual(['Oficio al banco']);
  });

  it('busca % y _ como texto literal (RF-21)', async () => {
    expect(await search('50%')).toEqual(['Demanda de daños']);
    expect(await search('5%')).toEqual([]);
    expect(await search('tipo_caja')).toEqual(['Oficio al banco']);
    expect(await search('tipo_c_ja')).toEqual([]);
    expect(await search('%')).toEqual(['Demanda de daños']);
  });

  it('convierte lo buscado como los textos: "[sic]" encuentra "(sic)"', async () => {
    expect(await search('[sic]')).toEqual(['Oficio al banco']);
  });

  it('devuelve los resultados en el orden del listado', async () => {
    expect(await search('señor')).toEqual([
      'Cédula de notificación',
      'Demanda de daños',
      'Oficio al banco',
    ]);
  });

  it('una búsqueda vacía o con solo espacios equivale a no buscar', async () => {
    expect(await search('')).toHaveLength(3);
    expect(await search('   ')).toHaveLength(3);
  });

  it('se combina con los filtros (RF-22)', async () => {
    expect(await search('señor', { tipo: 'demanda' })).toEqual(['Demanda de daños']);
    expect(await search('señor', { fuero: 'laboral' })).toEqual([
      'Cédula de notificación',
      'Oficio al banco',
    ]);
    expect(await search('señor', { fuero: 'otro' })).toEqual(['Oficio al banco']);
    expect(await search('perez')).toEqual(['Demanda de daños']);
    expect(await search('perez', { incluirDesactivados: 'true' })).toEqual([
      'Demanda de daños',
      'Oficio desactivado',
    ]);
  });

  it('sin coincidencias, la lista llega vacía y hayModelos es true (RF-23)', async () => {
    const response = await list({ buscar: 'no existe en ningún modelo' }).expect(200);

    expect(response.body).toEqual({ items: [], pagina: 1, haySiguiente: false, hayModelos: true });
  });

  it.each(['<script>', 'a = b', '{x}', 'a | b'])(
    'rechaza la búsqueda %j (RF-21)',
    async (buscar) => {
      const response = await list({ buscar }).expect(400);

      expect(response.body.message).toEqual(['La búsqueda tiene caracteres no permitidos']);
    },
  );

  it('rechaza una búsqueda de más de 100 caracteres, sin repetirla', async () => {
    const response = await list({ buscar: `MARCASECRETA ${'a'.repeat(100)}` }).expect(400);

    expect(response.body.message).toEqual(['La búsqueda puede tener hasta 100 caracteres']);
    expect(JSON.stringify(response.body)).not.toContain('MARCASECRETA');
  });
});
