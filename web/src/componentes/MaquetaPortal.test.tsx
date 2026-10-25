import { render, screen } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'motion/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CAUSA_EJEMPLO, INGRESO_EJEMPLO, TEXTOS } from '../servicios/contenido-sitio';
import { MaquetaPortal } from './MaquetaPortal';

const tree = (
  <LazyMotion features={domAnimation}>
    <MaquetaPortal />
  </LazyMotion>
);

const part = (mockup: HTMLElement, name: string) =>
  mockup.querySelector<HTMLElement>(`[data-parte="${name}"]`)!;

describe('MaquetaPortal (spec 007, RF-47)', () => {
  it('es una sola imagen con su descripción', () => {
    render(tree);

    expect(screen.getByRole('img', { name: TEXTOS.portal.descripcionMaqueta })).toBeTruthy();
  });

  it('muestra la causa de ejemplo de T-22: carátula, datos y movimientos en orden', () => {
    render(tree);

    const mockup = screen.getByRole('img');
    expect(mockup.textContent).toContain(CAUSA_EJEMPLO.caratula);
    for (const [etiqueta, valor] of CAUSA_EJEMPLO.datos) {
      expect(mockup.textContent).toContain(`${etiqueta}${valor}`);
    }
    const movements = Array.from(mockup.querySelectorAll('[data-movimiento]'));
    expect(movements.map((li) => li.textContent)).toEqual(
      CAUSA_EJEMPLO.movimientos.map((m) => `${m.fecha}${m.tipo}${m.texto}`),
    );
  });

  it('lleva la leyenda del portal, la marca "Ejemplo" y el ingreso con sus etiquetas', () => {
    render(tree);

    const mockup = screen.getByRole('img');
    expect(mockup.textContent).toContain(TEXTOS.portal.leyenda);
    expect(mockup.textContent).toContain(TEXTOS.portal.ejemplo);
    expect(mockup.textContent).toContain(TEXTOS.portal.movimientos);
    const login = part(mockup, 'ingreso');
    for (const text of [
      INGRESO_EJEMPLO.titulo,
      INGRESO_EJEMPLO.etiquetaEmail,
      INGRESO_EJEMPLO.etiquetaContrasena,
    ]) {
      expect(login.textContent).toContain(text);
    }
    expect(login.querySelector('[data-boton]')!.textContent).toBe(INGRESO_EJEMPLO.boton);
  });

  it('no tiene títulos, campos, enlaces ni controles, y no recibe el foco', () => {
    render(tree);

    const mockup = screen.getByRole('img');
    expect(mockup.querySelector('h1, h2, h3, h4, h5, h6, a, button, input, [tabindex]')).toBeNull();
    expect(mockup.hasAttribute('tabindex')).toBe(false);
  });

  describe('sin el código de la página (RF-35)', () => {
    const doc = new DOMParser().parseFromString(renderToString(tree), 'text/html');
    const mockup = doc.querySelector<HTMLElement>('[data-maqueta]')!;

    it('solo la ventana llega oculta, marcada con data-aparecer', () => {
      const hidden = Array.from(doc.querySelectorAll('[style*="opacity:0"]'));

      expect(hidden).toEqual([mockup]);
      expect(mockup.hasAttribute('data-aparecer')).toBe(true);
    });

    it('adentro trae la causa completa, sin el ingreso', () => {
      expect(part(mockup, 'portal').getAttribute('style')).toContain('opacity:1');
      expect(part(mockup, 'ingreso').className).toContain('invisible');
      for (const li of Array.from(mockup.querySelectorAll('[data-movimiento]'))) {
        expect(li.getAttribute('style')).toContain('opacity:1');
      }
    });
  });

  it('al entrar en la pantalla tipea el ingreso y llega a la causa completa', async () => {
    render(tree);

    const mockup = screen.getByRole('img');
    const emailField = mockup.querySelector('[data-campo="email"]')!;
    const passwordField = mockup.querySelector('[data-campo="contrasena"]')!;
    await expect.poll(() => mockup.dataset.vista).toBe('ingreso');
    await expect.poll(() => emailField.textContent, { timeout: 4000 }).toBe(INGRESO_EJEMPLO.email);
    await expect
      .poll(() => passwordField.textContent, { timeout: 4000 })
      .toBe('•'.repeat(INGRESO_EJEMPLO.largoContrasena));
    await expect.poll(() => mockup.dataset.vista, { timeout: 4000 }).toBe('portal');
    const newest = mockup.querySelector<HTMLElement>('[data-movimiento]')!;
    await expect.poll(() => newest.style.opacity, { timeout: 4000 }).toBe('1');
    expect(mockup.style.opacity).toBe('1');
  }, 12000);
});
