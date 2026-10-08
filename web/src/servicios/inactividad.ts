/**
 * Inactividad del cliente en la pantalla (plan 004, "Inactividad en la pantalla"). El servidor
 * cierra la sesión de un cliente tras 20 minutos sin consultas, pero no puede avisarle a una
 * pantalla que no hace pedidos: con esta regla, la pantalla se vacía sola (RF-4, RF-5). Solo
 * compara horas: los temporizadores viven en ProveedorSesion. No importa React.
 */

/** El mismo límite que la sesión de un cliente en el servidor (spec 001, RF-12). */
export const CLIENT_IDLE_LIMIT_MS = 20 * 60_000;

/** Si pasó el límite desde la última actividad, ambas en milisegundos. */
export function isIdleExpired(
  lastActivity: number,
  now: number,
  limit: number = CLIENT_IDLE_LIMIT_MS,
): boolean {
  return now - lastActivity >= limit;
}
