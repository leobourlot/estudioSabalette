import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from './cliente-http';
import { fetchSessionSection, sessionAccessLink } from './estado-sesion';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchSessionSection (spec 007, RF-29 a RF-31)', () => {
  it.each(['portal', 'panel'] as const)(
    'devuelve %s cuando la API lo responde',
    async (seccion) => {
      const fetch = vi.fn().mockResolvedValue(json({ seccion }));

      await expect(fetchSessionSection({ baseUrl: 'https://api.test', fetch })).resolves.toBe(
        seccion,
      );
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test/api/sesion/estado',
        expect.objectContaining({ credentials: 'include' }),
      );
    },
  );

  it('devuelve null cuando no hay sesión', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ seccion: null }));

    await expect(fetchSessionSection({ fetch })).resolves.toBeNull();
  });

  it.each([
    ['un código distinto de 200', () => json({ seccion: 'portal' }, 500)],
    ['una sección desconocida', () => json({ seccion: 'otra' })],
    ['un cuerpo sin la sección', () => json({ usuario: 1 })],
    ['un cuerpo que no es JSON', () => new Response('<html>', { status: 200 })],
  ])('devuelve null ante %s', async (_caso, response) => {
    const fetch = vi.fn().mockResolvedValue(response());

    await expect(fetchSessionSection({ fetch })).resolves.toBeNull();
  });

  it('devuelve null ante un error de red', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchSessionSection({ fetch })).resolves.toBeNull();
  });

  it('devuelve null si la respuesta tarda más que el límite, y corta el pedido', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const fetch = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    });

    const result = fetchSessionSection({ fetch, timeoutMs: 5000 });
    await vi.advanceTimersByTimeAsync(5000);

    await expect(result).resolves.toBeNull();
    expect(signal?.aborted).toBe(true);
  });

  it('no usa el cliente HTTP: no renueva, no avisa sesión cerrada ni cuenta actividad', async () => {
    const closed = vi.fn();
    const activity = vi.fn();
    const stopClosed = httpClient.onSessionClosed(closed);
    const stopActivity = httpClient.onActivity(activity);
    const fetch = vi.fn().mockResolvedValue(json({ message: 'No autorizado' }, 401));

    await expect(fetchSessionSection({ fetch })).resolves.toBeNull();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(closed).not.toHaveBeenCalled();
    expect(activity).not.toHaveBeenCalled();
    stopClosed();
    stopActivity();
  });
});

describe('sessionAccessLink (RF-29, RF-30)', () => {
  it('sin sesión lleva al ingreso', () => {
    expect(sessionAccessLink(null)).toEqual({ href: '/ingresar', label: 'Ingresar' });
  });

  it('con sesión de cliente lleva al portal', () => {
    expect(sessionAccessLink('portal')).toEqual({ href: '/portal', label: 'Ir a mi portal' });
  });

  it('con sesión de integrante lleva al panel', () => {
    expect(sessionAccessLink('panel')).toEqual({ href: '/panel', label: 'Ir al panel' });
  });
});
