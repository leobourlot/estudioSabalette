import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHttpClient } from './cliente-http';
import { createPortalService } from './portal';

const BASE_URL = 'https://api.estudio.com';
const PORTAL = `${BASE_URL}/api/portal/causas`;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('servicio del portal (spec 004)', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let portal: ReturnType<typeof createPortalService>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(200, {}));
    portal = createPortalService(createHttpClient({ baseUrl: BASE_URL, fetch: fetchMock }));
  });

  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    return { url, method: init?.method };
  };

  it('pide la lista de causas con su página (RF-7, RF-24)', async () => {
    await portal.listCausas(3);

    expect(lastCall()).toEqual({ url: `${PORTAL}?pagina=3`, method: 'GET' });
  });

  it('pide el detalle de una causa (RF-13)', async () => {
    await portal.getCausa('12');

    expect(lastCall()).toEqual({ url: `${PORTAL}/12`, method: 'GET' });
  });

  it('pide los movimientos de una causa con su página (RF-20)', async () => {
    await portal.listMovimientos('12', 2);

    expect(lastCall()).toEqual({ url: `${PORTAL}/12/movimientos?pagina=2`, method: 'GET' });
  });

  it('pide un movimiento dentro de su causa (RF-22, RF-27)', async () => {
    await portal.getMovimiento('12', '70');

    expect(lastCall()).toEqual({ url: `${PORTAL}/12/movimientos/70`, method: 'GET' });
  });

  it('envía los ids tal como vienen, codificados, para que la API responda el mismo 404 (RF-28)', async () => {
    await portal.getMovimiento('a/b', '7?x');

    expect(lastCall().url).toBe(`${PORTAL}/a%2Fb/movimientos/7%3Fx`);
  });
});
