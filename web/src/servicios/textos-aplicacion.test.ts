import specText from '../../../docs/specs/008-identidad-visual-de-la-aplicacion/spec.md?raw';
import { describe, expect, it } from 'vitest';
import { TEXTOS_INGRESO } from './textos-aplicacion';

/** La cita de una sección del anexo de la spec 008 ("T-1"), sin el signo de cita. */
function annexQuote(id: string): string {
  const lines = specText.replace(/\r\n/g, '\n').split('\n');
  const annex = lines.findIndex((line) => line.startsWith('## Anexo'));
  const start = lines.findIndex((line, index) => index > annex && line.startsWith(`### ${id} `));
  if (start === -1) throw new Error(`No está la sección ${id} en el anexo`);
  const quote = lines.slice(start + 1).find((line) => line.startsWith('> '));
  return quote!.slice(2);
}

describe('textos del ingreso (spec 008, anexo)', () => {
  it('coinciden carácter por carácter con T-1, T-2 y T-3', () => {
    expect(TEXTOS_INGRESO.titulo).toBe(annexQuote('T-1'));
    expect(TEXTOS_INGRESO.indicacion).toBe(annexQuote('T-2'));
    expect(TEXTOS_INGRESO.olvido).toBe(annexQuote('T-3'));
  });

  it('la comparación detecta un texto distinto (caso de control)', () => {
    expect(annexQuote('T-1')).not.toBe('Seguí tu caso desde donde estés');
  });

  it('no incluye el texto que el estudio pidió quitar', () => {
    expect(JSON.stringify(TEXTOS_INGRESO)).not.toContain('Clientes e integrantes');
  });
});
