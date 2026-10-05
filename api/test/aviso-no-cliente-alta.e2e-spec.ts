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

/** RF-20: al vincular un cliente, avisar en qué otras causas figura como no cliente. */
describe('POST /api/panel/causas: aviso de causas como no cliente', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let ana: Usuario;
  let company: Usuario;
  let asNonClient: Causa;
  let companyAsNonClient: Causa;
  let session: TestSession;

  const post = (partes: object[]) =>
    request(app.getHttpServer())
      .post(CAUSAS)
      .set('Cookie', `access_token=${session.accessToken}`)
      .send({
        caratula: 'Gómez c/ Otros s/ daños',
        fuero: 'civil',
        responsableId: lawyer.id,
        partes,
      });

  const nonClientParty = (dni: string, vigente = true) => ({
    tipoPersona: 'fisica' as const,
    nombre: 'Ana',
    apellido: 'Gómez',
    dni,
    vigente,
  });

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);

    lawyer = await createTestUser(app, {
      email: 'abogado@estudio.com',
      nombre: 'Luis',
      apellido: 'Sosa',
    });
    ana = await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });
    company = await createTestUser(app, {
      rol: 'cliente',
      email: 'contacto@empresa.com',
      nombre: 'Laura',
      apellido: 'Contacto',
      cliente: { tipoPersona: 'juridica', cuit: '30712345671', razonSocial: 'Empresa S.A.' },
    });

    const base = { responsableId: lawyer.id, creadoPorId: lawyer.id };
    asNonClient = await createTestCausa(app, {
      ...base,
      caratula: 'López c/ Gómez s/ desalojo',
      numeroExpediente: '10/2023',
      partes: [{ nombre: 'Pedro', apellido: 'López' }, nonClientParty('30123456')],
    });
    // No cuentan: causa desactivada, parte desvinculada y otro DNI.
    await createTestCausa(app, { ...base, activa: false, partes: [nonClientParty('30123456')] });
    await createTestCausa(app, {
      ...base,
      partes: [{ nombre: 'Pedro', apellido: 'López' }, nonClientParty('30123456', false)],
    });
    await createTestCausa(app, { ...base, partes: [nonClientParty('30999999')] });
    companyAsNonClient = await createTestCausa(app, {
      ...base,
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

  it('informa las causas activas donde el cliente figura como parte no cliente vigente', async () => {
    const response = await post([{ rol: 'actor', clienteId: ana.id }]).expect(201);

    expect(response.body.causasComoNoCliente).toEqual([
      { id: asNonClient.id, caratula: 'López c/ Gómez s/ desalojo', numeroExpediente: '10/2023' },
    ]);
  });

  it('esas causas no quedan vinculadas al cliente', async () => {
    await post([{ rol: 'actor', clienteId: ana.id }]).expect(201);

    const parties: { clienteId: number | null; dni: string }[] = await app
      .get(DataSource)
      .query('SELECT clienteId, dni FROM partes WHERE causaId = ? AND dni IS NOT NULL', [
        asNonClient.id,
      ]);
    expect(parties).toEqual([{ clienteId: null, dni: '30123456' }]);
  });

  it('busca por CUIT a un cliente persona jurídica', async () => {
    const response = await post([{ rol: 'actor', clienteId: company.id }]).expect(201);

    expect(response.body.causasComoNoCliente).toEqual([
      expect.objectContaining({ id: companyAsNonClient.id }),
    ]);
  });

  it('junta las causas de todos los clientes vinculados, sin repetirlas', async () => {
    const response = await post([
      { rol: 'actor', clienteId: ana.id },
      { rol: 'actor', clienteId: company.id },
    ]).expect(201);

    expect(response.body.causasComoNoCliente.map((causa: { id: number }) => causa.id)).toEqual([
      asNonClient.id,
      companyAsNonClient.id,
    ]);
  });

  it('no avisa nada si no se vincula ningún cliente', async () => {
    const response = await post([
      { rol: 'actor', tipoPersona: 'fisica', nombre: 'Marta', apellido: 'Ruiz' },
    ]).expect(201);

    expect(response.body.causasComoNoCliente).toEqual([]);
  });
});
