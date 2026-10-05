import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const CAUSAS = '/api/panel/causas';
const VALID_PARTY = { rol: 'actor', tipoPersona: 'fisica', nombre: 'Juan', apellido: 'Pérez' };

/** RF-7: la causa se crea aunque se rechacen partes o colaboradores, y se informa qué no se guardó. */
describe('POST /api/panel/causas: alta parcial', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let colleague: Usuario;
  let inactiveLawyer: Usuario;
  let inactiveClient: Usuario;
  let ana: Usuario;
  let session: TestSession;

  const post = (changes: object) =>
    request(app.getHttpServer())
      .post(CAUSAS)
      .set('Cookie', `access_token=${session.accessToken}`)
      .send({
        caratula: 'Pérez c/ Gómez s/ daños',
        fuero: 'civil',
        responsableId: lawyer.id,
        ...changes,
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
    colleague = await createTestUser(app, {
      email: 'lucia@estudio.com',
      nombre: 'Lucía',
      apellido: 'Benítez',
    });
    inactiveLawyer = await createTestUser(app, {
      email: 'bruno@estudio.com',
      nombre: 'Bruno',
      apellido: 'Méndez',
      activo: false,
    });
    inactiveClient = await createTestUser(app, {
      rol: 'cliente',
      email: 'raul@correo.com',
      nombre: 'Raúl',
      apellido: 'Díaz',
      activo: false,
      cliente: { tipoPersona: 'fisica', dni: '28999888' },
    });
    ana = await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });
    session = await loginAs(app, 'juan@estudio.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('crea la causa con las partes válidas e informa cada parte rechazada', async () => {
    const response = await post({
      partes: [
        VALID_PARTY,
        { rol: 'querellante', tipoPersona: 'fisica', nombre: 'Pedro' },
        { rol: 'demandado', clienteId: inactiveClient.id },
        { rol: 'tercero', clienteId: 99999 },
        { rol: 'demandado', clienteId: ana.id },
      ],
    }).expect(201);

    expect(response.body.causa.partes.map((parte: { nombre: string }) => parte.nombre)).toEqual([
      'Juan',
      'Ana',
    ]);
    expect(response.body.rechazos).toEqual([
      {
        indiceParte: 1,
        mensajes: [
          'El rol procesal debe ser actor, demandado, tercero u otro',
          'El apellido es obligatorio',
        ],
      },
      { indiceParte: 2, mensajes: ['El cliente está desactivado'] },
      { indiceParte: 3, mensajes: ['No existe ese cliente'] },
    ]);
  });

  it('no guarda una persona repetida en el mismo alta e informa la repetición (RF-18)', async () => {
    const response = await post({
      partes: [
        { rol: 'actor', clienteId: ana.id },
        { rol: 'tercero', clienteId: ana.id },
      ],
    }).expect(201);

    expect(response.body.causa.partes).toHaveLength(1);
    expect(response.body.rechazos).toEqual([
      { indiceParte: 1, mensajes: ['Esa persona ya es parte de la causa'] },
    ]);
  });

  it('una parte rechazada no cuenta para detectar repetidas', async () => {
    const response = await post({
      partes: [
        { rol: 'actor', tipoPersona: 'fisica', nombre: 'Juan', dni: '20111222' },
        { rol: 'actor', tipoPersona: 'fisica', nombre: 'Juan', apellido: 'Pérez', dni: '20111222' },
      ],
    }).expect(201);

    expect(response.body.causa.partes).toEqual([
      expect.objectContaining({ dni: '20111222', apellido: 'Pérez' }),
    ]);
    expect(response.body.rechazos).toEqual([
      { indiceParte: 0, mensajes: ['El apellido es obligatorio'] },
    ]);
  });

  it('crea la causa con los colaboradores válidos e informa cada colaborador rechazado', async () => {
    const response = await post({
      colaboradorIds: [colleague.id, inactiveLawyer.id, ana.id, lawyer.id, colleague.id],
      partes: [VALID_PARTY],
    }).expect(201);

    expect(response.body.causa.colaboradores.map((member: { id: number }) => member.id)).toEqual([
      colleague.id,
    ]);
    expect(response.body.rechazos).toEqual([
      { colaboradorId: inactiveLawyer.id, mensajes: ['El integrante está desactivado'] },
      {
        colaboradorId: ana.id,
        mensajes: ['Los colaboradores deben ser integrantes del estudio'],
      },
      { colaboradorId: lawyer.id, mensajes: ['Ese integrante ya interviene en la causa'] },
      { colaboradorId: colleague.id, mensajes: ['Ese integrante ya interviene en la causa'] },
    ]);
  });

  it('sin ninguna parte válida rechaza el alta con el motivo de cada parte', async () => {
    const before = await countCausas();

    const response = await post({
      colaboradorIds: [colleague.id],
      partes: [{ rol: 'actor', clienteId: inactiveClient.id }, { rol: 'actor' }],
    }).expect(400);

    expect(response.body.message).toEqual([
      'Parte 1: El cliente está desactivado',
      'Parte 2: Indicá el tipo de persona de la parte',
    ]);
    expect(response.body.rechazos).toEqual([
      { indiceParte: 0, mensajes: ['El cliente está desactivado'] },
      { indiceParte: 1, mensajes: ['Indicá el tipo de persona de la parte'] },
    ]);
    expect(await countCausas()).toBe(before);
  });

  it('el responsable sigue siendo obligatorio: si es inválido, no se crea la causa', async () => {
    const before = await countCausas();

    const response = await post({ responsableId: inactiveLawyer.id, partes: [VALID_PARTY] }).expect(
      409,
    );

    expect(response.body.message).toBe('El integrante está desactivado');
    expect(await countCausas()).toBe(before);
  });

  it('un alta sin rechazos informa una lista vacía', async () => {
    const response = await post({ partes: [VALID_PARTY] }).expect(201);

    expect(response.body.rechazos).toEqual([]);
  });
});
