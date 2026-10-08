import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Causa } from '../src/causas/causa.entity.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestClient, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables } from './utilidades/movimientos-de-prueba.js';
import { loginAs } from './utilidades/sesion-de-prueba.js';

/** Todas las claves de un objeto, también las anidadas. */
function allKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(allKeys);
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...allKeys(child)]);
}

const FORBIDDEN_KEYS = [
  'dni',
  'cuit',
  'tipoPersona',
  'clienteId',
  'esCliente',
  'clienteActivo',
  'email',
  'colaboradores',
  'partesDesvinculadas',
  'activa',
  'activo',
  'vigente',
  'creadoPor',
  'creadoEn',
  'modificadoPor',
  'modificadoEn',
  'desactivadaPor',
  'reactivadaPor',
  'responsableId',
];

/** Detalle de una causa en el portal (spec 004, RF-13 a RF-17, RF-30). */
describe('GET /api/portal/causas/:causaId', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let collaborator: Usuario;

  beforeAll(async () => {
    app = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await clearTables(app);
    await clearMovementTables(app);
    lawyer = await createTestUser(app, {
      email: 'abogado@estudio.com',
      nombre: 'Luis',
      apellido: 'Sosa',
    });
    collaborator = await createTestUser(app, {
      email: 'colaboradora@estudio.com',
      nombre: 'Marta',
      apellido: 'Ibarra',
    });
  });

  async function detailAs(client: Usuario, causa: Causa) {
    const { accessToken } = await loginAs(app, client.email!);
    const response = await request(app.getHttpServer())
      .get(`/api/portal/causas/${causa.id}`)
      .set('Cookie', `access_token=${accessToken}`)
      .expect(200);
    return response.body;
  }

  it('envía exactamente los datos de la causa, las partes y el responsable', async () => {
    const client = await createTestClient(app, { nombre: 'Ana', apellido: 'Gómez' });
    const causa = await createTestCausa(app, {
      caratula: 'Gómez c/ López s/ daños',
      numeroExpediente: '1234/2024',
      juzgado: 'Juzgado Civil Nº 3',
      fuero: 'civil',
      estado: 'paralizada',
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      colaboradorIds: [collaborator.id],
      partes: [
        { rol: 'demandado', nombre: 'Pedro', apellido: 'López', dni: '20999888' },
        { rol: 'actor', clienteId: client.id },
        { rol: 'demandado', nombre: 'Quique', apellido: 'Desvinculado', vigente: false },
      ],
    });

    expect(await detailAs(client, causa)).toEqual({
      id: causa.id,
      caratula: 'Gómez c/ López s/ daños',
      numeroExpediente: '1234/2024',
      juzgado: 'Juzgado Civil Nº 3',
      fuero: 'civil',
      estado: 'paralizada',
      esIncidente: false,
      expedientePrincipal: null,
      partes: [
        { nombre: 'Ana Gómez', rol: 'actor', esVos: true },
        { nombre: 'Pedro López', rol: 'demandado', esVos: false },
      ],
      responsable: { nombre: 'Luis', apellido: 'Sosa' },
    });
  });

  it('dos clientes de la misma causa ven cada uno "Vos" en su propia parte', async () => {
    const ana = await createTestClient(app, { nombre: 'Ana', apellido: 'Gómez' });
    const bruno = await createTestClient(app, { nombre: 'Bruno', apellido: 'Gómez' });
    const causa = await createTestCausa(app, {
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      partes: [{ clienteId: bruno.id }, { clienteId: ana.id }],
    });

    expect((await detailAs(ana, causa)).partes).toEqual([
      { nombre: 'Ana Gómez', rol: 'actor', esVos: true },
      { nombre: 'Bruno Gómez', rol: 'actor', esVos: false },
    ]);
    expect((await detailAs(bruno, causa)).partes).toEqual([
      { nombre: 'Ana Gómez', rol: 'actor', esVos: false },
      { nombre: 'Bruno Gómez', rol: 'actor', esVos: true },
    ]);
  });

  it('un cliente persona jurídica figura con su razón social, no con la persona de contacto', async () => {
    const company = await createTestUser(app, {
      rol: 'cliente',
      email: 'contacto@empresa.com',
      nombre: 'Carla',
      apellido: 'Ríos',
      cliente: { tipoPersona: 'juridica', cuit: '30712345678', razonSocial: 'Ríos Hnos SRL' },
    });
    const causa = await createTestCausa(app, {
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      partes: [{ clienteId: company.id }],
    });

    const detail = await detailAs(company, causa);

    expect(detail.partes).toEqual([{ nombre: 'Ríos Hnos SRL', rol: 'actor', esVos: true }]);
    expect(JSON.stringify(detail)).not.toContain('Carla');
  });

  it('con el responsable desactivado, no muestra ningún abogado (RF-16)', async () => {
    const client = await createTestClient(app);
    const causa = await createTestCausa(app, {
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      partes: [{ clienteId: client.id }],
    });
    expect((await detailAs(client, causa)).responsable).toEqual({
      nombre: 'Luis',
      apellido: 'Sosa',
    });

    await app.get(DataSource).getRepository(Usuario).update(lawyer.id, { activo: false });

    expect((await detailAs(client, causa)).responsable).toBeNull();
  });

  it('de un incidente, envía el número del expediente principal', async () => {
    const client = await createTestClient(app);
    const causa = await createTestCausa(app, {
      esIncidente: true,
      expedientePrincipal: '999/2023',
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      partes: [{ clienteId: client.id }],
    });

    expect(await detailAs(client, causa)).toMatchObject({
      esIncidente: true,
      expedientePrincipal: '999/2023',
    });
  });

  it('ninguna clave de la respuesta revela documentos, cuentas, colaboradores ni auditoría (RF-15, RF-17, RF-30)', async () => {
    const client = await createTestClient(app);
    const causa = await createTestCausa(app, {
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      colaboradorIds: [collaborator.id],
      partes: [
        { clienteId: client.id },
        { rol: 'demandado', nombre: 'Pedro', apellido: 'López', dni: '20999888' },
        { rol: 'tercero', nombre: 'Quique', apellido: 'Desvinculado', vigente: false },
      ],
    });

    const detail = await detailAs(client, causa);
    const keys = allKeys(detail);
    const json = JSON.stringify(detail);

    for (const key of FORBIDDEN_KEYS) expect(keys).not.toContain(key);
    for (const text of ['20999888', client.email!, '@estudio.com', 'Ibarra', 'Desvinculado']) {
      expect(json).not.toContain(text);
    }
    expect(keys.filter((key) => key === 'id')).toHaveLength(1);
  });
});
