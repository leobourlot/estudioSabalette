import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { clearModelTables } from './utilidades/modelos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const MODELS = '/api/panel/modelos-escritos';

// Marca para verificar que la respuesta no repite lo recibido (RNF de registros).
const MARK = 'MARCASECRETA';

/**
 * Plan 006, "Tamaño del cuerpo": el texto de un modelo tiene hasta 50.000 caracteres, que con
 * letras de varios bytes superan los 100 KB que Express acepta por defecto.
 */
describe('tamaño del cuerpo de los pedidos', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;

  const post = (body: object) =>
    request(app.getHttpServer())
      .post(MODELS)
      .set('Cookie', `access_token=${session.accessToken}`)
      .send(body);

  const countModels = async (): Promise<number> => {
    const [row]: { total: string }[] = await app
      .get(DataSource)
      .query('SELECT COUNT(*) AS total FROM modelos_escritos');
    return Number(row.total);
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearModelTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    session = await loginAs(app, lawyer.email!);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('acepta un modelo con un texto de 50.000 letras con tilde (unos 100 KB)', async () => {
    const texto = 'ñ'.repeat(50_000);

    const response = await post({ titulo: 'Texto con eñes', tipo: 'otro', texto }).expect(201);

    expect(response.body.texto).toBe(texto);
  });

  it('acepta un modelo con un texto de 50.000 letras de tres bytes (unos 150 KB)', async () => {
    // Las letras de cualquier alfabeto están permitidas (RF-4); estas ocupan tres bytes.
    const texto = '文'.repeat(50_000);
    expect(Buffer.byteLength(texto)).toBe(150_000);

    const response = await post({ titulo: 'Texto de tres bytes', tipo: 'otro', texto }).expect(201);

    expect(response.body.texto).toBe(texto);
  });

  it('un texto pegado más largo que el límite, pero dentro del cuerpo permitido, responde 400', async () => {
    const response = await post({
      titulo: 'Texto demasiado largo',
      tipo: 'otro',
      texto: 'a'.repeat(200_000),
    }).expect(400);

    expect(response.body.message).toEqual(['El texto no puede tener más de 50.000 caracteres']);
  });

  it('un cuerpo de más de 512 KB responde 413, sin repetir lo recibido ni guardar nada', async () => {
    const before = await countModels();

    const response = await post({
      titulo: 'Cuerpo enorme',
      tipo: 'otro',
      texto: `${MARK} ${'a'.repeat(600_000)}`,
    }).expect(413);

    // La respuesta la arma el filtro global con el mensaje fijo del analizador del cuerpo.
    expect(Object.keys(response.body).sort()).toEqual(['message', 'statusCode']);
    expect(response.body.statusCode).toBe(413);
    expect(response.text).not.toContain(MARK);
    expect(response.text.length).toBeLessThan(2_000);
    expect(await countModels()).toBe(before);
  });

  it('un cuerpo grande en otro endpoint sigue validándose con sus propias reglas', async () => {
    // El límite del cuerpo es de toda la API; cada DTO sigue limitando sus campos.
    const response = await request(app.getHttpServer())
      .post('/api/panel/jurisprudencia')
      .set('Cookie', `access_token=${session.accessToken}`)
      .send({
        caratula: 'Pérez c/ López',
        tribunal: 'CNCiv., Sala A',
        fuero: 'civil',
        fecha: '2019-05-03',
        sumario: 'a'.repeat(200_000),
        palabrasClave: ['daño moral'],
      })
      .expect(400);

    expect(response.body.message).toEqual(['El sumario no puede tener más de 5000 caracteres']);
  });
});
