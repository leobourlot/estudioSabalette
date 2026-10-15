/**
 * Íconos propios de las redes sociales del bloque de contacto (spec 007, RF-23), en SVG, sin
 * bibliotecas (principio 1). Son decorativos: el nombre de la red va escrito al lado.
 */

interface IconoRedProps {
  red: string;
}

const ICON_CLASS = 'h-5 w-5 shrink-0';

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
