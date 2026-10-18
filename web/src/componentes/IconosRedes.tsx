import { useIdSvg } from './useIdSvg';

/**
 * Íconos propios de WhatsApp y de las redes sociales del contacto y del pie (spec 007, RF-23 y
 * RF-44), en SVG, sin bibliotecas (principio 1). Son decorativos: el nombre de la red va escrito
 * al lado. `IconoRedColor`, el del contacto y el pie, lleva los colores de cada red, con un
 * contorno blanco que sigue el dibujo para que se distinga sobre los azules del estudio.
 * `IconoRed` toma el color del texto: queda para las redes sin colores propios.
 */

interface IconoRedProps {
  red: string;
}

const ICON_CLASS = 'h-6 w-6 shrink-0';

/**
 * Contorno blanco de los íconos a color: un trazo detrás de la figura, del mismo dibujo. La figura
 * tapa la mitad de adentro y queda a la vista solo la de afuera.
 */
export const CONTORNO = {
  fill: 'none',
  stroke: '#FCFFFF',
  strokeWidth: 2.4,
  strokeLinejoin: 'round',
} as const;

/** Colores de cada red para `IconoRedColor`. */
export const COLORES_REDES = {
  whatsapp: '#25D366',
  facebook: '#1877F2',
  x: '#0F1419',
  linkedin: '#0A66C2',
} as const;

/** Degradado de Instagram, de amarillo abajo a la izquierda a azul arriba. */
const INSTAGRAM_STOPS = [
  ['0', '#FDF497'],
  ['0.05', '#FDF497'],
  ['0.45', '#FD5949'],
  ['0.6', '#D6249F'],
  ['0.9', '#285AEB'],
] as const;

export function IconoRedColor({ red }: IconoRedProps) {
  const gradientId = useIdSvg('instagram');

  switch (red.toLowerCase()) {
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={ICON_CLASS}>
          <defs>
            <radialGradient id={gradientId} cx="0.3" cy="1.07" r="1.5">
              {INSTAGRAM_STOPS.map(([offset, color]) => (
                <stop key={offset} offset={offset} stopColor={color} />
              ))}
            </radialGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="5.5" {...CONTORNO} />
          <rect x="2" y="2" width="20" height="20" rx="5.5" fill={`url(#${gradientId})`} />
          <g fill="none" stroke="#FFFFFF" strokeWidth="1.6">
            <rect x="6.5" y="6.5" width="11" height="11" rx="3.2" />
            <circle cx="12" cy="12" r="2.7" />
          </g>
          <circle cx="15.3" cy="8.7" r="0.8" fill="#FFFFFF" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={ICON_CLASS}>
          <circle cx="12" cy="12" r="10" {...CONTORNO} />
          <circle cx="12" cy="12" r="10" fill={COLORES_REDES.facebook} />
          <path
            fill="#FFFFFF"
            d="M13.4 21.9v-7.1h2.4l.4-2.8h-2.8v-1.8c0-.8.2-1.4 1.4-1.4h1.5V6.3c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8V12H8v2.8h2.4v7.1Z"
          />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={ICON_CLASS}>
          <path {...CONTORNO} d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z" />
          <path
            fill={COLORES_REDES.whatsapp}
            d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z"
          />
          <path
            fill="#FFFFFF"
            d="M16.5 14.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.5 2.5 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z"
          />
        </svg>
      );
    case 'x':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={ICON_CLASS}>
          <path
            {...CONTORNO}
            d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z"
          />
          <path
            fill={COLORES_REDES.x}
            d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z"
          />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={ICON_CLASS}>
          <rect x="2" y="2" width="20" height="20" rx="3" {...CONTORNO} />
          <rect x="2" y="2" width="20" height="20" rx="3" fill={COLORES_REDES.linkedin} />
          <path
            fill="#FFFFFF"
            transform="translate(4.8 4.8) scale(0.6)"
            d="M4 9h4v12H4zM6 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm4 6h3.8v1.7A4.2 4.2 0 0 1 17.6 9C21 9 22 11 22 14.5V21h-4v-5.8c0-1.6-.3-2.9-2-2.9s-2 1.3-2 2.8V21h-4Z"
          />
        </svg>
      );
    default:
      // Cualquier otra red no tiene colores propios: el ícono de enlace, en el blanco del texto.
      return <IconoRed red={red} />;
  }
}

export function IconoRed({ red }: IconoRedProps) {
  switch (red.toLowerCase()) {
    case 'instagram':
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={ICON_CLASS}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={ICON_CLASS} fill="currentColor">
          <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v7h4v-7h3l1-4h-4V8.5a.5.5 0 0 1 .5-.5Z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={ICON_CLASS} fill="currentColor">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.5 2.5 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z" />
        </svg>
      );
    case 'x':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={ICON_CLASS} fill="currentColor">
          <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={ICON_CLASS} fill="currentColor">
          <path d="M4 9h4v12H4zM6 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm4 6h3.8v1.7A4.2 4.2 0 0 1 17.6 9C21 9 22 11 22 14.5V21h-4v-5.8c0-1.6-.3-2.9-2-2.9s-2 1.3-2 2.8V21h-4Z" />
        </svg>
      );
    default:
      // Cualquier otra red: un ícono de enlace.
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={ICON_CLASS}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
          <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
        </svg>
      );
  }
}
