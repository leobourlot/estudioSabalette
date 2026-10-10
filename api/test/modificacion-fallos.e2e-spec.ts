import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { clearRulingTables, createTestFallo } from './utilidades/fallos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const RULINGS = '/api/panel/jurisprudencia';

/** RF-2, RF-12, RF-17, RF-18, RF-30: modificación de un fallo. */
describe('modificación de un fallo', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let admin: Usuario;
  let adminSession: TestSession;
  let falloId: number;

  const patch = (id: number | string, body: object) =>
    request(app.getHttpServer())
      .patch(`${RULINGS}/${id}`)
      .set('Cookie', `access_token=${adminSession.accessToken}`)
      .send(body);

  const get = (id: number) =>
    request(app.getHttpServer())
      .get(`${RULINGS}/${id}`)
      .set('Cookie', `access_token=${adminSession.accessToken}`);

  const textsOf = (body: { palabrasClave: { texto: string }[] }) =>
    body.palabrasClave.map((palabra) => palabra.texto);

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    lawyer = await createTestUser(app, {
      email: 'abogado@estudio.com',
      nombre: 'Luis',
      apellido: 'Sosa',
    });
    admin = await createTestUser(app, {
      rol: 'admin',
      email: 'admin@estudio.com',
      nombre: 'Ana',
      apellido: 'Sabalette',
    });
    adminSession = await loginAs(app, admin.email!);
  });

  // Cada test parte de un fallo recién cargado por el abogado, sin modificar.
  beforeEach(async () => {
    await clearRulingTables(app);
    falloId = (
      await createTestFallo(app, {
        creadoPorId: lawyer.id,
        numero: '1234/2018',
        enlace: 'https://www.csjn.gov.ar/fallos/1234',
        palabrasClave: ['daño moral', 'responsabilidad objetiva'],
      })
    ).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('modifica cada dato y registra quién lo hizo y cuándo (RF-2, RF-17)', async () => {
    const before = Date.now();
    const response = await patch(falloId, {
      caratula: 'Gómez c/ Seguros SA s/ cobro',
      tribunal: 'CNCom., Sala D',
      fuero: 'otro',
      fecha: '2021-11-30',
      numero: '777/2020',
      sumario: 'Primer párrafo.\n\nSegundo párrafo.',
      enlace: 'https://www.saij.gob.ar/fallo?id=777',
    }).expect(200);

    expect(response.body).toMatchObject({
      id: falloId,
      caratula: 'Gómez c/ Seguros SA s/ cobro',
      tribunal: 'CNCom., Sala D',
      fuero: 'otro',
      fecha: '2021-11-30',
      numero: '777/2020',
      sumario: 'Primer párrafo.\n\nSegundo párrafo.',
      enlace: 'https://www.saij.gob.ar/fallo?id=777',
      activo: true,
      creadoPor: { id: lawyer.id },
      modificadoPor: { id: admin.id, nombre: 'Ana', apellido: 'Sabalette', activo: true },
    });
    expect(new Date(response.body.modificadoEn).getTime()).toBeGreaterThanOrEqual(before - 1000);
    // Las palabras clave no se enviaron: no cambian.
    expect(textsOf(response.body)).toEqual(['daño moral', 'responsabilidad objetiva']);

    const [row]: { numeroBusqueda: string }[] = await app
      .get(DataSource)
      .query('SELECT numeroBusqueda FROM fallos WHERE id = ?', [falloId]);
    expect(row.numeroBusqueda).toBe('7772020');
  });

  it('convierte los textos como en la carga (RF-3)', async () => {
    const response = await patch(falloId, { sumario: '“Nuevo  sumario…” [...]' }).expect(200);
    expect(response.body.sumario).toBe('"Nuevo sumario..." (...)');
  });

  it('null o vacío borra el número y el enlace', async () => {
    const response = await patch(falloId, { numero: null, enlace: '' }).expect(200);

    expect(response.body.numero).toBeNull();
    expect(response.body.enlace).toBeNull();
    const [row]: { numeroBusqueda: string | null }[] = await app
      .get(DataSource)
      .query('SELECT numeroBusqueda FROM fallos WHERE id = ?', [falloId]);
    expect(row.numeroBusqueda).toBeNull();
  });

  it('reemplaza la lista de palabras clave, y cuenta como modificación (RF-2)', async () => {
    const response = await patch(falloId, {
      palabrasClave: ['daño moral', 'Accidente de tránsito'],
    }).expect(200);

    expect(textsOf(response.body)).toEqual(['Accidente de tránsito', 'daño moral']);
    expect(response.body.modificadoPor).toMatchObject({ id: admin.id });
  });

  it('escribir una palabra clave con otra forma cambia la forma del catálogo (RF-12)', async () => {
    const response = await patch(falloId, {
      palabrasClave: ['Daño Moral', 'responsabilidad objetiva'],
    }).expect(200);

    expect(textsOf(response.body)).toEqual(['Daño Moral', 'responsabilidad objetiva']);
    expect(response.body.modificadoPor).toMatchObject({ id: admin.id });
  });

  it.each([
    ['un cuerpo vacío', {}],
    ['los mismos datos', { caratula: 'Pérez c/ López s/ daños', numero: '1234/2018' }],
    [
      'las mismas palabras clave en otro orden',
      {
        palabrasClave: ['responsabilidad objetiva', 'daño moral'],
      },
    ],
  ])('un PATCH con %s no es una modificación (RF-2)', async (_case, body) => {
    const response = await patch(falloId, body).expect(200);

    expect(response.body.modificadoPor).toBeNull();
    expect(response.body.modificadoEn).toBeNull();
  });

  it.each([
    ['la carátula vacía', { caratula: ' ' }, 'La carátula es obligatoria'],
    [
      'una fecha futura',
      { fecha: '2999-01-01' },
      'La fecha del fallo no puede ser posterior a hoy',
    ],
    ['sin palabras clave', { palabrasClave: [] }, 'Indicá al menos una palabra clave'],
    [
      'un enlace con http://',
      { enlace: 'http://csjn.gov.ar' },
      'El enlace debe empezar con https://',
    ],
  ])('rechaza %s con las validaciones de la carga (RF-17)', async (_case, body, message) => {
    const response = await patch(falloId, body).expect(400);
    expect(response.body.message).toContain(message);
  });

  it('rechaza activo: solo cambia con desactivar y reactivar (RF-17)', async () => {
    const response = await patch(falloId, { activo: false }).expect(400);

    expect(JSON.stringify(response.body.message)).toMatch(/activo.*no está permitido/);
    expect((await get(falloId).expect(200)).body.activo).toBe(true);
  });

  describe('aviso de repetido (RF-18)', () => {
    let otherId: number;

    beforeEach(async () => {
      otherId = (
        await createTestFallo(app, {
          creadoPorId: lawyer.id,
          caratula: 'Muñoz c/ Clínica del Sur',
          tribunal: 'Cámara Civil, Sala B',
          numero: '5678/2019',
          fecha: '2020-08-14',
        })
      ).id;
    });

    it('pregunta si el cambio lo hace coincidir con otro fallo, y no guarda nada', async () => {
      const response = await patch(falloId, {
        tribunal: 'camara civil, sala b',
        numero: '5678/2019',
        palabrasClave: ['palabra que no se guarda'],
      }).expect(409);

      expect(response.body).toMatchObject({
        codigo: 'FALLO_REPETIDO',
        message: 'Ya existe un fallo con ese número en ese tribunal',
        fallo: { id: otherId, caratula: 'Muñoz c/ Clínica del Sur' },
      });
      const unchanged = (await get(falloId).expect(200)).body;
      expect(unchanged.tribunal).toBe('CNCiv., Sala A');
      expect(unchanged.modificadoEn).toBeNull();
      const [row]: { total: string }[] = await app
        .get(DataSource)
        .query(
          `SELECT COUNT(*) AS total FROM palabras_clave WHERE clave = 'palabra que no se guarda'`,
        );
      expect(Number(row.total)).toBe(0);
    });

    it('con la confirmación, guarda el cambio', async () => {
      const response = await patch(falloId, {
        tribunal: 'Cámara Civil, Sala B',
        numero: '5678/2019',
        confirmarRepetido: true,
      }).expect(200);

      expect(response.body.tribunal).toBe('Cámara Civil, Sala B');
    });

    it('pregunta por carátula, tribunal y fecha', async () => {
      const response = await patch(falloId, {
        caratula: 'Muñoz c/ Clínica del Sur',
        tribunal: 'Cámara Civil, Sala B',
        fecha: '2020-08-14',
      }).expect(409);

      expect(response.body.message).toBe('Ya existe un fallo con esa carátula, tribunal y fecha');
    });

    it('no pregunta si no cambian la carátula, el tribunal, el número ni la fecha', async () => {
      // Los dos fallos quedan repetidos entre sí, con confirmación.
      await patch(falloId, {
        tribunal: 'Cámara Civil, Sala B',
        numero: '5678/2019',
        confirmarRepetido: true,
      }).expect(200);

      await patch(falloId, { sumario: 'Otro sumario.', fuero: 'laboral' }).expect(200);
      await patch(falloId, { palabrasClave: ['otra palabra'] }).expect(200);
    });

    it('un fallo no se compara consigo mismo', async () => {
      // Cambia cómo está escrito el tribunal: el único que coincide por número es él mismo.
      const response = await patch(falloId, { tribunal: 'CNCIV., SALA A' }).expect(200);
      expect(response.body.tribunal).toBe('CNCIV., SALA A');
    });
  });

  it('rechaza modificar un fallo desactivado (RF-30)', async () => {
    const deactivated = await createTestFallo(app, {
      creadoPorId: lawyer.id,
      caratula: 'Fallo desactivado',
      activo: false,
    });

    const response = await patch(deactivated.id, { sumario: 'Cambio.' }).expect(409);

    expect(response.body.message).toBe('El fallo está desactivado. Reactivalo para modificarlo');
  });

  it.each([
    ['inexistente', '999999'],
    ['no numérico', 'abc'],
  ])('responde 404 con un id %s (RF-33)', async (_case, id) => {
    const response = await patch(id, { sumario: 'Cambio.' }).expect(404);
    expect(response.body.message).toBe('No existe ese fallo');
  });
});
