import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const CAUSAS = '/api/panel/causas';
const REPEATED_PERSON = 'Esa persona ya es parte de la causa';

/** RF-14, RF-17, RF-18: partes cliente y personas repetidas en el alta. */
describe('POST /api/panel/causas: partes cliente', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let ana: Usuario;
  let company: Usuario;
  let inactive: Usuario;
  let session: TestSession;

  const post = (partes: object[]) =>
    request(app.getHttpServer())
      .post(CAUSAS)
      .set('Cookie', `access_token=${session.accessToken}`)
      .send({
        caratula: 'Gómez c/ Pérez s/ cobro de pesos',
        fuero: 'civil',
        responsableId: lawyer.id,
        partes,
      });

  const countCausas = async () => {
    const [row]: { total: string }[] = await app
      .get(DataSource)
      .query('SELECT COUNT(*) AS total FROM causas');
    return Number(row.total);
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);

    lawyer = await createTestUser(app, { email: 'juan@estudio.com' });
    ana = await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });
    company = await createTestUser(app, {
      rol: 'cliente',
      email: 'laura@empresa.com',
      nombre: 'Laura',
      apellido: 'Contacto',
      cliente: { tipoPersona: 'juridica', cuit: '30712345671', razonSocial: 'Empresa S.A.' },
    });
    inactive = await createTestUser(app, {
      rol: 'cliente',
      email: 'bruno@correo.com',
      nombre: 'Bruno',
      apellido: 'Díaz',
      activo: false,
      cliente: { tipoPersona: 'fisica', dni: '28999888' },
    });
    session = await loginAs(app, 'juan@estudio.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('vincula partes cliente y toma sus datos de la cuenta (RF-14)', async () => {
    const response = await post([
      { rol: 'actor', clienteId: ana.id },
      { rol: 'actor', clienteId: company.id },
      { rol: 'demandado', tipoPersona: 'fisica', nombre: 'Pedro', apellido: 'López' },
    ]).expect(201);

    expect(response.body.causa.partes).toEqual([
      {
        id: expect.any(Number),
        rol: 'actor',
        esCliente: true,
        clienteId: ana.id,
        clienteActivo: true,
        tipoPersona: 'fisica',
        nombre: 'Ana',
        apellido: 'Gómez',
        razonSocial: null,
        dni: '30123456',
        cuit: null,
      },
      expect.objectContaining({
        esCliente: true,
        clienteId: company.id,
        tipoPersona: 'juridica',
        nombre: null,
        razonSocial: 'Empresa S.A.',
        cuit: '30712345671',
      }),
      expect.objectContaining({ esCliente: false, nombre: 'Pedro', apellido: 'López' }),
    ]);
  });

  it('no guarda datos propios en una parte cliente', async () => {
    const response = await post([{ rol: 'actor', clienteId: ana.id }]).expect(201);

    const [row]: Record<string, unknown>[] = await app
      .get(DataSource)
      .query(
        'SELECT tipoPersona, nombre, apellido, razonSocial, dni, cuit FROM partes WHERE causaId = ?',
        [response.body.causa.id],
      );
    expect(row).toEqual({
      tipoPersona: null,
      nombre: null,
      apellido: null,
      razonSocial: null,
      dni: null,
      cuit: null,
    });
  });

  it.each([
    ['un integrante', () => lawyer.id],
    ['un id inexistente', () => 99999],
  ])('no vincula como cliente a %s', async (_case, clienteId) => {
    const before = await countCausas();

    // Única parte rechazada: no queda ninguna válida y no se crea la causa (RF-7).
    const response = await post([{ rol: 'actor', clienteId: clienteId() }]).expect(400);

    expect(response.body.message).toEqual(['Parte 1: No existe ese cliente']);
    expect(await countCausas()).toBe(before);
  });

  it('no vincula a un cliente desactivado (RF-17)', async () => {
    const response = await post([
      { rol: 'actor', tipoPersona: 'fisica', nombre: 'Pedro', apellido: 'López' },
      { rol: 'demandado', clienteId: inactive.id },
    ]).expect(201);

    expect(response.body.causa.partes).toEqual([
      expect.objectContaining({ esCliente: false, nombre: 'Pedro' }),
    ]);
    expect(response.body.rechazos).toEqual([
      { indiceParte: 1, mensajes: ['El cliente está desactivado'] },
    ]);
  });

  it.each<[string, () => object[]]>([
    [
      'el mismo cliente dos veces',
      () => [
        { rol: 'actor', clienteId: ana.id },
        { rol: 'tercero', clienteId: ana.id },
      ],
    ],
    [
      'el mismo DNI en dos partes no cliente',
      () => [
        {
          rol: 'actor',
          tipoPersona: 'fisica',
          nombre: 'Pedro',
          apellido: 'López',
          dni: '20111222',
        },
        {
          rol: 'tercero',
          tipoPersona: 'fisica',
          nombre: 'P.',
          apellido: 'López',
          dni: '20.111.222',
        },
      ],
    ],
    [
      'un cliente y una parte no cliente con su DNI',
      () => [
        { rol: 'actor', clienteId: ana.id },
        { rol: 'tercero', tipoPersona: 'fisica', nombre: 'Ana', apellido: 'G.', dni: '30123456' },
      ],
    ],
    [
      'el mismo CUIT en un cliente y en una parte no cliente',
      () => [
        {
          rol: 'demandado',
          tipoPersona: 'juridica',
          razonSocial: 'Emp. S.A.',
          cuit: '30712345671',
        },
        { rol: 'actor', clienteId: company.id },
      ],
    ],
  ])('no repite personas en la misma causa: %s (RF-18)', async (_case, partes) => {
    const response = await post(partes()).expect(201);

    expect(response.body.causa.partes).toHaveLength(1);
    expect(response.body.rechazos).toEqual([{ indiceParte: 1, mensajes: [REPEATED_PERSON] }]);
  });

  it('dos partes no cliente sin documento no se consideran la misma persona', async () => {
    await post([
      { rol: 'actor', tipoPersona: 'fisica', nombre: 'Pedro', apellido: 'López' },
      { rol: 'tercero', tipoPersona: 'fisica', nombre: 'Marta', apellido: 'López' },
    ]).expect(201);
  });
});
