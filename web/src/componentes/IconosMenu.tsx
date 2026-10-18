import type { IconoMenu as NombreIcono } from '../servicios/menu-aplicacion';

/**
 * Íconos de las opciones del menú lateral y de los accesos del inicio del panel (spec 008, RF-5
 * y RF-25), dibujados en SVG dentro del proyecto, sin bibliotecas (principio 1). Son decorativos:
 * el nombre de la opción va al lado.
 */

const TRAZOS: Record<NombreIcono, string[]> = {
  inicio: ['M3 10.5 12 3l9 7.5', 'M5 9v11h5v-6h4v6h5V9'],
  carpeta: [
    'M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5Z',
  ],
  balanza: [
    'M12 4v16',
    'M8 20h8',
    'M5 7h14',
    'M5 7l-3 7a3 3 0 0 0 6 0Z',
    'M19 7l-3 7a3 3 0 0 0 6 0Z',
  ],
  documento: [
    'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z',
    'M14 3v5h5',
    'M9 13h6',
    'M9 17h6',
  ],
  personas: [
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
    'M2.5 20a6.5 6.5 0 0 1 13 0',
    'M16 4.3a3.5 3.5 0 0 1 0 6.4',
    'M18 14.5a6.5 6.5 0 0 1 3.5 5.5',
  ],
  persona: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 21a7.5 7.5 0 0 1 15 0'],
  llave: [
    'M14.5 9.5a4.5 4.5 0 1 1-1.3-3.2 4.5 4.5 0 0 1 1.3 3.2Z',
    'M13.2 12.7 21 20.5',
    'M18 17.5l2-2',
    'M15.5 15l2-2',
  ],
};

/** Los nombres de los íconos que hay dibujados, para el test. */
export const ICONOS_DIBUJADOS = Object.keys(TRAZOS) as NombreIcono[];

interface IconoMenuProps {
  nombre: NombreIcono;
  className?: string;
}

export function IconoMenu({ nombre, className = 'h-5 w-5' }: IconoMenuProps) {
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
      className={`shrink-0 ${className}`}
    >
      {TRAZOS[nombre].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** El botón "Menú" de la barra de arriba (RF-9). */
export function IconoHamburguesa() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="h-5 w-5 shrink-0"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

/** El botón "Cerrar menú" (RF-9). */
export function IconoCerrar() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="h-5 w-5 shrink-0"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
