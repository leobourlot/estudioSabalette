import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sin globals de Vitest, Testing Library no limpia el DOM sola entre tests.
afterEach(() => {
  cleanup();
});

// jsdom no tiene IntersectionObserver, que usan las animaciones del sitio público al entrar en
// la pantalla (spec 007, RF-45): este da todo por visible apenas se observa.
if (!('IntersectionObserver' in globalThis)) {
  class VisibleIntersectionObserver {
    readonly root = null;
    readonly rootMargin = '0px';
    readonly thresholds = [0];
    private readonly callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      queueMicrotask(() =>
        this.callback(
          [{ isIntersecting: true, intersectionRatio: 1, target } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        ),
      );
    }

    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver =
    VisibleIntersectionObserver as unknown as typeof IntersectionObserver;
}

// jsdom tampoco tiene matchMedia, con el que se consulta la reducción de movimiento: por defecto,
// ninguna consulta coincide. Los tests de la reducción lo reemplazan.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
