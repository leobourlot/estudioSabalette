import type { ReactNode } from 'react';
import type { ClaveServicio } from '../servicios/contenido-sitio';

/**
 * Íconos de las tarjetas de los servicios (spec 007, RF-12): un maletín para Derecho Laboral, un
 * casco de obra para Accidentes, una mano con monedas (la reparación del daño) para Daños y un
 * pergamino con texto (el testamento) para Sucesiones. Son decorativos: el nombre del servicio
 * va debajo. Al pasar el puntero por la tarjeta o al enfocar su botón, una parte del dibujo se
 * mueve (RF-45); con la reducción de movimiento pedida, queda quieto.
 *
 * Los dibujos son de Lucide (https://lucide.dev), copiados en el proyecto, sin la biblioteca
 * (principio 1). Su licencia pide conservar este aviso:
 *
 * ISC License. Copyright (c) 2026 Lucide Icons and Contributors. Permission to use, copy,
 * modify, and/or distribute this software for any purpose with or without fee is hereby
 * granted, provided that the above copyright notice and this permission notice appear in all
 * copies. THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD
 * TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT
 * SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY
 * DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF
 * CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE
 * OR PERFORMANCE OF THIS SOFTWARE.
 */

// La parte que se mueve se anima cuando la tarjeta (`group`) recibe el puntero o el foco. Las
// clases van escritas enteras para que Tailwind las encuentre.
const BALANCEO =
  'motion-safe:group-hover:animate-icono-balanceo motion-safe:group-focus-within:animate-icono-balanceo';
const SALTO =
  'motion-safe:group-hover:animate-icono-salto motion-safe:group-focus-within:animate-icono-salto';

/** Cada parte gira y se desplaza respecto de su propio dibujo. */
const ORIGEN = '[transform-box:fill-box]';

const DIBUJOS: Record<ClaveServicio, ReactNode> = {
  // Maletín: se balancea colgado de la manija.
  'derecho-laboral': (
    <g className={`${ORIGEN} origin-top ${BALANCEO}`}>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </g>
  ),
  // Casco: da un saltito.
  accidentes: (
    <g className={`${ORIGEN} origin-bottom ${SALTO}`}>
      <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
      <path d="M14 6a6 6 0 0 1 6 6v3" />
      <path d="M4 15v-3a6 6 0 0 1 6-6" />
      <rect x="2" y="15" width="20" height="4" rx="1" />
    </g>
  ),
  // Mano con monedas: las monedas suben.
  danos: (
    <>
      <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" />
      <path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" />
      <path d="m2 16 6 6" />
      <g className={`${ORIGEN} ${SALTO}`}>
        <circle cx="16" cy="9" r="2.9" />
        <circle cx="6" cy="5" r="3" />
      </g>
    </>
  ),
  // Pergamino: se balancea apenas.
  sucesiones: (
    <g className={`${ORIGEN} origin-center ${BALANCEO}`}>
      <path d="M15 12h-5" />
      <path d="M15 8h-5" />
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
    </g>
  ),
};

interface IconoServicioProps {
  clave: ClaveServicio;
  className?: string;
}

export function IconoServicio({ clave, className = 'h-7 w-7' }: IconoServicioProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`overflow-visible ${className}`}
      data-icono={clave}
    >
      {DIBUJOS[clave]}
    </svg>
  );
}
