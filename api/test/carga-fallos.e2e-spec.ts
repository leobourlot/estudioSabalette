import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { clearRulingTables } from './utilidades/fallos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const RULINGS = '/api/panel/jurisprudencia';

const MINIMAL = {
  caratula: 'Pérez c/ López s/ daños',
  tribunal: 'CNCiv., Sala A',
  fuero: 'civil',
  fecha: '2019-05-03',
  sumario: 'La responsabilidad del dueño de la cosa es objetiva.',
  palabrasClave: ['responsabilidad objetiva'],
};

interface KeywordRow {
  id: number;
  texto: string;
  clave: string;
}

/** RF-1 a RF-8, RF-10 a RF-12, RF-14, RF-16: carga de fallos y catálogo de palabras clave. */
describe('carga de fallos', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;
  // Cada fallo de este archivo lleva otra carátula, para que no coincida con uno anterior.
  let counter = 0;

  const post = (body: object) =>
    request(app.getHttpServer())
      .post(RULINGS)
      .set('Cookie', `access_token=${session.accessToken}`)
      .send(body);

  const get = (id: number) =>
    request(app.getHttpServer())
      .get(`${RULINGS}/${id}`)
      .set('Cookie', `access_token=${session.accessToken}`);

  const unique = (changes: object = {}) => ({
    ...MINIMAL,
    caratula: `Fallo de prueba ${++counter}`,
    ...changes,
  });

  const keywords = (): Promise<KeywordRow[]> =>
    app.get(DataSource).query('SELECT id, texto, clave FROM palabras_clave ORDER BY clave');

  const textsOf = (body: { palabrasClave: { texto: string }[] }) =>
    body.palabrasClave.map((palabra) => palabra.texto);

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearRulingTables(app);
    lawyer = await createTestUser(app, {
      email: 'abogado@estudio.com',
      nombre: 'Luis',
      apellido: 'Sosa',
    });
    session = await loginAs(app, lawyer.email!);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('carga un fallo completo, activo y con su autor (RF-1, RF-2, RF-16)', async () => {
    const before = Date.now();
    const response = await post({
      ...MINIMAL,
      numero: '1234/2018',
      enlace:
        'https://sjconsulta.csjn.gov.ar/sjconsulta/documentos/verDocumentoById.html?idDocumento=7867721',
      palabrasClave: ['responsabilidad objetiva', 'Daño moral'],
    }).expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      caratula: 'Pérez c/ López s/ daños',
      tribunal: 'CNCiv., Sala A',
      fuero: 'civil',
      fecha: '2019-05-03',
      numero: '1234/2018',
      sumario: 'La responsabilidad del dueño de la cosa es objetiva.',
      enlace:
        'https://sjconsulta.csjn.gov.ar/sjconsulta/documentos/verDocumentoById.html?idDocumento=7867721',
      activo: true,
      creadoPor: { id: lawyer.id, nombre: 'Luis', apellido: 'Sosa', activo: true },
      modificadoPor: null,
      modificadoEn: null,
    });
    expect(textsOf(response.body)).toEqual(['Daño moral', 'responsabilidad objetiva']);
    expect(new Date(response.body.creadoEn).getTime()).toBeGreaterThanOrEqual(before - 1000);

    // Queda guardado: la consulta devuelve lo mismo.
    expect((await get(response.body.id).expect(200)).body).toEqual(response.body);
  });

  it('carga un fallo sin número ni enlace', async () => {
    const response = await post(unique()).expect(201);

    expect(response.body.numero).toBeNull();
    expect(response.body.enlace).toBeNull();
  });

  it('guarda el número sin separadores para la búsqueda (RF-23)', async () => {
    const response = await post(unique({ numero: 'CIV 1234/2018-A' })).expect(201);
    const [row]: { numeroBusqueda: string }[] = await app
      .get(DataSource)
      .query('SELECT numeroBusqueda FROM fallos WHERE id = ?', [response.body.id]);

    expect(row.numeroBusqueda).toBe('CIV12342018A');
  });

  it('guarda una fecha histórica y la devuelve igual (RF-7)', async () => {
    const response = await post(unique({ fecha: '1887-05-03' })).expect(201);
    expect(response.body.fecha).toBe('1887-05-03');
  });

  it('guarda convertido un sumario pegado con caracteres tipográficos (RF-3)', async () => {
    const response = await post(
      unique({
        caratula: `“Gómez” c/ Seguros  SA – caso tipográfico`,
        sumario: '“La responsabilidad…” — ver §3.\r\n\r\n\tCita: [...] el considerando 5º.',
      }),
    ).expect(201);

    expect(response.body.caratula).toBe(`"Gómez" c/ Seguros SA - caso tipográfico`);
    expect(response.body.sumario).toBe(
      '"La responsabilidad..." - ver párr. 3.\n\n Cita: (...) el considerando 5º.',
    );
  });

  it('rechaza un sumario con signos que permiten inyectar código, sin repetirlo (RF-5, RF-8)', async () => {
    const response = await post(unique({ sumario: 'MARCA-7731 <script>alert(1)</script>' })).expect(
      400,
    );

    expect(JSON.stringify(response.body)).not.toContain('MARCA-7731');
    expect(JSON.stringify(response.body)).toContain('El sumario solo puede tener');
  });

  describe('catálogo de palabras clave (RF-10 a RF-12, RF-14)', () => {
    it('agrega una palabra nueva al catálogo con su clave de comparación', async () => {
      await post(unique({ palabrasClave: ['Mala Praxis Médica'] })).expect(201);

      const row = (await keywords()).find((keyword) => keyword.clave === 'mala praxis medica');
      expect(row?.texto).toBe('Mala Praxis Médica');
    });

    it('enviar el texto exacto del catálogo no cambia su forma ni agrega otra palabra', async () => {
      const before = await keywords();
      const response = await post(unique({ palabrasClave: ['Mala Praxis Médica'] })).expect(201);

      expect(textsOf(response.body)).toEqual(['Mala Praxis Médica']);
      expect(await keywords()).toEqual(before);
    });

    it('escribirla con otra forma cambia la forma del catálogo en todos los fallos, sin modificarlos', async () => {
      const first = await post(unique({ palabrasClave: ['dano emergente'] })).expect(201);
      expect(textsOf(first.body)).toEqual(['dano emergente']);

      const second = await post(unique({ palabrasClave: ['Daño emergente'] })).expect(201);
      expect(textsOf(second.body)).toEqual(['Daño emergente']);

      // El primer fallo muestra la forma nueva, y no figura como modificado (RF-12).
      const firstAgain = (await get(first.body.id).expect(200)).body;
      expect(textsOf(firstAgain)).toEqual(['Daño emergente']);
      expect(firstAgain.modificadoEn).toBeNull();
      expect(firstAgain.modificadoPor).toBeNull();

      // Sigue siendo una sola palabra del catálogo.
      const rows = (await keywords()).filter((keyword) => keyword.clave === 'dano emergente');
      expect(rows).toHaveLength(1);
      expect(first.body.palabrasClave[0].id).toBe(second.body.palabrasClave[0].id);
    });

    it('"año" y "ano" son la misma palabra clave (RF-9, RF-11)', async () => {
      const first = await post(unique({ palabrasClave: ['año judicial'] })).expect(201);
      const second = await post(unique({ palabrasClave: ['ano judicial'] })).expect(201);

      expect(second.body.palabrasClave[0].id).toBe(first.body.palabrasClave[0].id);
    });

    it('guarda una sola vez las palabras repetidas en el mismo fallo (RF-14)', async () => {
      const response = await post(
        unique({ palabrasClave: ['Lucro cesante', 'lucro  cesante', 'LUCRO CESANTE'] }),
      ).expect(201);

      expect(textsOf(response.body)).toEqual(['Lucro cesante']);
    });

    it('una carga rechazada por validación no agrega palabras al catálogo (RF-12)', async () => {
      const before = await keywords();

      await post(
        unique({ fecha: '2999-01-01', palabrasClave: ['palabra que no se guarda'] }),
      ).expect(400);

      expect(await keywords()).toEqual(before);
    });

    it('dos cargas simultáneas con la misma palabra en formas distintas dejan una sola fila', async () => {
      const [first, second] = await Promise.all([
        post(unique({ palabrasClave: ['Caso Fortuito', 'culpa de la víctima'] })),
        post(unique({ palabrasClave: ['culpa de la victima', 'caso fortuito'] })),
      ]);

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      const rows = await keywords();
      expect(rows.filter((keyword) => keyword.clave === 'caso fortuito')).toHaveLength(1);
      expect(rows.filter((keyword) => keyword.clave === 'culpa de la victima')).toHaveLength(1);
      // Los dos fallos comparten las mismas dos palabras del catálogo.
      const idsOf = (body: { palabrasClave: { id: number }[] }) =>
        body.palabrasClave.map((palabra) => palabra.id).sort();
      expect(idsOf(first.body)).toEqual(idsOf(second.body));
    });
  });
});
