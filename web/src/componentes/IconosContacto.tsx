/**
 * Íconos propios de los renglones del bloque de contacto (spec 007, RF-23), en SVG, sin
 * bibliotecas (principio 1). Son decorativos: cada renglón tiene su etiqueta escrita.
 */

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

export function IconoTelefono() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
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
