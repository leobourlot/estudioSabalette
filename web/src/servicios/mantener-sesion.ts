/**
 * Sesión mientras se escribe (spec 005, RF-20; plan 005, "Sesión mientras se escribe"). La
 * sesión de un integrante vence tras 1 hora sin consultas al servidor (spec 001, RF-12), y
 * escribir en un formulario no consulta al servidor. Por eso, mientras el integrante escribe,
 * se hace una consulta liviana cada tanto, que el servidor cuenta como uso. Si deja de
 * escribir, no hay más consultas y la sesión vence como siempre. No importa React.
 */

/** Cada cuánto, como mucho, la escritura consulta al servidor. */
export const KEEP_ALIVE_INTERVAL_MS = 5 * 60_000;

export interface SessionKeepAlive {
  /** Se llama en cada cambio de un campo del formulario. */
  notifyTyping(): void;
}

/**
 * `ping` es la consulta liviana (el usuario de la sesión). Se compara con la hora y no se usa
 * un temporizador, como en inactividad.ts: los temporizadores se frenan con la computadora
 * suspendida, y un temporizador mantendría viva una pestaña abandonada.
 */
export function createSessionKeepAlive(
  ping: () => unknown,
  now: () => number = Date.now,
): SessionKeepAlive {
  let lastPing = now();
  return {
    notifyTyping() {
      const current = now();
      if (current - lastPing < KEEP_ALIVE_INTERVAL_MS) return;
      lastPing = current;
      // Si la consulta falla, no hay nada que hacer acá: una sesión vencida la avisa el
      // cliente HTTP, y un error de red se verá al guardar.
      void Promise.resolve()
        .then(ping)
        .catch(() => undefined);
    },
  };
}
