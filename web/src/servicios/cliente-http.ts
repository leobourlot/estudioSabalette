/**
 * Cliente HTTP de la API (plan 001, "Cliente HTTP"). Envía las cookies de sesión y, ante
 * un 401, renueva la sesión una sola vez y reintenta (RF-15, RF-17). No importa React.
 */

export const NETWORK_ERROR_MESSAGE =
  'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.';

/** Rutas cuyo 401 no significa "sesión vencida": no se renueva ni se avisa. */
const PATHS_WITHOUT_REFRESH = ['/sesion/ingresar', '/sesion/renovar'];

/**
 * Error de la API con su código y los mensajes en español que devolvió. `details` tiene los
 * demás campos del cuerpo, como el `codigo` de las preguntas de la spec 002 y los datos que
 * necesitan para responderse (clienteId, clientes, indiceParte…).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];
  readonly details: Record<string, unknown>;

  constructor(status: number, messages: string[], details: Record<string, unknown> = {}) {
    super(messages[0] ?? 'Ocurrió un error inesperado');
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
    this.details = details;
  }
}

type RefreshResult = 'renewed' | 'rejected' | 'network-error';

export interface HttpClientOptions {
  /** URL de la API sin /api; vacía usa rutas relativas (proxy de Vite en desarrollo). */
  baseUrl: string;
  fetch?: typeof fetch;
}

export function createHttpClient({ baseUrl, fetch: fetchFn = fetch }: HttpClientOptions) {
  const sessionClosedListeners = new Set<() => void>();
  // Una sola renovación en curso, compartida por todas las peticiones de la pestaña: si
  // varias reciben 401 a la vez, ninguna presenta un token ya rotado (RF-15).
  let refreshInProgress: Promise<RefreshResult> | null = null;

  const notifySessionClosed = () => sessionClosedListeners.forEach((listener) => listener());

  function refreshOnce(): Promise<RefreshResult> {
    refreshInProgress ??= fetchFn(`${baseUrl}/api/sesion/renovar`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((response): RefreshResult => (response.ok ? 'renewed' : 'rejected'))
      .catch((): RefreshResult => 'network-error')
      .then((result) => {
        if (result === 'rejected') notifySessionClosed();
        return result;
      })
      .finally(() => {
        refreshInProgress = null;
      });
    return refreshInProgress;
  }

  async function send(method: string, path: string, body?: unknown): Promise<Response> {
    try {
      return await fetchFn(`${baseUrl}/api${path}`, {
        method,
        credentials: 'include',
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, [NETWORK_ERROR_MESSAGE]);
    }
  }

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response = await send(method, path, body);

    if (response.status === 401 && !PATHS_WITHOUT_REFRESH.includes(path)) {
      const refresh = await refreshOnce();
      if (refresh === 'network-error') throw new ApiError(0, [NETWORK_ERROR_MESSAGE]);
      if (refresh === 'renewed') {
        response = await send(method, path, body);
        // Un 401 incluso con la sesión recién renovada: la sesión ya no sirve.
        if (response.status === 401) notifySessionClosed();
      }
    }

    if (!response.ok) throw await toApiError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
    put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
    /** Avisa cuando la sesión venció o se cerró y no se pudo renovar. Devuelve cómo dejar de escuchar. */
    onSessionClosed(listener: () => void): () => void {
      sessionClosedListeners.add(listener);
      return () => sessionClosedListeners.delete(listener);
    },
  };
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as Record<string, unknown> & {
      message?: string | string[];
    };
    const { message } = body;
    const messages = Array.isArray(message) ? message : message ? [message] : [];
    // statusCode y error son del formato por defecto de NestJS y no aportan datos.
    const details = Object.fromEntries(
      Object.entries(body).filter(([key]) => !['message', 'statusCode', 'error'].includes(key)),
    );
    return new ApiError(response.status, messages, details);
  } catch {
    return new ApiError(response.status, []);
  }
}

export const UNEXPECTED_ERROR_MESSAGE = 'Ocurrió un error inesperado. Intentá de nuevo.';

/** Mensaje para mostrar al usuario: el de la API si lo hay, o uno genérico. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError && error.messages.length > 0
    ? error.message
    : UNEXPECTED_ERROR_MESSAGE;
}

export type HttpClient = ReturnType<typeof createHttpClient>;

/** Cliente de la aplicación: VITE_API_URL vacía en desarrollo, la URL de la API en producción. */
export const httpClient = createHttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? '' });
