import { useMemo } from 'react';
import { createSessionKeepAlive } from '../servicios/mantener-sesion';
import { useModelosService } from './ProveedorServicios';

/**
 * Devuelve la función que una pantalla de modelos llama ante cada uso: una tecla en el
 * formulario de un modelo (spec 006, RF-17), o recorrer, seleccionar o copiar un escrito
 * completado (RF-48). Mientras hay uso, consulta al servidor como mucho una vez cada 5
 * minutos, para que la sesión no venza. Sin uso no consulta, y la sesión vence como siempre.
 * La regla vive en servicios/mantener-sesion.ts; acá solo se elige con qué servicio consultar,
 * para no depender del de jurisprudencia (RF-53).
 */
export function useUsoDeSesion(): () => void {
  const modelos = useModelosService();
  const keepAlive = useMemo(
    () => createSessionKeepAlive(() => modelos.keepSessionAlive()),
    [modelos],
  );
  return keepAlive.notifyTyping;
}
