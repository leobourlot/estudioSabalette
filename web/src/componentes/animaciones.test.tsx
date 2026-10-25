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
  MOCKUP_EMAIL_CHAR_S,
  MOCKUP_FADE_S,
  MOCKUP_HOLD_S,
  MOCKUP_MOVEMENT_GAP_S,
  MOCKUP_MOVEMENT_RISE_PX,
  MOCKUP_PASSWORD_CHAR_S,
  MOCKUP_PRESS_S,
  MOCKUP_WINDOW_S,
  mockupCycle,
  mockupFrame,
  mockupLoopFrame,
  mockupTimeline,
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

describe('secuencia de la maqueta del portal (spec 007, RF-45 y RF-47)', () => {
  const EMAIL = 21;
  const PASSWORD = 8;
  const timeline = mockupTimeline(EMAIL, PASSWORD, 3);
  const at = (t: number) => mockupFrame(t, timeline, EMAIL, PASSWORD);
  const { emailStart, passwordStart, pointerStart, pressStart, portalStart, movementStarts } =
    timeline;

  it('va en orden: ventana, email, contraseña, puntero, clic, causa y movimientos', () => {
    const steps = [0, emailStart, passwordStart, pointerStart, pressStart, portalStart];

    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(emailStart).toBeGreaterThanOrEqual(MOCKUP_WINDOW_S);
    expect(passwordStart).toBeGreaterThanOrEqual(emailStart + EMAIL * MOCKUP_EMAIL_CHAR_S);
    expect(pointerStart).toBeGreaterThanOrEqual(passwordStart + PASSWORD * MOCKUP_PASSWORD_CHAR_S);
    expect(Math.min(...movementStarts)).toBeGreaterThan(portalStart);
  });

  it('los movimientos aparecen de a uno, del de abajo (el más antiguo) al de arriba', () => {
    expect(movementStarts[1] - movementStarts[2]).toBeCloseTo(MOCKUP_MOVEMENT_GAP_S);
    expect(movementStarts[0] - movementStarts[1]).toBeCloseTo(MOCKUP_MOVEMENT_GAP_S);
  });

  it('cada paso dura como mucho 0,6 segundos', () => {
    for (const duration of [MOCKUP_WINDOW_S, MOCKUP_FADE_S, MOCKUP_PRESS_S]) {
      expect(duration).toBeLessThanOrEqual(MAX_DURATION_S);
    }
  });

  it('al empezar, la ventana está oculta, con el ingreso vacío', () => {
    const frame = at(0);

    expect(frame.ventana).toEqual({ opacity: 0, y: 16 });
    expect([frame.ingreso, frame.portal]).toEqual([1, 0]);
    expect([frame.emailChars, frame.passwordChars]).toEqual([0, 0]);
    expect(frame.puntero.opacity).toBe(0);
  });

  it('el email se tipea letra por letra, con el cursor en su campo', () => {
    const middle = at(emailStart + 5.5 * MOCKUP_EMAIL_CHAR_S);

    expect(middle.ventana).toEqual({ opacity: 1, y: 0 });
    expect(middle.emailChars).toBe(5);
    expect(middle.passwordChars).toBe(0);
    expect(middle.cursor).toBe('email');
  });

  it('después la contraseña, con el email completo y el cursor en la contraseña', () => {
    const middle = at(passwordStart + 3.5 * MOCKUP_PASSWORD_CHAR_S);

    expect(middle.emailChars).toBe(EMAIL);
    expect(middle.passwordChars).toBe(3);
    expect(middle.cursor).toBe('contrasena');
  });

  it('el puntero aparece y presiona "Ingresar" solo durante el clic', () => {
    expect(at(pressStart - 0.01).presionado).toBe(false);
    expect(at(pressStart).puntero.opacity).toBeCloseTo(1);
    expect(at(pressStart).cursor).toBeNull();
    expect(at(pressStart + 0.1).presionado).toBe(true);
    expect(at(pressStart + MOCKUP_PRESS_S).presionado).toBe(false);
  });

  it('el ingreso da paso a la causa, sin movimientos todavía', () => {
    const during = at(portalStart + MOCKUP_FADE_S / 2);

    expect(during.ingreso + during.portal).toBeCloseTo(1);
    expect(during.portal).toBeGreaterThan(0);
    expect(during.movimientos.map((m) => m.opacity)).toEqual([0, 0, 0]);
  });

  it('al terminar, se ve la causa completa, igual que sin animaciones', () => {
    // Un poco después del final, para no depender del redondeo del último cuadro.
    const last = at(timeline.end + 0.01);

    expect(last).toEqual(at(Infinity));
    expect([last.ingreso, last.portal]).toEqual([0, 1]);
    expect(last.movimientos).toEqual([
      { opacity: 1, y: 0 },
      { opacity: 1, y: 0 },
      { opacity: 1, y: 0 },
    ]);
    expect(last.cursor).toBeNull();
    expect(last.presionado).toBe(false);
  });

  it('un movimiento sube poco al aparecer', () => {
    expect(at(movementStarts[2]).movimientos[2]).toEqual({
      opacity: 0,
      y: MOCKUP_MOVEMENT_RISE_PX,
    });
    expect(MOCKUP_MOVEMENT_RISE_PX).toBe(8);
  });
});

