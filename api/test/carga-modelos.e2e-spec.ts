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

const MINIMAL = {
  titulo: 'Oficio al Registro de la Propiedad',
  tipo: 'oficio',
  texto: 'Señor Director:\n\nEn los autos "#CARATULA#".',
};

// Marca para verificar que ninguna respuesta repite lo recibido (RNF de registros).
const MARK = 'MARCASECRETA';

/** RF-1 a RF-13: carga de modelos de escritos. */
describe('carga de modelos de escritos', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;
  // Cada modelo de este archivo lleva otro título, para que no coincida con uno anterior.
  let counter = 0;

  const post = (body: object) =>
    request(app.getHttpServer())
      .post(MODELS)
      .set('Cookie', `access_token=${session.accessToken}`)
      .send(body);

  const get = (id: number) =>
    request(app.getHttpServer())
      .get(`${MODELS}/${id}`)
      .set('Cookie', `access_token=${session.accessToken}`);

  const unique = (changes: object = {}) => ({
    ...MINIMAL,
    titulo: `Modelo de prueba ${++counter}`,
    ...changes,
  });

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

  it('carga un modelo completo, activo y con su autor (RF-1, RF-2, RF-13)', async () => {
    const before = Date.now();
    const response = await post({
      titulo: 'Demanda de daños y perjuicios',
      tipo: 'demanda',
      fuero: 'civil',
      descripcion: 'Para accidentes de tránsito',
      texto: 'Señor Juez:\n\n#ACTORES#, en los autos "#CARATULA#", digo:',
    }).expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      titulo: 'Demanda de daños y perjuicios',
      tipo: 'demanda',
      fuero: 'civil',
      descripcion: 'Para accidentes de tránsito',
      texto: 'Señor Juez:\n\n#ACTORES#, en los autos "#CARATULA#", digo:',
      variables: ['ACTORES', 'CARATULA'],
      activo: true,
      creadoPor: { id: lawyer.id, nombre: 'Luis', apellido: 'Sosa', activo: true },
      modificadoPor: null,
      modificadoEn: null,
    });
    const creadoEn = new Date(response.body.creadoEn).getTime();
    expect(creadoEn).toBeGreaterThanOrEqual(before - 5_000);
    expect(creadoEn).toBeLessThanOrEqual(Date.now() + 5_000);

    // Lo que devuelve la carga es lo que quedó guardado.
    const saved = await get(response.body.id).expect(200);
    expect(saved.body).toEqual(response.body);
  });

  it('sin fuero ni descripción, queda con el fuero otro y sin descripción (RF-1)', async () => {
    const response = await post(unique()).expect(201);

    expect(response.body).toMatchObject({ fuero: 'otro', descripcion: null });
  });

  it('una descripción vacía se guarda como no informada (RF-3)', async () => {
    const response = await post(unique({ descripcion: '   ' })).expect(201);

    expect(response.body.descripcion).toBeNull();
  });

  it('guarda convertido un texto pegado con caracteres tipográficos y sangría (RF-3, RF-5)', async () => {
    const number = ++counter;
    const response = await post(
      unique({
        titulo: `  Oficio   “pegado”  ${number} `,
        descripcion: ' Para pedir\ninformes… ',
        texto:
          '\tSeñor Director:\r\n\r\n    En los autos “#CARATULA#”… [sic]\r\n\t• Segundo  párrafo.  \r\n\r\n',
      }),
    ).expect(201);

    expect(response.body.titulo).toBe(`Oficio "pegado" ${number}`);
    expect(response.body.descripcion).toBe('Para pedir informes...');
    expect(response.body.texto).toBe(
      'Señor Director:\n\nEn los autos "#CARATULA#"... (sic)\n- Segundo párrafo.',
    );
  });

  it('guarda las marcas en la forma del catálogo (RF-8)', async () => {
    const response = await post(
      unique({ texto: 'Autos #carátula#, Expte. #Numero_Expediente#, del #fecha#. Local # 3.' }),
    ).expect(201);

    expect(response.body.texto).toBe(
      'Autos #CARATULA#, Expte. #NUMERO_EXPEDIENTE#, del #FECHA#. Local # 3.',
    );
    expect(response.body.variables).toEqual(['CARATULA', 'NUMERO_EXPEDIENTE', 'FECHA']);
  });

  it('acepta un modelo sin ninguna variable (RF-12)', async () => {
    const response = await post(unique({ texto: 'Texto fijo, sin variables.' })).expect(201);

    expect(response.body.variables).toEqual([]);
  });

  it('acepta un email como texto fijo del modelo (RF-4)', async () => {
    const response = await post(
      unique({ texto: 'Constituyo domicilio electrónico en estudio@ejemplo.com.' }),
    ).expect(201);

    expect(response.body.texto).toBe('Constituyo domicilio electrónico en estudio@ejemplo.com.');
  });

  it('acepta la misma variable varias veces (RF-12)', async () => {
    const response = await post(unique({ texto: '#JUZGADO# y otra vez #JUZGADO#.' })).expect(201);

    expect(response.body.variables).toEqual(['JUZGADO']);
  });

  describe('rechazos de validación (RF-6, RF-7, RF-10)', () => {
    it('exige el título, el tipo y el texto', async () => {
      const response = await post({}).expect(400);

      expect(response.body.message).toEqual([
        'Indicá el título del modelo',
        'Indicá el tipo de escrito',
        'Indicá el texto del modelo',
      ]);
    });

    it.each([
      ['el título con @', { titulo: 'Oficio a estudio@ejemplo.com' }],
      ['la descripción con @', { descripcion: 'Para estudio@ejemplo.com' }],
      ['el texto con <', { texto: 'Señor <b>Juez</b>' }],
      ['el texto con llaves', { texto: 'Autos {{caratula}}' }],
      ['el texto con un emoji', { texto: 'Señor Juez 😀' }],
      ['las variables pegadas', { texto: 'Entre #ACTORES##DEMANDADOS#.' }],
      ['las variables que comparten un numeral', { texto: 'Entre #ACTORES#DEMANDADOS#.' }],
      ['una variable que no existe', { texto: 'Autos #CARATUAL#.' }],
      ['un tipo fuera de la lista', { tipo: 'carta' }],
      ['un fuero fuera de la lista', { fuero: 'marítimo' }],
      ['el campo activo', { activo: false }],
    ])('rechaza %s y no guarda nada', async (_case, changes) => {
      const before = await countModels();

      await post(unique(changes)).expect(400);

      expect(await countModels()).toBe(before);
    });

    it('los mensajes de las variables no las nombran', async () => {
      const joined = await post(unique({ texto: 'Entre #ACTORES##DEMANDADOS#.' })).expect(400);
      expect(joined.body.message).toEqual(['Las variables tienen que estar separadas']);

      const unknown = await post(unique({ texto: `Autos #CARATUAL# y #${MARK}#.` })).expect(400);
      expect(unknown.body.message).toEqual(['El texto tiene variables que no existen']);
      expect(JSON.stringify(unknown.body)).not.toContain(MARK);
      expect(JSON.stringify(unknown.body)).not.toContain('CARATUAL');
    });

    it('ninguna respuesta repite el texto recibido', async () => {
      const response = await post({
        titulo: `${MARK} <`,
        tipo: MARK,
        fuero: MARK,
        descripcion: `${MARK} {`,
        texto: `${MARK} = ${MARK}`,
        confirmarRepetido: MARK,
      }).expect(400);

      expect(response.body.message).toHaveLength(6);
      expect(JSON.stringify(response.body)).not.toContain(MARK);
    });

    it('rechaza un texto de más de 50.000 caracteres', async () => {
      const response = await post(unique({ texto: 'a'.repeat(50_001) })).expect(400);

      expect(response.body.message).toEqual(['El texto no puede tener más de 50.000 caracteres']);
    });
  });

  it('acepta un texto de exactamente 50.000 caracteres', async () => {
    const texto = `${'a'.repeat(49_990)}\n#FECHA#\n.`;
    expect(texto).toHaveLength(50_000);

    const response = await post(unique({ texto })).expect(201);

    expect(response.body.texto).toHaveLength(50_000);
  });
});
