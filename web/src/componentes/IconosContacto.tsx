import { CONTORNO } from './IconosRedes';
import { useIdSvg } from './useIdSvg';

/**
 * Íconos propios de los renglones del bloque de contacto (spec 007, RF-23), en SVG, sin
 * bibliotecas (principio 1). Son decorativos: cada renglón tiene su etiqueta escrita.
 */

/** Colores de Google Maps para el pin de "Ubicación", que lleva a Maps con "Cómo llegar". */
export const COLORES_MAPS = {
  rojo: '#EA4335',
  azul: '#4285F4',
  amarillo: '#FBBC04',
  verde: '#34A853',
} as const;

const PIN = 'M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Z';

/**
 * El pin de Maps: rojo arriba a la derecha, azul arriba a la izquierda, y amarillo y verde abajo,
 * con el contorno blanco de los íconos a color.
 */
export function IconoUbicacionColor() {
  const clipId = useIdSvg('pin');
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0">
      <defs>
        <clipPath id={clipId}>
          <path d={PIN} />
        </clipPath>
      </defs>
      <path d={PIN} {...CONTORNO} />
      <g clipPath={`url(#${clipId})`}>
        <path d={PIN} fill={COLORES_MAPS.rojo} />
        <polygon points="12,9 3,0 0,0 0,21" fill={COLORES_MAPS.azul} />
        <polygon points="12,9 0,21 0,24 1,24 14,11" fill={COLORES_MAPS.amarillo} />
        <polygon points="24,1 24,24 1,24" fill={COLORES_MAPS.verde} />
      </g>
      <circle cx="12" cy="9" r="2.6" fill="#FFFFFF" />
    </svg>
  );
}

const SVG_PROPS = {
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  className: 'h-5 w-5',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function IconoUbicacion() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export function IconoReloj() {
  return (
    <svg {...SVG_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconoEmail() {
  return (
    <svg {...SVG_PROPS}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
