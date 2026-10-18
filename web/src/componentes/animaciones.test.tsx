import { render, screen } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'motion/react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import indexHtml from '../../index.html?raw';
import { SitioPublico } from '../SitioPublico';
import {
  APPEAR_HIDDEN,
  APPEAR_SHOWN,
  appearTransition,
  MAX_DURATION_S,
  PAGE_ENTER,
  PAGE_SHOWN,
  pageTransition,
  STAGGER_S,
  staggerDelay,
  switchTransition,
} from './animaciones';
import { Aparecer } from './Aparecer';
import { AparecerAlCargar } from './AparecerAlCargar';
import { MenuSitio } from './MenuSitio';

const total = (t: { duration?: number; delay?: number }) => (t.duration ?? 0) + (t.delay ?? 0);

describe('transiciones (spec 007, RF-45)', () => {
  it('con la reducción de movimiento, todo aparece directamente', () => {
    expect(appearTransition(true)).toEqual({ duration: 0 });
    expect(appearTransition(true, 0.3)).toEqual({ duration: 0 });
    expect(switchTransition(true)).toEqual({ duration: 0 });
  });

  it('ninguna animación dura más de 0,6 segundos, con su retraso', () => {
    for (const delay of [0, STAGGER_S, STAGGER_S * 3, 2]) {
      expect(total(appearTransition(false, delay) as never)).toBeLessThanOrEqual(MAX_DURATION_S);
    }
    expect(total(switchTransition(false) as never)).toBeLessThanOrEqual(MAX_DURATION_S);
  });

  it('lo que aparece sube un poco y se hace visible', () => {
    expect(APPEAR_HIDDEN).toEqual({ opacity: 0, y: 16 });
    expect(APPEAR_SHOWN).toEqual({ opacity: 1, y: 0 });
  });
});

describe('Aparecer (RF-45)', () => {
  it('marca lo que se anima y lo muestra al entrar en la pantalla', async () => {
    render(
      <LazyMotion features={domAnimation}>
        <Aparecer>
          <p>Texto</p>
        </Aparecer>
      </LazyMotion>,
    );

    const wrapper = screen.getByText('Texto').parentElement!;
    expect(wrapper.hasAttribute('data-aparecer')).toBe(true);
    await expect.poll(() => wrapper.style.opacity).toBe('1');
  });
});

describe('sin el código de la página (RF-35, RF-45)', () => {
  const home = renderToString(
    <StaticRouter location="/">
      <SitioPublico />
    </StaticRouter>,
  );
  const doc = new DOMParser().parseFromString(home, 'text/html');

  it('el HTML prerenderizado marca con data-aparecer lo que llega oculto', () => {
    const hidden = Array.from(doc.querySelectorAll<HTMLElement>('[style*="opacity:0"]'));

    expect(hidden.length).toBeGreaterThan(0);
    for (const element of hidden) expect(element.hasAttribute('data-aparecer')).toBe(true);
  });

  it('la apertura del inicio se ve desde el primer momento', () => {
    const opening = doc.getElementById('inicio-titulo')!;

    expect(opening.closest('[data-aparecer]')).toBeNull();
    expect(opening.closest('[style*="opacity"]')).toBeNull();
  });

  it('index.html muestra lo marcado cuando el navegador no ejecuta el código', () => {
    const noscript = /<noscript>([\s\S]*?)<\/noscript>/.exec(indexHtml)![1];

    expect(noscript).toContain('[data-aparecer]');
    expect(noscript).toMatch(/opacity: 1 !important/);
    expect(noscript).toMatch(/transform: none !important/);
  });

  it('el menú plegado no llega oculto', () => {
    const menu = renderToString(<MenuSitio />);

    expect(menu).not.toContain('opacity:0');
  });
});

describe('transiciones del ingreso, el portal y el panel (spec 008, RF-26 y RF-27)', () => {
  it('con la reducción de movimiento, todo aparece directamente', () => {
    expect(pageTransition(true)).toEqual({ duration: 0 });
    expect(pageTransition(true, 5)).toEqual({ duration: 0 });
  });

  it('las listas se escalonan y ninguna aparición termina después de 0,6 segundos', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(1)).toBeCloseTo(STAGGER_S);
    for (const index of [0, 1, 2, 3, 10, 50]) {
      expect(total(pageTransition(false, index) as never)).toBeLessThanOrEqual(MAX_DURATION_S);
    }
  });

  it('lo que aparece sube un poco y se hace visible', () => {
    expect(PAGE_ENTER).toEqual({ opacity: 0, y: 8 });
    expect(PAGE_SHOWN).toEqual({ opacity: 1, y: 0 });
  });
});

describe('AparecerAlCargar (spec 008, RF-26 y RF-27)', () => {
  it('el contenido está en el documento desde el primer momento y termina visible', async () => {
    render(
      <LazyMotion features={domAnimation}>
        <AparecerAlCargar>
          <p role="alert">Aviso</p>
        </AparecerAlCargar>
      </LazyMotion>,
    );

    const wrapper = screen.getByRole('alert').parentElement!;
    await expect.poll(() => wrapper.style.opacity).toBe('1');
  });

  it('dentro de una lista es un elemento de la lista', () => {
    render(
      <LazyMotion features={domAnimation}>
        <ul>
          <AparecerAlCargar como="li" indice={2}>
            Causa
          </AparecerAlCargar>
        </ul>
      </LazyMotion>,
    );

    expect(screen.getByRole('listitem').textContent).toBe('Causa');
  });
});
