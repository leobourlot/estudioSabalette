import { describe, expect, it, vi } from 'vitest';
import { clearClipboard, copyText } from './portapapeles';

const accepting = () => ({ writeText: vi.fn<(text: string) => Promise<void>>(async () => {}) });

const rejecting = () => ({
  writeText: vi.fn<(text: string) => Promise<void>>(async () => {
    throw new Error('El navegador no permite escribir el portapapeles');
  }),
});

describe('copyText (RF-44, RF-45)', () => {
  it('escribe el texto exacto, con sus saltos de línea, y avisa que se copió', async () => {
    const clipboard = accepting();
    const texto = 'Señor Juez:\n\nLuis Gómez, por derecho propio.';

    expect(await copyText(texto, clipboard)).toBe(true);
    expect(clipboard.writeText).toHaveBeenCalledExactlyOnceWith(texto);
  });

  it('avisa que no se copió si el navegador lo rechaza', async () => {
    expect(await copyText('Texto', rejecting())).toBe(false);
  });

  it('avisa que no se copió si el navegador no tiene portapapeles', async () => {
    expect(await copyText('Texto', null)).toBe(false);
  });

  it('avisa que no se copió si escribir el portapapeles falla antes de devolver una promesa', async () => {
    const clipboard = {
      writeText: () => {
        throw new Error('Sin permiso');
      },
    };
    expect(await copyText('Texto', clipboard)).toBe(false);
  });

  it('sin indicar un portapapeles usa el del navegador, y no falla si no existe', async () => {
    expect(await copyText('Texto')).toBe(false);
  });
});

describe('clearClipboard (RF-44)', () => {
  it('escribe un texto vacío', async () => {
    const clipboard = accepting();

    await clearClipboard(clipboard);

    expect(clipboard.writeText).toHaveBeenCalledExactlyOnceWith('');
  });

  it('no falla si el navegador lo rechaza', async () => {
    await expect(clearClipboard(rejecting())).resolves.toBeUndefined();
  });

  it('no falla si el navegador no tiene portapapeles', async () => {
    await expect(clearClipboard(null)).resolves.toBeUndefined();
    await expect(clearClipboard()).resolves.toBeUndefined();
  });
});
