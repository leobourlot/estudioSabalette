import { useMemo } from 'react';
import { createSessionKeepAlive } from '../servicios/mantener-sesion';
import { useJurisprudenciaService } from './ProveedorServicios';

/**
 * Devuelve la función que el formulario de un fallo llama en cada tecla (RF-20). Mientras el
 * integrante escribe, consulta al servidor como mucho una vez cada 5 minutos, para que la
 * sesión no venza mientras redacta. La regla vive en servicios/mantener-sesion.ts.
 */
export function useMantenerSesion(): () => void {
  const jurisprudencia = useJurisprudenciaService();
  const keepAlive = useMemo(
    () => createSessionKeepAlive(() => jurisprudencia.keepSessionAlive()),
    [jurisprudencia],
  );
  return keepAlive.notifyTyping;
}
