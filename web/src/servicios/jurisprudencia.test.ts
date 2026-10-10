import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createHttpClient } from './cliente-http';
import { createJurisprudenciaService } from './jurisprudencia';

const BASE_URL = 'https://api.estudio.com';
const RULINGS = `${BASE_URL}/api/panel/jurisprudencia`;

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
  });
}

describe('servicio de jurisprudencia (spec 005)', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let jurisprudencia: ReturnType<typeof createJurisprudenciaService>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    jurisprudencia = createJurisprudenciaService(
      createHttpClient({ baseUrl: BASE_URL, fetch: fetchMock }),
    );
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

  describe('listado (RF-21 a RF-28)', () => {
    const page = { items: [], pagina: 1, haySiguiente: false, hayFallos: true };

    it('envía todos los filtros, con las palabras clave como ids separados por coma', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page));

      const result = await jurisprudencia.listRulings({
        pagina: 2,
        buscar: ' daño moral ',
        palabrasClave: [3, 7, 12],
        fuero: 'civil',
        desde: '2015-01-01',
        hasta: '2024-12-31',
        incluirDesactivados: true,
      });

      expect(result).toEqual(page);
      expect(lastCall()).toEqual({
        url: `${RULINGS}?pagina=2&buscar=da%C3%B1o+moral&palabrasClave=3%2C7%2C12&fuero=civil&desde=2015-01-01&hasta=2024-12-31&incluirDesactivados=true`,
        method: 'GET',
        body: undefined,
      });
    });

    it('no envía los filtros vacíos, la lista vacía ni la casilla desmarcada', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page));

      await jurisprudencia.listRulings({
        buscar: '   ',
        palabrasClave: [],
        desde: '',
        hasta: '',
        incluirDesactivados: false,
      });

      expect(lastCall().url).toBe(RULINGS);
    });

    it('sin parámetros pide el listado sin query string', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page));

      await jurisprudencia.listRulings();

      expect(lastCall()).toEqual({ url: RULINGS, method: 'GET', body: undefined });
    });
  });

  describe('sugerencias de palabras clave (RF-13, RF-25)', () => {
    const suggestions = [{ id: 1, texto: 'daño moral', cantidad: 12 }];

    it('para la carga envía solo lo escrito', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, suggestions));

      const result = await jurisprudencia.suggestKeywords('daño');

      expect(result).toEqual(suggestions);
      expect(lastCall()).toEqual({
        url: `${RULINGS}/palabras-clave?buscar=da%C3%B1o`,
        method: 'GET',
        body: undefined,
      });
    });

    it('para el filtro agrega el destino', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, suggestions));

      await jurisprudencia.suggestKeywords('daño moral', 'filtro');

      expect(lastCall().url).toBe(`${RULINGS}/palabras-clave?buscar=da%C3%B1o+moral&para=filtro`);
    });
  });

  it('consulta un fallo', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 5 }));

    expect(await jurisprudencia.getRuling(5)).toEqual({ id: 5 });
    expect(lastCall()).toEqual({ url: `${RULINGS}/5`, method: 'GET', body: undefined });
  });

  it('carga un fallo con sus datos y la confirmación de repetido', async () => {
    const data = {
      caratula: 'Pérez c/ López',
      tribunal: 'CNCiv., Sala A',
      fuero: 'civil' as const,
      fecha: '2019-05-03',
      numero: null,
      sumario: 'Sumario.',
      palabrasClave: ['daño moral'],
      enlace: 'https://www.csjn.gov.ar/fallo',
      confirmarRepetido: true,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 9 }));

    expect(await jurisprudencia.createRuling(data)).toEqual({ id: 9 });
    expect(lastCall()).toEqual({ url: RULINGS, method: 'POST', body: data });
  });

  it('modifica un fallo solo con los datos que cambian', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 5 }));

    await jurisprudencia.updateRuling(5, { numero: null, palabrasClave: ['despido'] });

    expect(lastCall()).toEqual({
      url: `${RULINGS}/5`,
      method: 'PATCH',
      body: { numero: null, palabrasClave: ['despido'] },
    });
  });

  it('desactiva un fallo', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 5, activo: false }));

    await jurisprudencia.deactivateRuling(5);

    expect(lastCall()).toEqual({
      url: `${RULINGS}/5/desactivar`,
      method: 'POST',
      body: undefined,
    });
  });

  it('reactiva un fallo sin cuerpo, y con la confirmación si se respondió la pregunta', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 5, activo: true }));
    await jurisprudencia.reactivateRuling(5);
    expect(lastCall()).toEqual({
      url: `${RULINGS}/5/reactivar`,
      method: 'POST',
      body: undefined,
    });

    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 5, activo: true }));
    await jurisprudencia.reactivateRuling(5, true);
    expect(lastCall().body).toEqual({ confirmarRepetido: true });
  });

  it('keepSessionAlive pide el usuario de la sesión, que el servidor cuenta como uso (RF-20)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1 }));

    await jurisprudencia.keepSessionAlive();

    expect(lastCall()).toEqual({
      url: `${BASE_URL}/api/sesion/usuario`,
      method: 'GET',
      body: undefined,
    });
  });

  it('la pregunta de repetido llega como ApiError con el código y el fallo (RF-18)', async () => {
    const fallo = {
      id: 3,
      caratula: 'Muñoz c/ Clínica',
      tribunal: 'Cámara Civil',
      fecha: '2020-08-14',
      numero: '5678/2019',
    };
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, {
        statusCode: 409,
        message: 'Ya existe un fallo con ese número en ese tribunal',
        codigo: 'FALLO_REPETIDO',
        fallo,
      }),
    );

    const error = await jurisprudencia.reactivateRuling(5).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      messages: ['Ya existe un fallo con ese número en ese tribunal'],
      details: { codigo: 'FALLO_REPETIDO', fallo },
    });
  });
});
