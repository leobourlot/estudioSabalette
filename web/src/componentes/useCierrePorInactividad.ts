import { useEffect } from 'react';
import { httpClient } from '../servicios/cliente-http';
import { IDLE_CHECK_INTERVAL_MS, IDLE_NOTICE, isIdleExpired } from '../servicios/inactividad';
import { STAFF_IDLE_LIMIT_MS } from '../servicios/sesion-escrito';
import { useSession } from './ProveedorSesion';

/**
 * Mientras la pantalla que lo usa está montada, cierra la sesión en la pantalla cuando pasa
 * `limite` sin pedidos al servidor (spec 006, RF-48). El servidor ya cerró esa sesión, pero no
 * puede avisarle a una pantalla que no hace pedidos: así el escrito completado deja de
 * mostrarse en ese momento, sin esperar otra acción. Es la misma regla que ProveedorSesion
 * aplica a los clientes (spec 004), con el límite de los integrantes.
 *
 * Se mide desde el último pedido y no desde el último gesto, porque así cuenta el servidor. Se
 * compara con la hora y no se cuenta con el temporizador, que se frena con la computadora
 * suspendida; por eso también se controla al volver a la pestaña.
 */
export function useCierrePorInactividad(
  limite: number = STAFF_IDLE_LIMIT_MS,
  subscribeActivity: (listener: () => void) => () => void = httpClient.onActivity,
): void {
  const { endSession } = useSession();

  useEffect(() => {
    let lastActivity = Date.now();
    const stopListening = subscribeActivity(() => {
      lastActivity = Date.now();
    });
    const check = () => {
      if (isIdleExpired(lastActivity, Date.now(), limite)) endSession(IDLE_NOTICE);
    };
    const checkIfVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    const interval = setInterval(check, IDLE_CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', checkIfVisible);
    window.addEventListener('focus', check);
    return () => {
      stopListening();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', checkIfVisible);
      window.removeEventListener('focus', check);
    };
  }, [limite, subscribeActivity, endSession]);
}
