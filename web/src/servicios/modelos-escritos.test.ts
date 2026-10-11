import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createHttpClient } from './cliente-http';
import { createModelosService } from './modelos-escritos';

const BASE_URL = 'https://api.estudio.com';
const MODELS = `${BASE_URL}/api/panel/modelos-escritos`;

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
  });
}

describe('servicio de modelos de escritos (spec 006)', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let modelos: ReturnType<typeof createModelosService>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    modelos = createModelosService(createHttpClient({ baseUrl: BASE_URL, fetch: fetchMock }));
  });

  /** URL, método y cuerpo (ya parseado) de la última llamada. */
  function lastCall() {
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    return {
      url,
      method: init?.method,
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    };
  }

  describe('listado (RF-18 a RF-24)', () => {
    const page = { items: [], pagina: 1, haySiguiente: false, hayModelos: true };

    it('envía la página, la búsqueda y todos los filtros', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page));

      const result = await modelos.listModels({
        pagina: 2,
        buscar: ' cédula ',
        tipo: 'cedula',
        fuero: 'laboral',
        incluirDesactivados: true,
      });

      expect(result).toEqual(page);
      expect(lastCall()).toEqual({
        url: `${MODELS}?pagina=2&buscar=c%C3%A9dula&tipo=cedula&fuero=laboral&incluirDesactivados=true`,
        method: 'GET',
        body: undefined,
      });
    });

    it('no envía la búsqueda vacía ni la casilla desmarcada', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page));

      await modelos.listModels({ buscar: '   ', incluirDesactivados: false });

      expect(lastCall().url).toBe(MODELS);
    });

    it('sin parámetros pide el listado sin query string', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page));

      await modelos.listModels();

      expect(lastCall()).toEqual({ url: MODELS, method: 'GET', body: undefined });
    });

    it('envía la búsqueda de una variable y de un email con sus signos codificados', async () => {
      // Una respuesta nueva por llamada: el cuerpo de una respuesta se lee una sola vez.
      fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, page)));

      await modelos.listModels({ buscar: '#JUZGADO#' });
      expect(lastCall().url).toBe(`${MODELS}?buscar=%23JUZGADO%23`);

      await modelos.listModels({ buscar: '@ejemplo.com' });
      expect(lastCall().url).toBe(`${MODELS}?buscar=%40ejemplo.com`);
    });
  });

  it('consulta un modelo', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 7 }));

    expect(await modelos.getModel(7)).toEqual({ id: 7 });
    expect(lastCall()).toEqual({ url: `${MODELS}/7`, method: 'GET', body: undefined });
  });

  it('carga un modelo con sus datos y la confirmación de título repetido', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 8 }));
    const data = {
      titulo: 'Oficio al Registro',
      tipo: 'oficio' as const,
      fuero: 'civil' as const,
      descripcion: 'Para pedir informes',
      texto: 'Señor Director:\n\n#CARATULA#',
      confirmarRepetido: true,
    };

    expect(await modelos.createModel(data)).toEqual({ id: 8 });
    expect(lastCall()).toEqual({ url: MODELS, method: 'POST', body: data });
  });

  it('modifica un modelo solo con los datos que cambian', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 8 }));

    await modelos.updateModel(8, { descripcion: null, fuero: 'otro' });

    expect(lastCall()).toEqual({
      url: `${MODELS}/8`,
      method: 'PATCH',
      body: { descripcion: null, fuero: 'otro' },
    });
  });

  it('desactiva un modelo', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 8, activo: false }));

    expect(await modelos.deactivateModel(8)).toEqual({ id: 8, activo: false });
    expect(lastCall()).toEqual({
      url: `${MODELS}/8/desactivar`,
      method: 'POST',
      body: undefined,
    });
  });

  it('reactiva un modelo sin cuerpo, y con la confirmación si se respondió la pregunta', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, { id: 8, activo: true })));

    await modelos.reactivateModel(8);
    expect(lastCall()).toEqual({ url: `${MODELS}/8/reactivar`, method: 'POST', body: undefined });

    await modelos.reactivateModel(8, true);
    expect(lastCall()).toEqual({
      url: `${MODELS}/8/reactivar`,
      method: 'POST',
      body: { confirmarRepetido: true },
    });
  });

  it('pide el escrito completado de un modelo dentro de una causa (RF-30)', async () => {
    const escrito = {
      causa: { id: 5, caratula: 'Gómez c/ Acme S.A.' },
      modelo: { id: 8, titulo: 'Oficio al Registro' },
      texto: 'Señor Director:\n\nGómez c/ Acme S.A.',
      faltantes: ['juzgado'],
      clientesDesactivados: [],
      responsableDesactivado: false,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, escrito));

    expect(await modelos.completeModel(5, 8)).toEqual(escrito);
    expect(lastCall()).toEqual({
      url: `${BASE_URL}/api/panel/causas/5/escritos/8`,
      method: 'GET',
      body: undefined,
    });
  });

  it('keepSessionAlive pide el usuario de la sesión, que el servidor cuenta como uso (RF-17, RF-48)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1 }));

    await modelos.keepSessionAlive();

    expect(lastCall()).toEqual({
      url: `${BASE_URL}/api/sesion/usuario`,
      method: 'GET',
      body: undefined,
    });
  });

  it('la pregunta de título repetido llega como ApiError con el código y los modelos (RF-15)', async () => {
    const coincidencias = [
      { id: 3, titulo: 'Oficio al Registro', tipo: 'oficio', fuero: 'civil' },
      { id: 4, titulo: 'OFICIO AL REGISTRO', tipo: 'oficio', fuero: 'otro' },
    ];
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, {
        statusCode: 409,
        message: 'Ya existe un modelo con ese título',
        codigo: 'MODELO_REPETIDO',
        modelos: coincidencias,
      }),
    );

    const error = await modelos
      .createModel({ titulo: 'Oficio al registro', tipo: 'oficio', texto: 'Texto' })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).message).toBe('Ya existe un modelo con ese título');
    expect((error as ApiError).details).toEqual({
      codigo: 'MODELO_REPETIDO',
      modelos: coincidencias,
    });
  });

  it('un rechazo al completar llega como ApiError con el mensaje de la API (RF-41)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, { statusCode: 409, message: 'La causa está desactivada' }),
    );

    const error = await modelos.completeModel(5, 8).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe('La causa está desactivada');
  });
});