describe('bucle de la maqueta del portal (spec 007, RF-47)', () => {
  const EMAIL = 21;
  const PASSWORD = 8;
  const timeline = mockupTimeline(EMAIL, PASSWORD, 3);
  const cycle = mockupCycle(timeline);
  const loop = (t: number) => mockupLoopFrame(t, timeline, EMAIL, PASSWORD);
  const once = (t: number) => mockupFrame(t, timeline, EMAIL, PASSWORD);

  it('cada vuelta es la secuencia más la causa quieta', () => {
    expect(cycle).toBeCloseTo(timeline.end + MOCKUP_HOLD_S);
    expect(MOCKUP_HOLD_S).toBe(4);
  });

  it('la primera vuelta es la secuencia tal cual, con la aparición de la ventana', () => {
    for (const t of [0, 0.2, timeline.emailStart, timeline.portalStart, cycle - 0.01]) {
      expect(loop(t)).toEqual(once(t));
    }
  });

  it('durante la causa quieta no cambia nada', () => {
    expect(loop(timeline.end + 0.5)).toEqual(loop(cycle - 0.01));
  });

  it('al volver, la ventana sigue a la vista y la causa se desvanece sobre el ingreso vacío', () => {
    const back = loop(cycle + MOCKUP_FADE_S / 2);

    expect(back.ventana).toEqual({ opacity: 1, y: 0 });
    expect(back.ingreso + back.portal).toBeCloseTo(1);
    expect(back.portal).toBeGreaterThan(0);
    expect(back.movimientos.every((m) => m.opacity === 1)).toBe(true);
    expect([back.emailChars, back.passwordChars]).toEqual([0, 0]);
  });

  it('después de volver, repite la secuencia con la ventana a la vista', () => {
    // Lo que se ve, sin comparar decimales que el resto de la división puede correr un poco.
    const visible = (frame: ReturnType<typeof loop>) => ({
      ventana: frame.ventana.opacity,
      ingreso: Math.round(frame.ingreso * 100),
      emailChars: frame.emailChars,
      passwordChars: frame.passwordChars,
      cursor: frame.cursor,
      presionado: frame.presionado,
      movimientos: frame.movimientos.map((m) => Math.round(m.opacity * 100)),
    });
    const offsets = [
      timeline.emailStart + 5.5 * MOCKUP_EMAIL_CHAR_S,
      timeline.pressStart + 0.1,
      timeline.end + 1,
    ];
    for (const offset of offsets) {
      expect(visible(loop(cycle * 2 + offset))).toEqual({ ...visible(once(offset)), ventana: 1 });
    }
  });

  it('con la reducción de movimiento (tiempo infinito) es la causa completa, quieta', () => {
    expect(loop(Infinity)).toEqual(once(Infinity));
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
