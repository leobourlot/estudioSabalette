import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Causa } from '../src/causas/causa.entity.js';
import { formatDate, formatDateInWords } from '../src/modelos-escritos/formato-escrito.js';
import { todayInBuenosAires } from '../src/movimientos/reglas-movimientos.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearModelTables, createTestModelo } from './utilidades/modelos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const TEXT = [
  'Señor Juez:',
  '',
  '#CLIENTES_CON_DOCUMENTO#, con domicilio en #CLIENTES_DOMICILIO#, en los autos "#CARATULA#",',
  'Expte. Nº #NUMERO_EXPEDIENTE#, ante #JUZGADO# (fuero #FUERO#), contra #DEMANDADOS_CON_DOCUMENTO#.',
  '',
  '#ABOGADO_RESPONSABLE#',
  '#FECHA#',
].join('\n');

/** RF-30 a RF-40: completar un modelo con los datos de una causa. */
describe('escrito completado', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let admin: Usuario;
  let luis: Usuario;
  let maria: Usuario;
  let lawyerSession: TestSession;
  let adminSession: TestSession;
  let causaId: number;
  let modeloId: number;
  let fixedId: number;

  const complete = (causa: number, modelo: number, session: TestSession = lawyerSession) =>
    request(app.getHttpServer())
      .get(`/api/panel/causas/${causa}/escritos/${modelo}`)
      .set('Cookie', `access_token=${session.accessToken}`);

  const today = () => todayInBuenosAires(new Date());

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearModelTables(app);
    lawyer = await createTestUser(app, {
      email: 'laura@estudio.com',
      nombre: 'Laura',
      apellido: 'Sabalette',
    });
    admin = await createTestUser(app, { rol: 'admin', email: 'admin@estudio.com' });
    luis = await createTestUser(app, {
      rol: 'cliente',
      email: 'luis@correo.com',
      nombre: 'Luis',
      apellido: 'Gómez',
      cliente: { tipoPersona: 'fisica', dni: '20111222', domicilio: 'San Martín 100' },
    });
    maria = await createTestUser(app, {
      rol: 'cliente',
      email: 'maria@correo.com',
      nombre: 'María',
      apellido: 'López',
      cliente: { tipoPersona: 'fisica', dni: '27333444', telefono: '3434112233' },
    });
    lawyerSession = await loginAs(app, lawyer.email!);
    adminSession = await loginAs(app, admin.email!);

    causaId = (
      await createTestCausa(app, {
        responsableId: lawyer.id,
        creadoPorId: lawyer.id,
        caratula: 'Gómez, Luis c/ Acme S.A. s/ daños',
        fuero: 'civil',
        partes: [
          { rol: 'actor', clienteId: maria.id },
          { rol: 'actor', clienteId: luis.id },
          {
            rol: 'demandado',
            tipoPersona: 'juridica',
            nombre: null,
            apellido: null,
            razonSocial: 'Acme S.A.',
            cuit: '30712345678',
          },
          { rol: 'demandado', tipoPersona: 'fisica', nombre: 'Pedro', apellido: 'Ruiz' },
          // Desvinculada: nunca figura en un escrito (RF-36).
          { rol: 'demandado', nombre: 'Parte', apellido: 'Desvinculada', vigente: false },
        ],
      })
    ).id;
    modeloId = (
      await createTestModelo(app, {
        creadoPorId: lawyer.id,
        titulo: 'Demanda de daños',
        tipo: 'demanda',
        texto: TEXT,
      })
    ).id;
    fixedId = (
      await createTestModelo(app, {
        creadoPorId: lawyer.id,
        titulo: 'Texto fijo',
        texto: 'Texto fijo, local # 3.\n\nSin variables.',
      })
    ).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('completa el modelo con los datos de la causa, las marcas de lo que falta y los avisos', async () => {
    const response = await complete(causaId, modeloId).expect(200);

    expect(response.body).toEqual({
      causa: { id: causaId, caratula: 'Gómez, Luis c/ Acme S.A. s/ daños' },
      modelo: { id: modeloId, titulo: 'Demanda de daños' },
      texto: [
        'Señor Juez:',
        '',
        'Luis Gómez, DNI 20.111.222 y María López, DNI 27.333.444, con domicilio en Luis Gómez: San Martín 100 y María López: (FALTA DOMICILIO), en los autos "Gómez, Luis c/ Acme S.A. s/ daños",',
        'Expte. Nº (FALTA NÚMERO DE EXPEDIENTE), ante (FALTA JUZGADO) (fuero Civil), contra Acme S.A., CUIT 30-71234567-8 y Pedro Ruiz, (FALTA DNI).',
        '',
        'Laura Sabalette',
        formatDate(today()),
      ].join('\n'),
      faltantes: [
        'domicilio de María López',
        'número de expediente',
        'juzgado',
        'DNI de Pedro Ruiz',
      ],
      clientesDesactivados: [],
      responsableDesactivado: false,
    });
  });

  it('la respuesta solo lleva el escrito: ni otros datos de la causa, ni de las cuentas (RF-33)', async () => {
    const response = await complete(causaId, modeloId).expect(200);

    expect(Object.keys(response.body).sort()).toEqual(
      [
        'causa',
        'modelo',
        'texto',
        'faltantes',
        'clientesDesactivados',
        'responsableDesactivado',
      ].sort(),
    );
    const json = JSON.stringify(response.body);
    // Ni emails, ni teléfonos, ni la parte desvinculada, ni las marcas del modelo.
    expect(json).not.toContain('@correo.com');
    expect(json).not.toContain('@estudio.com');
    expect(json).not.toContain('3434112233');
    expect(json).not.toContain('Desvinculada');
    expect(json).not.toContain('#CARATULA#');
    expect(json).not.toContain('contrasenaHash');
  });

  it('ninguna respuesta queda en la caché del navegador (RF-46)', async () => {
    const response = await complete(causaId, modeloId).expect(200);

    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('el escrito es el mismo para cualquier integrante que lo complete (RF-38)', async () => {
    const asLawyer = await complete(causaId, modeloId).expect(200);
    const asAdmin = await complete(causaId, modeloId, adminSession).expect(200);

    expect(asAdmin.body).toEqual(asLawyer.body);
  });

  it('un modelo sin variables se muestra tal cual, sin faltantes ni avisos (RF-12)', async () => {
    const response = await complete(causaId, fixedId).expect(200);

    expect(response.body).toMatchObject({
      texto: 'Texto fijo, local # 3.\n\nSin variables.',
      faltantes: [],
      clientesDesactivados: [],
      responsableDesactivado: false,
    });
  });

  it('pone la fecha del día en Buenos Aires, en números y en letras (RF-9)', async () => {
    const dated = await createTestModelo(app, {
      creadoPorId: lawyer.id,
      titulo: 'Con fecha',
      texto: '#FECHA# / #FECHA_EN_LETRAS#',
    });

    const response = await complete(causaId, dated.id).expect(200);

    expect(response.body.texto).toBe(`${formatDate(today())} / ${formatDateInWords(today())}`);
  });

  it('cada pedido arma el escrito de nuevo, con los datos del momento (RF-33)', async () => {
    await app
      .get(DataSource)
      .getRepository(Causa)
      .update(causaId, { numeroExpediente: '1234/2026', juzgado: 'Juzgado Civil Nº 3' });

    const response = await complete(causaId, modeloId).expect(200);

    expect(response.body.texto).toContain(
      'Expte. Nº 1234/2026, ante Juzgado Civil Nº 3 (fuero Civil)',
    );
    expect(response.body.faltantes).toEqual(['domicilio de María López', 'DNI de Pedro Ruiz']);
  });

  it('un dato que contiene una marca de variable se inserta tal cual (RF-33)', async () => {
    const tricky = await createTestCausa(app, {
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      caratula: 'Gómez c/ #FECHA# S.A.',
    });
    const template = await createTestModelo(app, {
      creadoPorId: lawyer.id,
      titulo: 'Carátula con marca',
      texto: 'Autos "#CARATULA#".',
    });

    const response = await complete(tricky.id, template.id).expect(200);

    expect(response.body.texto).toBe('Autos "Gómez c/ #FECHA# S.A.".');
  });

  it('avisa los clientes y el responsable desactivados, que igual figuran (RF-40)', async () => {
    const users = app.get(DataSource).getRepository(Usuario);
    await users.update(maria.id, { activo: false });
    await users.update(lawyer.id, { activo: false });

    // La sesión del abogado ya no sirve: completa el administrador.
    const response = await complete(causaId, modeloId, adminSession).expect(200);

    expect(response.body.clientesDesactivados).toEqual(['María López']);
    expect(response.body.responsableDesactivado).toBe(true);
    expect(response.body.texto).toContain('María López, DNI 27.333.444');
    expect(response.body.texto).toContain('\nLaura Sabalette\n');

    // Un modelo que no usa variables de clientes ni la del responsable no avisa nada.
    const fixed = await complete(causaId, fixedId, adminSession).expect(200);
    expect(fixed.body).toMatchObject({ clientesDesactivados: [], responsableDesactivado: false });
  });
});
