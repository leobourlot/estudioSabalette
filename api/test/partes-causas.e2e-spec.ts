import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Causa } from '../src/causas/causa.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const CAUSAS = '/api/panel/causas';

interface PartyBody {
  id: number;
  rol: string;
  esCliente: boolean;
  clienteId: number | null;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
}

/** RF-2, RF-13 a RF-21, RF-25: agregar y modificar partes de una causa existente. */
describe('POST /:id/partes y PUT /:id/partes/:parteId', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let ana: Usuario;
  let marcos: Usuario;
  let company: Usuario;
  let inactive: Usuario;
  let companyAsNonClient: Causa;
  let session: TestSession;

  const withSession = (call: request.Test) =>
    call.set('Cookie', `access_token=${session.accessToken}`);
  const addParty = (causaId: number, body: object) =>
    withSession(request(app.getHttpServer()).post(`${CAUSAS}/${causaId}/partes`)).send(body);
  const updateParty = (causaId: number, parteId: number | string, body: object) =>
    withSession(request(app.getHttpServer()).put(`${CAUSAS}/${causaId}/partes/${parteId}`)).send(
      body,
    );
  const getCausa = (id: number) => withSession(request(app.getHttpServer()).get(`${CAUSAS}/${id}`));

  /** Causa con Pedro López (no cliente, DNI 20111222) y Ana Gómez (cliente). */
  const freshCausa = async (changes: Partial<Causa> = {}) => {
    const causa = await createTestCausa(app, {
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      partes: [
        { nombre: 'Pedro', apellido: 'López', dni: '20111222' },
        { clienteId: ana.id, rol: 'demandado' },
      ],
      ...changes,
    });
    const detail = await getCausa(causa.id).expect(200);
    const [pedro, anaParty] = detail.body.partes as PartyBody[];
    return { causa, pedro, anaParty };
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
    marcos = await client('marcos@correo.com', 'Marcos', 'Vidal', '27000000');
    inactive = await client('bruno@correo.com', 'Bruno', 'Díaz', '28999888', false);
    company = await createTestUser(app, {
      rol: 'cliente',
      email: 'contacto@empresa.com',
      nombre: 'Laura',
      apellido: 'Contacto',
      cliente: { tipoPersona: 'juridica', cuit: '30712345671', razonSocial: 'Empresa S.A.' },
    });
    companyAsNonClient = await createTestCausa(app, {
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      caratula: 'Empresa S.A. s/ concurso',
      partes: [
        {
          tipoPersona: 'juridica',
          nombre: null,
          apellido: null,
          razonSocial: 'Emp. S.A.',
          cuit: '30712345671',
        },
      ],
    });
    session = await loginAs(app, 'abogado@estudio.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('agregar una parte (RF-13 a RF-20)', () => {
    it('agrega una parte no cliente y registra la modificación de la causa (RF-2)', async () => {
      const { causa } = await freshCausa();

      const response = await addParty(causa.id, {
        rol: 'tercero',
        tipoPersona: 'fisica',
        nombre: 'Marta',
        apellido: 'Ruiz',
      }).expect(201);

      expect(response.body.causasComoNoCliente).toEqual([]);
      expect(response.body.causa.partes.map((parte: PartyBody) => parte.nombre)).toEqual([
        'Pedro',
        'Ana',
        'Marta',
      ]);
      expect(response.body.causa.modificadoPor).toEqual({
        id: lawyer.id,
        nombre: 'Luis',
        apellido: 'Sosa',
      });
    });

    it('agrega una parte cliente y avisa en qué causas figura como no cliente (RF-14, RF-20)', async () => {
      const { causa } = await freshCausa();

      const response = await addParty(causa.id, { rol: 'tercero', clienteId: company.id }).expect(
        201,
      );

      expect(response.body.causa.partes[2]).toMatchObject({
        esCliente: true,
        razonSocial: 'Empresa S.A.',
      });
      expect(response.body.causasComoNoCliente).toEqual([
        expect.objectContaining({ id: companyAsNonClient.id }),
      ]);
    });

    it('rechaza a una persona que ya es parte (RF-18)', async () => {
      const { causa } = await freshCausa();

      const byClient = await addParty(causa.id, { rol: 'tercero', clienteId: ana.id }).expect(409);
      const byDni = await addParty(causa.id, {
        rol: 'tercero',
        tipoPersona: 'fisica',
        nombre: 'P.',
        apellido: 'López',
        dni: '20.111.222',
      }).expect(409);

      expect(byClient.body.message).toBe('Esa persona ya es parte de la causa');
      expect(byDni.body.message).toBe('Esa persona ya es parte de la causa');
    });

    it('rechaza a un cliente desactivado (RF-17)', async () => {
      const { causa } = await freshCausa();

      const response = await addParty(causa.id, { rol: 'tercero', clienteId: inactive.id }).expect(
        409,
      );

      expect(response.body.message).toBe('El cliente está desactivado');
    });

    it('pregunta si el DNI es de un cliente, sin indiceParte, y guarda al confirmar (RF-16)', async () => {
      const { causa } = await freshCausa();
      const party = {
        rol: 'tercero',
        tipoPersona: 'fisica',
        nombre: 'M.',
        apellido: 'Vidal',
        dni: '27000000',
      };

      const question = await addParty(causa.id, party).expect(409);
      expect(question.body).toEqual({
        statusCode: 409,
        message: 'Ese DNI o CUIT pertenece a un cliente del estudio',
        codigo: 'DOCUMENTO_DE_CLIENTE',
        clienteId: marcos.id,
        clienteActivo: true,
      });

      await addParty(causa.id, { ...party, confirmarDocumentoDeCliente: true }).expect(201);
    });

    it('pregunta por un nombre repetido e indica la parte existente (RF-19)', async () => {
      const { causa, pedro } = await freshCausa();

      const response = await addParty(causa.id, {
        rol: 'tercero',
        tipoPersona: 'fisica',
        nombre: 'pedro',
        apellido: 'LOPEZ',
      }).expect(409);

      expect(response.body).toMatchObject({ codigo: 'NOMBRE_REPETIDO', parteId: pedro.id });
    });

    it('valida el formato de la parte', async () => {
      const { causa } = await freshCausa();

      const response = await addParty(causa.id, { rol: 'querellante', clienteId: ana.id }).expect(
        400,
      );

      expect(response.body.message).toEqual([
        'El rol procesal debe ser actor, demandado, tercero u otro',
      ]);
    });

    it('no agrega partes a una causa desactivada (RF-41)', async () => {
      const { causa } = await freshCausa({ activa: false });

      const response = await addParty(causa.id, { rol: 'tercero', clienteId: marcos.id }).expect(
        409,
      );

      expect(response.body.message).toBe('La causa está desactivada. Reactivala para modificarla');
    });
  });

  describe('modificar una parte (RF-16, RF-21, RF-25)', () => {
    it('cambia solo el rol de una parte cliente o no cliente', async () => {
      const { causa, pedro, anaParty } = await freshCausa();

      await updateParty(causa.id, pedro.id, { rol: 'otro' }).expect(200);
      const response = await updateParty(causa.id, anaParty.id, { rol: 'tercero' }).expect(200);

      expect(response.body.causa.partes).toEqual([
        expect.objectContaining({ id: pedro.id, rol: 'otro', nombre: 'Pedro', dni: '20111222' }),
        expect.objectContaining({ id: anaParty.id, rol: 'tercero', esCliente: true }),
      ]);
      expect(response.body.causa.modificadoPor).toMatchObject({ id: lawyer.id });
    });

    it('reemplaza los datos de una parte no cliente, incluso su tipo de persona', async () => {
      const { causa, pedro } = await freshCausa();

      const response = await updateParty(causa.id, pedro.id, {
        rol: 'demandado',
        tipoPersona: 'juridica',
        razonSocial: 'López Hnos. S.R.L.',
      }).expect(200);

      expect(response.body.causa.partes[0]).toMatchObject({
        id: pedro.id,
        rol: 'demandado',
        tipoPersona: 'juridica',
        nombre: null,
        apellido: null,
        dni: null,
        razonSocial: 'López Hnos. S.R.L.',
      });
    });

    it('conservar el propio DNI no cuenta como persona repetida', async () => {
      const { causa, pedro } = await freshCausa();

      await updateParty(causa.id, pedro.id, {
        rol: 'actor',
        tipoPersona: 'fisica',
        nombre: 'Pedro José',
        apellido: 'López',
        dni: '20111222',
      }).expect(200);
    });

    it('no modifica los datos de una parte cliente: se cambian desde su cuenta (RF-21)', async () => {
      const { causa, anaParty } = await freshCausa();

      const response = await updateParty(causa.id, anaParty.id, {
        rol: 'actor',
        tipoPersona: 'fisica',
        nombre: 'Ana',
        apellido: 'Otra',
      }).expect(400);

      expect(response.body.message).toBe(
        'Los datos de una parte cliente se modifican desde su cuenta',
      );
    });

    it('no cambia una parte cliente por otro cliente', async () => {
      const { causa, anaParty } = await freshCausa();

      const response = await updateParty(causa.id, anaParty.id, {
        rol: 'actor',
        clienteId: marcos.id,
      }).expect(400);

      expect(response.body.message).toBe('Una parte cliente no se puede cambiar por otro cliente');
    });

    it('pregunta si el nuevo DNI es de un cliente y, si se responde que sí, la convierte en parte cliente (RF-16)', async () => {
      const { causa, pedro } = await freshCausa();
      const changes = {
        rol: 'actor',
        tipoPersona: 'fisica',
        nombre: 'Pedro',
        apellido: 'López',
        dni: '27000000',
      };

      const question = await updateParty(causa.id, pedro.id, changes).expect(409);
      expect(question.body).toMatchObject({ codigo: 'DOCUMENTO_DE_CLIENTE', clienteId: marcos.id });

      const converted = await updateParty(causa.id, pedro.id, {
        rol: 'actor',
        clienteId: marcos.id,
      }).expect(200);
      expect(converted.body.causa.partes[0]).toMatchObject({
        id: pedro.id,
        esCliente: true,
        clienteId: marcos.id,
        nombre: 'Marcos',
        apellido: 'Vidal',
        dni: '27000000',
      });
      const [row]: Record<string, unknown>[] = await app
        .get(DataSource)
        .query('SELECT nombre, apellido, dni, tipoPersona FROM partes WHERE id = ?', [pedro.id]);
      expect(row).toEqual({ nombre: null, apellido: null, dni: null, tipoPersona: null });
    });

    it('si se responde que no, guarda el DNI en la parte no cliente', async () => {
      const { causa, pedro } = await freshCausa();

      const response = await updateParty(causa.id, pedro.id, {
        rol: 'actor',
        tipoPersona: 'fisica',
        nombre: 'Pedro',
        apellido: 'López',
        dni: '27000000',
        confirmarDocumentoDeCliente: true,
      }).expect(200);

      expect(response.body.causa.partes[0]).toMatchObject({ esCliente: false, dni: '27000000' });
    });

    it('rechaza que la parte pase a ser una persona que ya está en la causa (RF-18)', async () => {
      const { causa, pedro } = await freshCausa();

      const response = await updateParty(causa.id, pedro.id, {
        rol: 'actor',
        tipoPersona: 'fisica',
        nombre: 'Ana',
        apellido: 'Gómez',
        dni: '30123456',
      }).expect(409);

      expect(response.body.message).toBe('Esa persona ya es parte de la causa');
    });

    it('responde 404 a una parte de otra causa o inexistente (RF-25)', async () => {
      const { causa } = await freshCausa();
      const other = await freshCausa();

      const fromOther = await updateParty(causa.id, other.pedro.id, { rol: 'otro' }).expect(404);
      await updateParty(causa.id, 99999, { rol: 'otro' }).expect(404);
      await updateParty(causa.id, 'abc', { rol: 'otro' }).expect(404);

      expect(fromOther.body.message).toBe('No existe esa parte');
    });
  });

  it('un cambio en la cuenta del cliente se ve en la parte sin modificar la causa (RF-2, RF-14)', async () => {
    const otherClient = await client('rita@correo.com', 'Rita', 'Paz', '31000000');
    const causa = await createTestCausa(app, {
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      partes: [{ clienteId: otherClient.id }],
    });

    await withSession(request(app.getHttpServer()).patch(`/api/panel/usuarios/${otherClient.id}`))
      .send({ nombre: 'Margarita' })
      .expect(200);

    const response = await getCausa(causa.id).expect(200);
    expect(response.body.partes[0]).toMatchObject({ nombre: 'Margarita', apellido: 'Paz' });
    expect(response.body.modificadoEn).toBeNull();
  });
});
