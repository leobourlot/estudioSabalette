import { ROUTES } from './sesion';

/**
 * Las opciones del menú lateral del portal y del panel (spec 008, RF-5 a RF-7). Regla pura, sin
 * React: el ícono va por nombre y `IconosMenu` lo dibuja.
 */

export type IconoMenu =
  'inicio' | 'carpeta' | 'balanza' | 'documento' | 'personas' | 'persona' | 'llave';

export interface MenuOption {
  to: string;
  label: string;
  icon: IconoMenu;
  /** True si la opción solo se marca en su dirección exacta (el inicio de la sección). */
  end?: boolean;
  /** Otras direcciones cuyos detalles son de esta opción, como las causas del portal. */
  details?: readonly string[];
}

export type Section = 'panel' | 'portal';

/** El nombre de la sección, debajo del nombre del estudio en el menú (RF-5). */
export const SECTION_NAMES: Record<Section, string> = {
  panel: 'Panel del estudio',
  portal: 'Portal de clientes',
};

/** El nombre de la navegación para el lector de pantalla (RNF de accesibilidad). */
export const NAV_LABELS: Record<Section, string> = {
  panel: 'Panel',
  portal: 'Portal',
};

/** El inicio de cada sección, adonde llevan el logo y el nombre del estudio (RF-8). */
export const SECTION_HOMES: Record<Section, string> = {
  panel: ROUTES.panel,
  portal: ROUTES.portal,
};

/** Opciones del panel, en el orden de RF-6. */
export const PANEL_MENU: readonly MenuOption[] = [
  { to: '/panel', label: 'Inicio', icon: 'inicio', end: true },
  { to: '/panel/causas', label: 'Causas', icon: 'carpeta' },
  { to: '/panel/jurisprudencia', label: 'Jurisprudencia', icon: 'balanza' },
  { to: '/panel/modelos', label: 'Modelos de escritos', icon: 'documento' },
  { to: '/panel/usuarios', label: 'Cuentas', icon: 'personas' },
  { to: '/panel/mi-cuenta', label: 'Mi cuenta', icon: 'persona' },
];

/** Opciones del portal, en el orden de RF-6 (spec 004, RF-2). */
export const PORTAL_MENU: readonly MenuOption[] = [
  { to: '/portal', label: 'Mis causas', icon: 'carpeta', end: true, details: ['/portal/causas'] },
  { to: '/portal/mi-cuenta', label: 'Mi cuenta', icon: 'persona' },
  { to: ROUTES.changePassword, label: 'Cambiar contraseña', icon: 'llave' },
];

export const MENUS: Record<Section, readonly MenuOption[]> = {
  panel: PANEL_MENU,
  portal: PORTAL_MENU,
};

const isWithin = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/**
 * Si la opción se marca en esta dirección (RF-7): en la suya y en sus detalles. Con `end`, solo
 * en la exacta (el inicio de la sección, que contiene a todas las demás), más los detalles de
 * `details`: "Mis causas" se marca en el detalle de una causa.
 */
export function isSectionActive(option: MenuOption, pathname: string): boolean {
  if (option.end ? pathname === option.to : isWithin(pathname, option.to)) return true;
  return (option.details ?? []).some((base) => isWithin(pathname, base));
}
