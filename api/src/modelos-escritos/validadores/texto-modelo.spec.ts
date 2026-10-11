import { describe, expect, it } from 'vitest';
import { hasOnlyAllowedCharacters as hasOnlyCausaCharacters } from '../../causas/validadores/texto-causa.js';
import {
  hasOnlyAllowedCharacters as hasOnlyMovementCharacters,
  textLength,
} from '../../movimientos/validadores/texto-movimiento.js';
import {
  MAX_DESCRIPCION_LENGTH,
  MAX_SEARCH_LENGTH,
  MAX_TEXTO_LENGTH,
  MAX_TITULO_LENGTH,
} from './longitudes.js';
import {
  ALLOWED_TEXT_SYMBOLS,
  convertModelText,
  hasOnlyModelTextCharacters,
} from './texto-modelo.js';

// Se arma con su código para que el archivo no lleve un carácter invisible.
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

describe('largos máximos de un modelo (RF-1, RF-21)', () => {
  it('título 150, descripción 500, texto 50.000 y búsqueda 100', () => {
    expect(MAX_TITULO_LENGTH).toBe(150);
    expect(MAX_DESCRIPCION_LENGTH).toBe(500);
    expect(MAX_TEXTO_LENGTH).toBe(50_000);
    expect(MAX_SEARCH_LENGTH).toBe(100);
  });
});

describe('convertModelText: conversiones de la spec 005 (RF-3)', () => {
  it('convierte comillas tipográficas, guiones largos, puntos suspensivos y corchetes', () => {
    expect(convertModelText('“Señor Juez” — digo… [sic]')).toBe('"Señor Juez" - digo... (sic)');
  });

  it('convierte las tabulaciones en un espacio y elimina los invisibles', () => {
    expect(convertModelText(`uno\tdos da${ZERO_WIDTH_SPACE}ño`)).toBe('uno dos daño');
  });

  it('convierte \\r\\n en \\n y reduce los espacios repetidos dentro de una línea', () => {
    expect(convertModelText('Primer   párrafo.\r\nSegundo  párrafo.')).toBe(
      'Primer párrafo.\nSegundo párrafo.',
    );
  });
});

describe('convertModelText: líneas (RF-3, RF-5)', () => {
  it('quita los espacios al inicio y al final de cada línea', () => {
    expect(convertModelText('Señor Juez:  \n    Primer párrafo.  \n\t Segundo párrafo.')).toBe(
      'Señor Juez:\nPrimer párrafo.\nSegundo párrafo.',
    );
  });

  it('conserva las líneas en blanco intermedias', () => {
    expect(convertModelText('Primer párrafo.\n\n\nSegundo párrafo.')).toBe(
      'Primer párrafo.\n\n\nSegundo párrafo.',
    );
  });

  it('una línea que solo tiene espacios queda como una línea en blanco', () => {
    expect(convertModelText('uno\n   \ndos')).toBe('uno\n\ndos');
  });

  it('quita los espacios y los saltos de línea de los extremos', () => {
    expect(convertModelText(' \n\n  Texto del modelo.  \n \n')).toBe('Texto del modelo.');
  });

  it('deja vacío un texto que solo tiene espacios y saltos de línea', () => {
    expect(convertModelText('  \n \t \n  ')).toBe('');
  });

  it('no toca una línea para completar hecha con guiones bajos', () => {
    expect(convertModelText('Firma: __________')).toBe('Firma: __________');
  });
});

describe('hasOnlyModelTextCharacters (RF-4)', () => {
  it('acepta letras con tilde, ñ y ü, números, espacios y saltos de línea', () => {
    expect(hasOnlyModelTextCharacters('Señor Juez:\n\nPingüino Pérez, 2026.')).toBe(true);
  });

  it.each(ALLOWED_TEXT_SYMBOLS.split(' '))('acepta el símbolo %j', (symbol) => {
    expect(hasOnlyModelTextCharacters(`texto ${symbol} texto`)).toBe(true);
  });

  it('los símbolos permitidos son los de los movimientos más @', () => {
    const movementSymbols = ALLOWED_TEXT_SYMBOLS.split(' ').filter((symbol) => symbol !== '@');
    expect(movementSymbols).toHaveLength(ALLOWED_TEXT_SYMBOLS.split(' ').length - 1);
    for (const symbol of movementSymbols) {
      expect(hasOnlyMovementCharacters(`texto ${symbol} texto`)).toBe(true);
    }
  });

  it('acepta un email como texto fijo', () => {
    expect(hasOnlyModelTextCharacters('Domicilio electrónico: estudio@ejemplo.com')).toBe(true);
  });

  it.each(['<', '>', '{', '}', '[', ']', '\\', '|', '=', '*', '+', '`', '😀', '\t'])(
    'rechaza %j',
    (character) => {
      expect(hasOnlyModelTextCharacters(`texto ${character} texto`)).toBe(false);
    },
  );

  it.each(['<', '>', '{', '}', '\\', '|', '=', '*', '+', '`', '😀'])(
    'después de convertir, %j se sigue rechazando',
    (character) => {
      expect(hasOnlyModelTextCharacters(convertModelText(`texto ${character} texto`))).toBe(false);
    },
  );

  it('ningún texto aceptado contiene corchetes: siempre llegan convertidos', () => {
    const converted = convertModelText('[a] [[b]] ]c[');
    expect(converted).not.toMatch(/[[\]]/);
    expect(hasOnlyModelTextCharacters(converted)).toBe(true);
  });

  it('un texto pegado desde un procesador de textos queda aceptado', () => {
    const pasted =
      '\tSeñor Juez:\r\n\r\n\t“#ACTORES#”, por derecho propio… [sic]\r\n\t• Domicilio: estudio@ejemplo.com';
    const converted = convertModelText(pasted);
    expect(converted).toBe(
      'Señor Juez:\n\n"#ACTORES#", por derecho propio... (sic)\n- Domicilio: estudio@ejemplo.com',
    );
    expect(hasOnlyModelTextCharacters(converted)).toBe(true);
  });
});

describe('@ fuera del texto de un modelo (RF-4)', () => {
  it('el título, con los caracteres de la spec 002, lo rechaza', () => {
    expect(hasOnlyCausaCharacters('Oficio a estudio@ejemplo.com')).toBe(false);
  });

  it('la descripción, con los caracteres de la spec 003, lo rechaza', () => {
    expect(hasOnlyMovementCharacters('Para enviar a estudio@ejemplo.com')).toBe(false);
  });
});

describe('largo del texto (RF-1, RF-3)', () => {
  it('50.000 caracteres entran y 50.001 no', () => {
    expect(textLength(convertModelText('a'.repeat(50_000)))).toBe(MAX_TEXTO_LENGTH);
    expect(textLength(convertModelText('a'.repeat(50_001)))).toBeGreaterThan(MAX_TEXTO_LENGTH);
  });

  it('cada salto de línea cuenta como un carácter', () => {
    expect(textLength(convertModelText('uno\r\ndos'))).toBe(7);
  });

  it('el largo se cuenta después de convertir: 49.999 caracteres con un "…" quedan en 50.001', () => {
    const texto = `${'a'.repeat(49_998)}…`;
    expect(textLength(texto)).toBe(49_999);
    expect(textLength(convertModelText(texto))).toBe(50_001);
  });

  it('la sangría que se quita no cuenta para el largo', () => {
    const texto = `${' '.repeat(10)}${'a'.repeat(50_000)}`;
    expect(textLength(convertModelText(texto))).toBe(MAX_TEXTO_LENGTH);
  });
});
