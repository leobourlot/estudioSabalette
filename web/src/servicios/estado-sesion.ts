import { TEXTOS } from './contenido-sitio';

/**
 * Estado de la sesión en el sitio público (spec 007, RF-29 a RF-31; plan 007, "Estado de la
 * sesión en el sitio público"). Solo pregunta a qué sección lleva la sesión, sin el cliente HTTP
 * de la aplicación: así no se renueva la sesión ante un 401, no se avisa "sesión cerrada" y no
 * cuenta como actividad. Ante cualquier problema, se toma como que no hay sesión. No importa
 * React (principio 3).
 */

export type SeccionSesion = 'portal' | 'panel';

/** Cuánto se espera la respuesta antes de tomar como que no hay sesión (RF-29). */
export const SESSION_STATUS_TIMEOUT_MS = 5000;

export interface SessionStatusOptions {
  /** URL de la API sin /api; vacía usa rutas relativas (proxy de Vite en desarrollo). */
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

const isSection = (value: unknown): value is SeccionSesion =>
  value === 'portal' || value === 'panel';

/** La sección a la que lleva la sesión abierta, o null si no hay o no se puede saber. */
export async function fetchSessionSection({
  baseUrl = import.meta.env.VITE_API_URL ?? '',
  fetch: fetchFn = (...args) => globalThis.fetch(...args),
  timeoutMs = SESSION_STATUS_TIMEOUT_MS,
}: SessionStatusOptions = {}): Promise<SeccionSesion | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const request = async (): Promise<SeccionSesion | null> => {
    try {
      const response = await fetchFn(`${baseUrl}/api/sesion/estado`, {
        credentials: 'include',
        signal: controller.signal,
      });
      if (response.status !== 200) return null;
      const body = (await response.json()) as { seccion?: unknown } | null;
      return isSection(body?.seccion) ? body.seccion : null;
    } catch {
      return null;
    }
  };

  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });

  try {
    return await Promise.race([request(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export interface SessionAccessLink {
  href: string;
  label: string;
}

/** El acceso del encabezado según la sesión (RF-29, RF-30). */
export function sessionAccessLink(seccion: SeccionSesion | null): SessionAccessLink {
  if (seccion === 'portal') return { href: '/portal', label: TEXTOS.menu.irAlPortal };
  if (seccion === 'panel') return { href: '/panel', label: TEXTOS.menu.irAlPanel };
  return { href: '/ingresar', label: TEXTOS.menu.ingresar };
}
