import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PANEL_MENU, PORTAL_MENU } from '../servicios/menu-aplicacion';
import { IconoCerrar, IconoHamburguesa, IconoMenu, ICONOS_DIBUJADOS } from './IconosMenu';

describe('IconosMenu (spec 008, RF-5 y RNF de accesibilidad)', () => {
  it('hay un ícono dibujado para cada opción de los dos menús', () => {
    for (const option of [...PANEL_MENU, ...PORTAL_MENU]) {
      expect(ICONOS_DIBUJADOS).toContain(option.icon);
    }
  });

  it.each(ICONOS_DIBUJADOS)('el ícono "%s" no se anuncia ni recibe el foco', (nombre) => {
    const { container } = render(<IconoMenu nombre={nombre} />);

    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('los íconos de abrir y cerrar el menú tampoco se anuncian', () => {
    for (const Icono of [IconoHamburguesa, IconoCerrar]) {
      const { container } = render(<Icono />);
      expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    }
  });
});
