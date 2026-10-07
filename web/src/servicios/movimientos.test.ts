import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createHttpClient } from './cliente-http';
import { createMovimientosService } from './movimientos';

const BASE_URL = 'https://api.estudio.com';
const MOVIMIENTOS = `${BASE_URL}/api/panel/causas/3/movimientos`;

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
  });
}

describe('servicio de movimientos (spec 003)', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let movimientos: ReturnType<typeof createMovimientosService>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    movimientos = createMovimientosService(
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

  describe('historial (RF-23 a RF-27)', () => {
    const page = { items: [], total: 0, pagina: 1, porPagina: 20 };

    it('envía todos los filtros indicados', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page));

      const result = await movimientos.listMovements(3, {
        pagina: 2,
        buscar: ' notificación ',
        tipo: 'audiencia',
        visibilidad: 'visibles',
        desde: '2024-01-01',
        hasta: '2024-12-31',
        ocultarAnulados: true,
      });

      expect(result).toEqual(page);
      expect(lastCall()).toEqual({
        url: `${MOVIMIENTOS}?pagina=2&buscar=notificaci%C3%B3n&tipo=audiencia&visibilidad=visibles&desde=2024-01-01&hasta=2024-12-31&ocultarAnulados=true`,
        method: 'GET',
        body: undefined,
      });
    });

    it('no envía los filtros vacíos, "todos" ni la casilla desmarcada', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page));

      await movimientos.listMovements(3, {
        buscar: '   ',
        visibilidad: 'todos',
        desde: '',
        hasta: '',
        ocultarAnulados: false,
      });

      expect(lastCall().url).toBe(MOVIMIENTOS);
    });
  });

  it('consulta un movimiento (RF-22)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 7 }));

    await movimientos.getMovement(3, 7);

    expect(lastCall()).toEqual({ url: `${MOVIMIENTOS}/7`, method: 'GET', body: undefined });
  });

  it('carga un movimiento (RF-8)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 7 }));
    const data = {
      fecha: '2024-03-01',
      tipo: 'providencia' as const,
      descripcion: 'Se fija audiencia.',
      textoCliente: null,
      visible: false,
    };

    await movimientos.createMovement(3, data);

    expect(lastCall()).toEqual({ url: MOVIMIENTOS, method: 'POST', body: data });
  });

  it('modifica solo los datos indicados (RF-11, RF-14)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 7 }));

    await movimientos.updateMovement(3, 7, { visible: true, textoCliente: null });

    expect(lastCall()).toEqual({
      url: `${MOVIMIENTOS}/7`,
      method: 'PATCH',
      body: { visible: true, textoCliente: null },
    });
  });

  it('anula y restaura (RF-16, RF-18)', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, { id: 7 }));

    await movimientos.annulMovement(3, 7);
    expect(lastCall()).toEqual({ url: `${MOVIMIENTOS}/7/anular`, method: 'POST', body: undefined });

    await movimientos.restoreMovement(3, 7);
    expect(lastCall()).toEqual({
      url: `${MOVIMIENTOS}/7/restaurar`,
      method: 'POST',
      body: undefined,
    });
  });

  it('propaga los mensajes de error de la API', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, { statusCode: 409, message: 'El movimiento ya está anulado' }),
    );

    const error = await movimientos.annulMovement(3, 7).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).messages).toEqual(['El movimiento ya está anulado']);
  });
});
