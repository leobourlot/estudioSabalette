import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const CAUSAS = '/api/panel/causas';
const OTHER_PARTY = { rol: 'actor', tipoPersona: 'fisica', nombre: 'Marta', apellido: 'Ruiz' };

/** RF-16 y RF-19: preguntas al cargar las partes de un alta. */
describe('POST /api/panel/causas: preguntas sobre las partes', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let ana: Usuario;
  let company: Usuario;
  let inactive: Usuario;
  let juan1: Usuario;
  let juan2: Usuario;
  let session: TestSession;

  const post = (partes: object[]) =>
    request(app.getHttpServer())
      .post(CAUSAS)
      .set('Cookie', `access_token=${session.accessToken}`)
      .send({
        caratula: 'Ruiz c/ Otros s/ daños',
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

  const client = (email: string, nombre: string, apellido: string, dni: string, activo = true) =>
    createTestUser(app, {
      rol: 'cliente',
      email,
      nombre,
      apellido,
      activo,
      cliente: { tipoPersona: 'fisica', dni },
    });

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);

    lawyer = await createTestUser(app, {
      email: 'abogado@estudio.com',
      nombre: 'Luis',
      apellido: 'Sosa',
    });
    ana = await client('ana@correo.com', 'Ana', 'Gómez', '30123456');
    inactive = await client('bruno@correo.com', 'Bruno', 'Díaz', '28999888', false);
    juan1 = await client('juan1@correo.com', 'Juan', 'Pérez', '20111111');
    juan2 = await client('juan2@correo.com', 'Juan', 'Pérez', '20222222');
    await client('juan3@correo.com', 'Juan', 'Pérez', '20333333', false);
    company = await createTestUser(app, {
      rol: 'cliente',
      email: 'contacto@empresa.com',
      nombre: 'Laura',
      apellido: 'Contacto',
      cliente: { tipoPersona: 'juridica', cuit: '30712345671', razonSocial: 'Empresa S.A.' },
    });
    session = await loginAs(app, 'abogado@estudio.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('DNI o CUIT de un cliente del estudio (RF-16)', () => {
    const withAnaDni = {
      rol: 'demandado',
      tipoPersona: 'fisica',
      nombre: 'Ana',
      apellido: 'G.',
      dni: '30.123.456',
    };

    it('pregunta si se la agrega como cliente, sin crear la causa', async () => {
      const before = await countCausas();

      const response = await post([OTHER_PARTY, withAnaDni]).expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        message: 'Ese DNI o CUIT pertenece a un cliente del estudio',
        codigo: 'DOCUMENTO_DE_CLIENTE',
        clienteId: ana.id,
        clienteActivo: true,
        indiceParte: 1,
      });
      expect(await countCausas()).toBe(before);
    });

    it('si se responde que sí, se reenvía como parte cliente', async () => {
      const response = await post([OTHER_PARTY, { rol: 'demandado', clienteId: ana.id }]).expect(
        201,
      );

      expect(response.body.causa.partes[1]).toMatchObject({
        esCliente: true,
        nombre: 'Ana',
        apellido: 'Gómez',
      });
    });

    it('si se responde que no, la guarda como parte no cliente', async () => {
      const response = await post([
        OTHER_PARTY,
        { ...withAnaDni, confirmarDocumentoDeCliente: true },
      ]).expect(201);

      expect(response.body.causa.partes[1]).toMatchObject({
        esCliente: false,
        nombre: 'Ana',
        apellido: 'G.',
        dni: '30123456',
      });
    });

    it('con un cliente desactivado avisa y deja guardarla como no cliente', async () => {
      const party = {
        rol: 'actor',
        tipoPersona: 'fisica',
        nombre: 'Bruno',
        apellido: 'D.',
        dni: '28999888',
      };

      const question = await post([party]).expect(409);
      expect(question.body).toEqual({
        statusCode: 409,
        message: 'Ese DNI o CUIT pertenece a un cliente desactivado',
        codigo: 'DOCUMENTO_DE_CLIENTE',
        clienteId: inactive.id,
        clienteActivo: false,
        indiceParte: 0,
      });

      await post([{ ...party, confirmarDocumentoDeCliente: true }]).expect(201);
    });

    it('también pregunta por el CUIT de un cliente persona jurídica', async () => {
      const response = await post([
        {
          rol: 'demandado',
          tipoPersona: 'juridica',
          razonSocial: 'Emp. S.A.',
          cuit: '30-71234567-1',
        },
      ]).expect(409);

      expect(response.body).toMatchObject({
        codigo: 'DOCUMENTO_DE_CLIENTE',
        clienteId: company.id,
      });
    });
  });

  describe('nombre repetido en la causa (RF-19)', () => {
    const lopez = { rol: 'actor', tipoPersona: 'fisica', nombre: 'Pedro', apellido: 'López' };

    it('pregunta si es la misma persona, sin distinguir mayúsculas ni tildes', async () => {
      const response = await post([
        lopez,
        { ...lopez, rol: 'tercero', nombre: 'PEDRO', apellido: 'lopez' },
      ]).expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        message: 'Ya hay una parte con ese nombre en la causa. ¿Es la misma persona?',
        codigo: 'NOMBRE_REPETIDO',
        indiceParte: 1,
      });
    });

    it('si es otra persona, la agrega', async () => {
      const response = await post([
        lopez,
        { ...lopez, rol: 'tercero', confirmarNombreRepetido: true },
      ]).expect(201);

      expect(response.body.causa.partes).toHaveLength(2);
    });

    it('también pregunta por la razón social', async () => {
      const zeta = { rol: 'demandado', tipoPersona: 'juridica', razonSocial: 'Zeta S.R.L.' };

      const response = await post([
        zeta,
        { ...zeta, rol: 'tercero', razonSocial: 'ZETA s.r.l.' },
      ]).expect(409);

      expect(response.body.codigo).toBe('NOMBRE_REPETIDO');
    });

    it('no pregunta si los dos tienen documentos distintos', async () => {
      await post([
        { ...lopez, dni: '20444444' },
        { ...lopez, rol: 'tercero', dni: '20555555' },
      ]).expect(201);
    });

    it('pregunta por el nombre de una parte cliente que coincide con una no cliente sin documento', async () => {
      const response = await post([
        // La primera ya respondió que no es la clienta Ana Gómez (pregunta de clientes del estudio).
        {
          rol: 'actor',
          tipoPersona: 'fisica',
          nombre: 'Ana',
          apellido: 'Gomez',
          confirmarNombreDeCliente: true,
        },
        { rol: 'tercero', clienteId: ana.id },
      ]).expect(409);

      expect(response.body).toMatchObject({ codigo: 'NOMBRE_REPETIDO', indiceParte: 1 });
    });
  });

  describe('nombre de clientes del estudio (RF-19)', () => {
    const perez = { rol: 'demandado', tipoPersona: 'fisica', nombre: 'juan', apellido: 'PEREZ' };

    it('pregunta si es alguno de los clientes activos con ese nombre y muestra sus datos', async () => {
      const response = await post([OTHER_PARTY, perez]).expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        message: 'Hay clientes del estudio con ese nombre. ¿Es alguno de ellos?',
        codigo: 'NOMBRE_DE_CLIENTE',
        indiceParte: 1,
        clientes: [
          {
            id: juan1.id,
            tipoPersona: 'fisica',
            nombre: 'Juan',
            apellido: 'Pérez',
            razonSocial: null,
            dni: '20111111',
            cuit: null,
          },
          {
            id: juan2.id,
            tipoPersona: 'fisica',
            nombre: 'Juan',
            apellido: 'Pérez',
            razonSocial: null,
            dni: '20222222',
            cuit: null,
          },
        ],
      });
    });

    it('si se elige uno, se reenvía como parte cliente', async () => {
      const response = await post([OTHER_PARTY, { rol: 'demandado', clienteId: juan2.id }]).expect(
        201,
      );

      expect(response.body.causa.partes[1]).toMatchObject({
        esCliente: true,
        clienteId: juan2.id,
        dni: '20222222',
      });
    });

    it('si no es ninguno, la guarda como parte no cliente', async () => {
      const response = await post([
        OTHER_PARTY,
        { ...perez, confirmarNombreDeCliente: true },
      ]).expect(201);

      expect(response.body.causa.partes[1]).toMatchObject({ esCliente: false, nombre: 'juan' });
    });

    it('pregunta por la razón social de un cliente persona jurídica', async () => {
      const response = await post([
        { rol: 'demandado', tipoPersona: 'juridica', razonSocial: 'empresa s.a.' },
      ]).expect(409);

      expect(response.body).toMatchObject({
        codigo: 'NOMBRE_DE_CLIENTE',
        clientes: [
          expect.objectContaining({ id: company.id, razonSocial: 'Empresa S.A.', nombre: null }),
        ],
      });
    });

    it('no pregunta si la parte trae un documento que no es de ningún cliente', async () => {
      await post([{ ...perez, dni: '20999999' }]).expect(201);
    });
  });
});
