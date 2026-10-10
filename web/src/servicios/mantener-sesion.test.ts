import { describe, expect, it, vi } from 'vitest';
import { createSessionKeepAlive, KEEP_ALIVE_INTERVAL_MS } from './mantener-sesion';

const MINUTE = 60_000;

/** Reloj simulado: la hora avanza solo cuando el test lo indica. */
function setup(ping: () => unknown = vi.fn()) {
  let time = 1_000_000;
  const keepAlive = createSessionKeepAlive(ping, () => time);
  return {
    ping,
    keepAlive,
    advance(ms: number) {
      time += ms;
    },
  };
}

/** Deja correr las promesas pendientes. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createSessionKeepAlive (RF-20)', () => {
  it('el intervalo es de 5 minutos', () => {
    expect(KEEP_ALIVE_INTERVAL_MS).toBe(5 * MINUTE);
  });

  it('no consulta al servidor antes de los 5 minutos, aunque se escriba mucho', async () => {
    const { ping, keepAlive, advance } = setup();

    keepAlive.notifyTyping();
    advance(4 * MINUTE + 59_000);
    for (let index = 0; index < 50; index++) keepAlive.notifyTyping();
    await flush();

    expect(ping).not.toHaveBeenCalled();
  });

  it('consulta una vez al pasar los 5 minutos y vuelve a esperar otros 5', async () => {
    const { ping, keepAlive, advance } = setup();

    advance(5 * MINUTE);
    keepAlive.notifyTyping();
    keepAlive.notifyTyping();
    await flush();
    expect(ping).toHaveBeenCalledTimes(1);

    advance(4 * MINUTE);
    keepAlive.notifyTyping();
    await flush();
    expect(ping).toHaveBeenCalledTimes(1);

    advance(MINUTE);
    keepAlive.notifyTyping();
    await flush();
    expect(ping).toHaveBeenCalledTimes(2);
  });

  it('sin escritura no consulta nunca: la sesión vence como siempre', async () => {
    const { ping, advance } = setup();

    advance(2 * 60 * MINUTE);
    await flush();

    expect(ping).not.toHaveBeenCalled();
  });

  it('después de una pausa larga, la primera tecla consulta una sola vez', async () => {
    const { ping, keepAlive, advance } = setup();

    advance(40 * MINUTE);
    keepAlive.notifyTyping();
    keepAlive.notifyTyping();
    await flush();

    expect(ping).toHaveBeenCalledTimes(1);
  });

  it('un error de la consulta no se propaga al formulario', async () => {
    const failing = vi.fn(() => Promise.reject(new Error('sin conexión')));
    const { keepAlive, advance } = setup(failing);

    advance(5 * MINUTE);
    expect(() => keepAlive.notifyTyping()).not.toThrow();
    await flush();

    expect(failing).toHaveBeenCalledTimes(1);
  });

  it('un error síncrono de la consulta tampoco se propaga', async () => {
    const failing = vi.fn(() => {
      throw new Error('falló');
    });
    const { keepAlive, advance } = setup(failing);

    advance(5 * MINUTE);
    expect(() => keepAlive.notifyTyping()).not.toThrow();
    await flush();
  });
});
