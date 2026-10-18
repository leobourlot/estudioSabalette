import { m, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { PAGE_ENTER, PAGE_SHOWN, pageTransition } from './animaciones';

interface AparecerAlCargarProps {
  children: ReactNode;
  className?: string;
  /** Posición en una lista escalonada; sin ella, aparece sin retraso. */
  indice?: number;
  /** El elemento que lo contiene: un div, un li dentro de una lista o una fila de una tabla. */
  como?: 'div' | 'li' | 'tr';
}

/**
 * Lo que aparece con un movimiento suave al montarse: una pantalla al abrirla o un elemento de
 * una lista al cargarse (spec 008, RF-26). Como cada elemento de una lista lleva la clave de su
 * dato, al cambiar de página o filtrar solo aparecen con movimiento los nuevos (RF-27). El
 * contenido está en el documento desde el primer momento, así el lector de pantalla lo encuentra
 * sin esperar a la animación. Con la reducción de movimiento, aparece directamente.
 */
export function AparecerAlCargar({
  children,
  className,
  indice = 0,
  como = 'div',
}: AparecerAlCargarProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const Element = { div: m.div, li: m.li, tr: m.tr }[como];
  return (
    <Element
      className={className}
      initial={reduceMotion ? false : PAGE_ENTER}
      animate={PAGE_SHOWN}
      transition={pageTransition(reduceMotion, indice)}
    >
      {children}
    </Element>
  );
}
