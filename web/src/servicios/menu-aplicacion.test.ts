import { describe, expect, it } from 'vitest';
import {
  isSectionActive,
  type MenuOption,
  PANEL_MENU,
  PORTAL_MENU,
  SECTION_HOMES,
  SECTION_NAMES,
} from './menu-aplicacion';

const labels = (menu: readonly MenuOption[]) => menu.map((option) => option.label);

/** Las opciones marcadas en una dirección. */
const activeIn = (menu: readonly MenuOption[], pathname: string) =>
  menu.filter((option) => isSectionActive(option, pathname)).map((option) => option.label);

describe('opciones del menú (spec 008, RF-6)', () => {
  it('el panel tiene sus seis opciones, en orden', () => {
    expect(labels(PANEL_MENU)).toEqual([
      'Inicio',
      'Causas',
      'Jurisprudencia',
      'Modelos de escritos',
      'Cuentas',
      'Mi cuenta',
    ]);
  });

  it('el portal tiene sus tres opciones, en orden (spec 004, RF-2)', () => {
    expect(labels(PORTAL_MENU)).toEqual(['Mis causas', 'Mi cuenta', 'Cambiar contraseña']);
  });

  it('cada sección tiene su nombre y su inicio (RF-5, RF-8)', () => {
    expect(SECTION_NAMES).toEqual({ panel: 'Panel del estudio', portal: 'Portal de clientes' });
    expect(SECTION_HOMES).toEqual({ panel: '/panel', portal: '/portal' });
  });
});

describe('isSectionActive (spec 008, RF-7)', () => {
  it.each([
    ['/panel', 'Inicio'],
    ['/panel/causas', 'Causas'],
    ['/panel/causas/nueva', 'Causas'],
    ['/panel/causas/7', 'Causas'],
    ['/panel/causas/7/movimientos/3', 'Causas'],
    ['/panel/causas/7/modelos', 'Causas'],
    ['/panel/causas/7/modelos/2', 'Causas'],
    ['/panel/jurisprudencia', 'Jurisprudencia'],
    ['/panel/jurisprudencia/nuevo', 'Jurisprudencia'],
    ['/panel/jurisprudencia/4', 'Jurisprudencia'],
    ['/panel/modelos', 'Modelos de escritos'],
    ['/panel/modelos/nuevo', 'Modelos de escritos'],
    ['/panel/modelos/5', 'Modelos de escritos'],
    ['/panel/usuarios', 'Cuentas'],
    ['/panel/usuarios/nuevo', 'Cuentas'],
    ['/panel/usuarios/9', 'Cuentas'],
    ['/panel/mi-cuenta', 'Mi cuenta'],
  ])('en %s marca solo "%s"', (pathname, label) => {
    expect(activeIn(PANEL_MENU, pathname)).toEqual([label]);
  });

  it.each([
    ['/portal', 'Mis causas'],
    ['/portal/causas/7', 'Mis causas'],
    ['/portal/causas/7/movimientos/3', 'Mis causas'],
    ['/portal/mi-cuenta', 'Mi cuenta'],
    ['/cambiar-contrasena', 'Cambiar contraseña'],
  ])('en %s marca solo "%s"', (pathname, label) => {
    expect(activeIn(PORTAL_MENU, pathname)).toEqual([label]);
  });

  it('no confunde una dirección que solo empieza igual', () => {
    expect(activeIn(PANEL_MENU, '/panel/causasviejas')).toEqual([]);
  });
});
