import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const CAUSAS = '/api/panel/causas';

/** RF-37: buscador por carátula, número y partes vigentes. */
describe('GET /api/panel/causas?buscar=', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;
  const ids: Record<'C1' | 'C2' | 'C3' | 'C4', number> = { C1: 0, C2: 0, C3: 0, C4: 0 };

  const search = async (text: string, extra = '') => {
    const response = await request(app.getHttpServer())
      .get(`${CAUSAS}?buscar=${encodeURIComponent(text)}${extra}`)
      .set('Cookie', `access_token=${session.accessToken}`)
      .expect(200);
    return (response.body.items as { id: number }[]).map((item) => item.id).sort((a, b) => a - b);
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);

    lawyer = await createTestUser(app, {
      email: 'abogado@estudio.com',
      nombre: 'Luis',
      apellido: 'Sosa',
    });
    const ana = await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });
    const company = await createTestUser(app, {
      rol: 'cliente',
      email: 'laura@empresa.com',
      nombre: 'Laura',
      apellido: 'Contacto',
      cliente: { tipoPersona: 'juridica', cuit: '33693450239', razonSocial: 'Empresa S.A.' },
    });
    const base = { responsableId: lawyer.id, creadoPorId: lawyer.id };

    ids.C1 = (
      await createTestCausa(app, {
        ...base,
        caratula: 'Pérez, Juan c/ Gómez S.A. s/ daños',
        numeroExpediente: '1234/2024',
        fuero: 'civil',
        partes: [{ clienteId: ana.id }, { nombre: 'Pedro', apellido: 'López', dni: '20111222' }],
      })
    ).id;
    ids.C2 = (
      await createTestCausa(app, {
        ...base,
        caratula: 'Rodríguez s/ sucesión',
        numeroExpediente: 'CIV 55-2023',
        fuero: 'familia',
        partes: [
          {
            tipoPersona: 'juridica',
            nombre: null,
            apellido: null,
            razonSocial: 'Zeta S.R.L.',
            cuit: '30712345671',
          },
          { nombre: 'Marta', apellido: 'Ruiz', vigente: false },
        ],
      })
    ).id;
    ids.C3 = (
      await createTestCausa(app, {
        ...base,
        caratula: '100% seguro_test s/ cobro',
        fuero: 'laboral',
        partes: [
          { nombre: 'Juan', apellido: 'Pérez' },
          { nombre: 'Juana', apellido: 'Pérez' },
        ],
      })
    ).id;
    ids.C4 = (
      await createTestCausa(app, {
        ...base,
        caratula: 'Otra causa s/ concurso',
        partes: [{ clienteId: company.id }],
      })
    ).id;

    session = await loginAs(app, 'abogado@estudio.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('busca fragmentos sin distinguir mayúsculas ni tildes', async () => {
    expect(await search('ERE')).toEqual([ids.C1, ids.C3]);
    expect(await search('rodriguez')).toEqual([ids.C2]);
    expect(await search('SUCESION')).toEqual([ids.C2]);
  });

  it('busca por número de expediente, también con otros separadores', async () => {
    expect(await search('1234/2024')).toEqual([ids.C1]);
    expect(await search('1234-2024')).toEqual([ids.C1]);
    expect(await search('civ 55/2023')).toEqual([ids.C2]);
    expect(await search('55')).toEqual([ids.C2]);
  });

  it('busca por nombre y apellido de las partes, en los dos órdenes', async () => {
    expect(await search('lópez')).toEqual([ids.C1]);
    expect(await search('juan perez')).toEqual([ids.C3]);
    expect(await search('perez juana')).toEqual([ids.C3]);
  });

  it('busca por los datos de la cuenta de una parte cliente', async () => {
    expect(await search('ana gomez')).toEqual([ids.C1]);
    expect(await search('empresa s.a.')).toEqual([ids.C4]);
  });

  it('no busca por el contacto de un cliente persona jurídica', async () => {
    expect(await search('laura')).toEqual([]);
  });

  it('busca por razón social de una parte no cliente', async () => {
    expect(await search('zeta')).toEqual([ids.C2]);
  });

  it('busca por DNI con puntos y por CUIT con guiones, de clientes y de no clientes', async () => {
    expect(await search('30.123.456')).toEqual([ids.C1]);
    expect(await search('20.111.222')).toEqual([ids.C1]);
    expect(await search('30-71234567-1')).toEqual([ids.C2]);
    expect(await search('33-69345023-9')).toEqual([ids.C4]);
  });

  it('no encuentra partes desvinculadas', async () => {
    expect(await search('ruiz')).toEqual([]);
  });

  it('trata % y _ como texto', async () => {
    expect(await search('%')).toEqual([ids.C3]);
    expect(await search('_')).toEqual([ids.C3]);
  });

  it('muestra una sola vez una causa con varias partes que coinciden', async () => {
    const response = await request(app.getHttpServer())
      .get(`${CAUSAS}?buscar=perez`)
      .set('Cookie', `access_token=${session.accessToken}`)
      .expect(200);

    expect(response.body.total).toBe(2);
    expect(response.body.items).toHaveLength(2);
  });

  it('se combina con los filtros', async () => {
    expect(await search('perez', '&fuero=laboral')).toEqual([ids.C3]);
    expect(await search('perez', '&fuero=penal')).toEqual([]);
  });

  it('una búsqueda vacía no filtra', async () => {
    expect(await search('   ')).toEqual([ids.C1, ids.C2, ids.C3, ids.C4]);
  });
});
