import { describe, expect, it } from 'vitest';
import { emptyListMessage, suggestionLabel } from './presentacion-jurisprudencia';

describe('emptyListMessage (RF-27, RF-28)', () => {
  it('sin fallos en la primera página: "Todavía no hay fallos cargados"', () => {
    expect(emptyListMessage({ hayFallos: false, pagina: 1 })).toEqual({
      mensaje: 'Todavía no hay fallos cargados',
      ofrecerPrimeraPagina: false,
    });
  });

  it('con fallos que no coinciden, en la primera página: "No hay fallos que coincidan con la búsqueda"', () => {
    expect(emptyListMessage({ hayFallos: true, pagina: 1 })).toEqual({
      mensaje: 'No hay fallos que coincidan con la búsqueda',
      ofrecerPrimeraPagina: false,
    });
  });

  it.each([true, false])(
    'en otra página (hayFallos: %s): ningún mensaje, y se ofrece volver a la primera',
    (hayFallos) => {
      expect(emptyListMessage({ hayFallos, pagina: 3 })).toEqual({
        mensaje: null,
        ofrecerPrimeraPagina: true,
      });
    },
  );
});

describe('suggestionLabel (RF-13)', () => {
  it('muestra la palabra con la cantidad de fallos que la usan', () => {
    expect(suggestionLabel({ id: 1, texto: 'daño moral', cantidad: 12 })).toBe('daño moral (12)');
    expect(suggestionLabel({ id: 2, texto: 'en desuso', cantidad: 0 })).toBe('en desuso (0)');
  });
});
