import { m, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { APPEAR_HIDDEN, APPEAR_SHOWN, appearTransition } from './animaciones';

interface AparecerProps {
  children: ReactNode;
  className?: string;
  /** Retraso para escalonar las tarjetas de una fila, en segundos. */
  retraso?: number;
}

/**
 * Lo que aparece con un movimiento suave al entrar en la pantalla, una sola vez (spec 007,
 * RF-45). El HTML prerenderizado trae el estado inicial (oculto): la marca data-aparecer permite
 * que index.html lo muestre cuando el navegador no ejecuta el código de la página (RF-35). Con la
 * reducción de movimiento, aparece directamente. El estado inicial es el mismo en el servidor y
 * en el navegador, así la hidratación coincide.
 */
export function Aparecer({ children, className, retraso = 0 }: AparecerProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <m.div
      data-aparecer=""
      className={className}
      initial={APPEAR_HIDDEN}
      whileInView={APPEAR_SHOWN}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={appearTransition(reduceMotion, retraso)}
    >
      {children}
    </m.div>
  );
}
