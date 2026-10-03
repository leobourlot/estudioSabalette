import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createHttpClient, NETWORK_ERROR_MESSAGE } from './cliente-http';

const BASE_URL = 'https://api.estudio.com';
const REFRESH_URL = `${BASE_URL}/api/sesion/renovar`;

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
  });
}

/** Promesa que el test resuelve cuando quiere, para simular respuestas que tardan. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

describe('cliente HTTP', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let client: ReturnType<typeof createHttpClient>;
  let sessionClosed: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    client = createHttpClient({ baseUrl: BASE_URL, fetch: fetchMock });
    sessionClosed = vi.fn<() => void>();
    client.onSessionClosed(sessionClosed);
  });

  const urls = () => fetchMock.mock.calls.map(([url]) => url);

  describe('peticiones', () => {
    it('arma la URL con /api, envía las cookies y el cuerpo JSON, y devuelve la respuesta', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 7 }));

      const result = await client.post('/sesion/ingresar', { email: 'juan@estudio.com' });

      expect(result).toEqual({ id: 7 });
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/sesion/ingresar`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'juan@estudio.com' }),
      });
    });

    it('sin cuerpo no envía Content-Type', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, []));

      await client.get('/panel/usuarios?pagina=2');

      expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/panel/usuarios?pagina=2`, {
        method: 'GET',
        credentials: 'include',
        headers: undefined,
        body: undefined,
      });
    });

    it('con URL base vacía usa rutas relativas (proxy de Vite en desarrollo)', async () => {
      const relative = createHttpClient({ baseUrl: '', fetch: fetchMock });
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

      await relative.get('/sesion/usuario');

      expect(urls()).toEqual(['/api/sesion/usuario']);
    });

    it('una respuesta 204 devuelve undefined', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(204));

      await expect(client.put('/sesion/contrasena', {})).resolves.toBeUndefined();
    });

    it.each([
      ['un mensaje', 'Ya existe una cuenta con ese email', ['Ya existe una cuenta con ese email']],
      [
        'varios mensajes',
        ['El email es obligatorio', 'El nombre es obligatorio'],
        ['El email es obligatorio', 'El nombre es obligatorio'],
      ],
    ])('convierte un error de la API con %s en ApiError', async (_case, message, messages) => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409, { statusCode: 409, message }));

      const error = await client.post('/panel/usuarios', {}).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 409, messages, message: messages[0] });
    });

    it('si no hay conexión, lanza ApiError con status 0 y un mensaje claro', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(client.get('/sesion/usuario')).rejects.toMatchObject({
        status: 0,
        message: NETWORK_ERROR_MESSAGE,
      });
    });
  });

  describe('renovación ante 401 (RF-15, RF-17)', () => {
    it('renueva la sesión y reintenta una vez', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(401, { message: 'Tu sesión no es válida o venció' }))
        .mockResolvedValueOnce(jsonResponse(204))
        .mockResolvedValueOnce(jsonResponse(200, { id: 7 }));

      await expect(client.get('/sesion/usuario')).resolves.toEqual({ id: 7 });

      expect(urls()).toEqual([
        `${BASE_URL}/api/sesion/usuario`,
        REFRESH_URL,
        `${BASE_URL}/api/sesion/usuario`,
      ]);
      expect(fetchMock.mock.calls[1][1]).toEqual({ method: 'POST', credentials: 'include' });
      expect(sessionClosed).not.toHaveBeenCalled();
    });

    it('tres 401 simultáneos disparan una sola renovación', async () => {
      const refresh = deferred<Response>();
      fetchMock.mockImplementation(async (url) => {
        if (url === REFRESH_URL) return refresh.promise;
        // Antes de renovar, todo responde 401; después, 200.
        return refreshed ? jsonResponse(200, { url }) : jsonResponse(401, {});
      });
      let refreshed = false;

      const requests = Promise.all([
        client.get('/panel/usuarios'),
        client.get('/sesion/usuario'),
        client.get('/panel/usuarios/7'),
      ]);
      await vi.waitFor(() => expect(urls().filter((url) => url === REFRESH_URL)).toHaveLength(1));
      refreshed = true;
      refresh.resolve(jsonResponse(204));

      await expect(requests).resolves.toHaveLength(3);
      expect(urls().filter((url) => url === REFRESH_URL)).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(7);
    });

    it('si la renovación falla, avisa una sola vez que la sesión se cerró', async () => {
      fetchMock.mockImplementation(async (url) =>
        url === REFRESH_URL ? jsonResponse(401, {}) : jsonResponse(401, {}),
      );

      const results = await Promise.allSettled([
        client.get('/panel/usuarios'),
        client.get('/sesion/usuario'),
      ]);

      expect(results.every((result) => result.status === 'rejected')).toBe(true);
      expect(urls().filter((url) => url === REFRESH_URL)).toHaveLength(1);
      expect(sessionClosed).toHaveBeenCalledTimes(1);
    });

    it('reintenta una sola vez: si el reintento vuelve a dar 401, avisa y no renueva de nuevo', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(401, {}))
        .mockResolvedValueOnce(jsonResponse(204))
        .mockResolvedValueOnce(jsonResponse(401, { message: 'Tu sesión no es válida o venció' }));

      await expect(client.get('/sesion/usuario')).rejects.toMatchObject({ status: 401 });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(sessionClosed).toHaveBeenCalledTimes(1);
    });

    it.each(['/sesion/ingresar', '/sesion/renovar'])(
      'un 401 de %s no intenta renovar ni avisa',
      async (path) => {
        fetchMock.mockResolvedValueOnce(
          jsonResponse(401, { message: 'Email o contraseña incorrectos' }),
        );

        await expect(client.post(path, {})).rejects.toMatchObject({
          status: 401,
          message: 'Email o contraseña incorrectos',
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(sessionClosed).not.toHaveBeenCalled();
      },
    );

    it('se puede dejar de escuchar el aviso de sesión cerrada', async () => {
      const other = vi.fn<() => void>();
      const unsubscribe = client.onSessionClosed(other);
      unsubscribe();
      fetchMock.mockResolvedValue(jsonResponse(401, {}));

      await client.get('/sesion/usuario').catch(() => undefined);

      expect(other).not.toHaveBeenCalled();
      expect(sessionClosed).toHaveBeenCalledTimes(1);
    });
  });
});
