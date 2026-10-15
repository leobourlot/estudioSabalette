import { useEffect } from 'react';

/**
 * Pone el título del documento, el que muestran la pestaña del navegador y los buscadores
 * (spec 007, RF-34). Lo cambia cada vez que cambia el título pedido, por ejemplo al elegir otra
 * pestaña de Derecho Laboral.
 */
export function useTituloDocumento(titulo: string): void {
  useEffect(() => {
    document.title = titulo;
  }, [titulo]);
}
