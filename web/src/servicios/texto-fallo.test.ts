import { describe, expect, it } from 'vitest';
import {
  convertText,
  flexibleKey,
  hasOnlySingleLineCharacters as hasOnlyCausaCharacters,
  hasOnlySumarioCharacters as hasOnlyMovementCharacters,
  linkDomain,
  linkViolation,
  MAX_SUMARIO_LENGTH,
  textLength,
  uniqueKeywords,
} from './texto-fallo';

// Los mismos casos que los tests de la API (api/src/jurisprudencia/validadores y
// reglas-jurisprudencia.spec.ts): si una tabla o una regla cambia de un solo lado, falla.

const singleLine = (value: string) => convertText(value, { multilinea: false });
const multiline = (value: string) => convertText(value, { multilinea: true });

describe('convertText: tabla de conversiones (RF-3)', () => {
  it.each([
    ['“', '"'],
    ['”', '"'],
    ['„', '"'],
    ['‟', '"'],
    ['«', '"'],
    ['»', '"'],
    ['″', '"'],
    ['‘', "'"],
    ['’', "'"],
    ['‚', "'"],
    ['‛', "'"],
    ['‹', "'"],
    ['›', "'"],
    ['′', "'"],
    ['´', "'"],
    ['‐', '-'],
    ['‑', '-'],
    ['‒', '-'],
    ['–', '-'],
    ['—', '-'],
    ['―', '-'],
    ['−', '-'],
    ['•', '-'],
    ['◦', '-'],
    ['‣', '-'],
    ['▪', '-'],
    ['…', '...'],
    ['№', 'Nº'],
    ['[', '('],
    [']', ')'],
  ])('convierte %j en %j', (from, to) => {
    expect(singleLine(`a${from}b`)).toBe(`a${to}b`);
    expect(multiline(`a${from}b`)).toBe(`a${to}b`);
  });

  it.each([
    ['espacio de no separación', '\u00A0'],
    ['espacio ogam', '\u1680'],
    ['espacio en', '\u2000'],
    ['espacio fino', '\u2009'],
    ['espacio ultrafino', '\u200A'],
    ['espacio estrecho de no separación', '\u202F'],
    ['espacio matemático', '\u205F'],
    ['espacio ideográfico', '\u3000'],
    ['tabulación', '\t'],
  ])('convierte el %s en un espacio', (_name, space) => {
    expect(singleLine(`a${space}b`)).toBe('a b');
    expect(multiline(`a${space}b`)).toBe('a b');
  });

  it('convierte una cita recortada entre corchetes en paréntesis', () => {
    expect(multiline('El tribunal sostuvo que "[...] corresponde indemnizar"')).toBe(
      'El tribunal sostuvo que "(...) corresponde indemnizar"',
    );
  });
});

describe('convertText: signo de párrafo (RF-3)', () => {
  it('convierte §§ en "párrs." antes que § en "párr."', () => {
    expect(singleLine('§§ 4 y 5')).toBe('párrs. 4 y 5');
    expect(singleLine('§ 3')).toBe('párr. 3');
  });

  it('agrega un espacio si lo sigue un carácter que no es un espacio', () => {
    expect(singleLine('§3')).toBe('párr. 3');
    expect(singleLine('§§4')).toBe('párrs. 4');
  });

  it('no deja doble espacio cuando ya lo sigue un espacio', () => {
    expect(singleLine('ver § 3')).toBe('ver párr. 3');
  });

  it('no agrega un espacio al final del texto ni antes de un salto de línea', () => {
    expect(singleLine('ver §')).toBe('ver párr.');
    expect(multiline('ver §\nsigue')).toBe('ver párr.\nsigue');
  });
});

describe('convertText: invisibles y saltos de línea (RF-3)', () => {
  it.each([
    ['espacio de ancho cero', '\u200B'],
    ['no unión de ancho cero', '\u200C'],
    ['unión de ancho cero', '\u200D'],
    ['unión de palabras', '\u2060'],
    ['guion de corte opcional', '\u00AD'],
    ['marca de orden de bytes', '\uFEFF'],
  ])('elimina el %s', (_name, invisible) => {
    expect(singleLine(`da${invisible}ño`)).toBe('daño');
    expect(multiline(`da${invisible}ño`)).toBe('daño');
  });

  it('convierte los separadores de línea y de párrafo Unicode en saltos de línea', () => {
    expect(multiline('uno\u2028dos\u2029tres')).toBe('uno\ndos\ntres');
  });

  it('convierte \\r\\n y \\r en \\n', () => {
    expect(multiline('uno\r\ndos\rtres')).toBe('uno\ndos\ntres');
  });

  it('en una sola línea, cada salto de línea pasa a ser un espacio', () => {
    expect(singleLine('Pérez c/ López\ns/ daños')).toBe('Pérez c/ López s/ daños');
    expect(singleLine('Pérez\r\nLópez\u2028García')).toBe('Pérez López García');
  });

  it('une una letra y su tilde combinable en un solo carácter (NFC)', () => {
    // "e" seguida de la tilde combinable (U+0301).
    const decomposed = `Pe${String.fromCharCode(0x301)}rez`;
    expect(decomposed).toHaveLength(6);
    expect(singleLine(decomposed)).toBe('Pérez');
  });
});

describe('convertText: espacios (RF-3)', () => {
  it('reduce a uno los espacios repetidos y recorta los extremos en una sola línea', () => {
    expect(singleLine('  CNCiv.   Sala  A  ')).toBe('CNCiv. Sala A');
  });

  it('una carátula pegada en dos líneas con espacios queda con un solo espacio', () => {
    expect(singleLine('Pérez c/ López  \n  s/ daños')).toBe('Pérez c/ López s/ daños');
  });

  it('en multilínea conserva los saltos de línea y las líneas en blanco', () => {
    expect(multiline('Primer párrafo.\n\n\nSegundo párrafo.')).toBe(
      'Primer párrafo.\n\n\nSegundo párrafo.',
    );
  });

  it('en multilínea reduce los espacios repetidos dentro de cada línea', () => {
    expect(multiline('Primer   párrafo.\n\nSegundo  \t párrafo.')).toBe(
      'Primer párrafo.\n\nSegundo párrafo.',
    );
  });

  it('en multilínea quita los espacios y saltos de línea de los extremos', () => {
    expect(multiline(' \n \r\n Sumario del fallo. \n\n ')).toBe('Sumario del fallo.');
  });

  it('deja vacío un texto que solo tiene espacios, invisibles y saltos de línea', () => {
    expect(singleLine(' \u00A0\t\u200B\n ')).toBe('');
    expect(multiline(' \u00A0\t\u200B\n ')).toBe('');
  });
});

describe('convertText con las reglas de caracteres de las specs 002 y 003 (RF-3 a RF-5)', () => {
  it('un sumario pegado de una base jurídica queda aceptado', () => {
    const pasted =
      '“La responsabilidad objetiva…” — CNCiv., Sala A, §3.\r\n\r\n\t• Ver [...] el considerando 5º.';
    const converted = multiline(pasted);
    // La tabulación y la viñeta del principio de la línea quedan como " -": solo se recortan
    // los extremos del texto completo, no los de cada línea.
    expect(converted).toBe(
      '"La responsabilidad objetiva..." - CNCiv., Sala A, párr. 3.\n\n - Ver (...) el considerando 5º.',
    );
    expect(hasOnlyMovementCharacters(converted)).toBe(true);
  });

  it('una carátula pegada con comillas y guiones tipográficos queda aceptada', () => {
    const converted = singleLine('“Pérez” c/ López – s/ daños № 3');
    expect(converted).toBe('"Pérez" c/ López - s/ daños Nº 3');
    expect(hasOnlyCausaCharacters(converted)).toBe(true);
  });

  it.each(['<', '>', '{', '}', '\\', '|', '=', '`', '😀'])(
    'después de convertir, %j se sigue rechazando',
    (character) => {
      expect(hasOnlyMovementCharacters(multiline(`texto ${character} texto`))).toBe(false);
      expect(hasOnlyCausaCharacters(singleLine(`texto ${character} texto`))).toBe(false);
    },
  );

  it('ningún texto aceptado contiene corchetes: siempre llegan convertidos', () => {
    const converted = multiline('[a] [[b]] ]c[');
    expect(converted).not.toMatch(/[[\]]/);
    expect(hasOnlyMovementCharacters(converted)).toBe(true);
  });

  it('el largo se cuenta después de convertir: 4.999 caracteres con un "…" quedan en 5.001', () => {
    const sumario = `${'a'.repeat(4998)}…`;
    expect(textLength(sumario)).toBe(4999);
    const converted = multiline(sumario);
    expect(textLength(converted)).toBe(5001);
    expect(textLength(converted)).toBeGreaterThan(MAX_SUMARIO_LENGTH);
  });
});

describe('linkViolation: enlaces aceptados (RF-6)', () => {
  it.each([
    'https://sjconsulta.csjn.gov.ar/sjconsulta/documentos/verDocumentoById.html?idDocumento=7867721',
    'https://www.saij.gob.ar/buscador?r=fallo&o=1#resultados',
    'https://www.pjn.gov.ar/fallos/da%C3%B1o-moral',
    'https://csjn.gov.ar',
    'https://csjn.gov.ar/',
    'https://juba.scba.gov.ar/Busquedas.aspx?a=1&b=(2)*3,4;5:6!7$8+9~_',
    'https://sub-dominio.ejemplo.com.ar/Ruta/Con/Mayusculas',
  ])('acepta %s', (enlace) => {
    expect(linkViolation(enlace)).toBeNull();
  });

  it('recorta los espacios de los extremos antes de validar', () => {
    expect(linkViolation('  https://csjn.gov.ar/fallos  ')).toBeNull();
  });
});

describe('linkViolation: esquema (RF-6)', () => {
  it.each([
    'http://csjn.gov.ar',
    'HTTPS://csjn.gov.ar',
    'Https://csjn.gov.ar',
    'javascript:alert(1)',
    'ftp://csjn.gov.ar',
    'csjn.gov.ar',
    '',
  ])('rechaza %j por el esquema', (enlace) => {
    expect(linkViolation(enlace)).toBe('esquema');
  });
});

describe('linkViolation: formato (RF-6)', () => {
  it.each([
    ['solo el esquema', 'https://'],
    ['un dominio sin punto', 'https://localhost/fallo'],
    ['mayúsculas en el dominio', 'https://www.CSJN.gov.ar/fallo'],
    ['usuario antes del dominio', 'https://csjn.gov.ar@sitio-falso.com/fallo'],
    ['@ en la ruta', 'https://csjn.gov.ar/fallo@otro'],
    ['una dirección IP', 'https://190.12.34.56/fallo'],
    ['un puerto', 'https://sitio.com:8443/fallo'],
    ['un dominio en punycode', 'https://xn--csjn-9qa.com/fallo'],
    ['una parte en punycode en el medio', 'https://www.xn--fallos-4ya.gov.ar'],
    ['una parte que empieza con guion', 'https://-csjn.gov.ar'],
    ['una parte que termina con guion', 'https://csjn-.gov.ar'],
    ['una parte vacía', 'https://csjn..gov.ar'],
    ['un espacio en el medio', 'https://csjn.gov.ar/fallo nuevo'],
    ['comillas dobles', 'https://csjn.gov.ar/?q="><script>'],
    ['comillas simples', "https://csjn.gov.ar/?q='x'"],
    ['<', 'https://csjn.gov.ar/<script>'],
    ['>', 'https://csjn.gov.ar/a>b'],
    ['llaves', 'https://csjn.gov.ar/{x}'],
    ['corchetes', 'https://csjn.gov.ar/[x]'],
    ['|', 'https://csjn.gov.ar/a|b'],
    ['barra invertida', 'https://csjn.gov.ar/a\\b'],
    ['^', 'https://csjn.gov.ar/a^b'],
    ['acento grave', 'https://csjn.gov.ar/a`b'],
    ['un emoji', 'https://csjn.gov.ar/😀'],
    ['una letra con tilde', 'https://csjn.gov.ar/daño'],
    ['una letra con tilde en el dominio', 'https://dañomoral.com.ar'],
  ])('rechaza %s', (_caso, enlace) => {
    expect(linkViolation(enlace)).toBe('formato');
  });
});

describe('flexibleKey: comparación flexible (RF-9, RF-11)', () => {
  it.each([
    ['Daño Moral', 'dano moral'],
    ['Daño Moral', 'DANO MORAL'],
    ['año', 'ano'],
    ['pingüino', 'pinguino'],
    ['Responsabilidad Médica', 'responsabilidad medica'],
    ['daño  moral', 'daño moral'],
    [' daño moral ', 'daño moral'],
    ['“daño” moral', '"daño" moral'],
  ])('%j y %j tienen la misma clave', (a, b) => {
    expect(flexibleKey(a)).toBe(flexibleKey(b));
  });

  it('"daño-moral" y "daño moral" tienen claves distintas', () => {
    expect(flexibleKey('daño-moral')).not.toBe(flexibleKey('daño moral'));
  });

  it('la clave está en minúsculas, sin tildes, diéresis ni ñ', () => {
    expect(flexibleKey('Ñandú Güemes ÁÉÍÓÚ')).toBe('nandu guemes aeiou');
  });
});

describe('uniqueKeywords (RF-14)', () => {
  it('descarta las repetidas por comparación flexible y conserva la primera aparición', () => {
    expect(
      uniqueKeywords(['Daño moral', 'accidente', 'dano moral', 'DAÑO MORAL', 'Accidente']),
    ).toEqual(['Daño moral', 'accidente']);
  });

  it('conserva el orden de las distintas', () => {
    expect(uniqueKeywords(['c', 'a', 'b'])).toEqual(['c', 'a', 'b']);
  });

  it('una lista vacía queda vacía', () => {
    expect(uniqueKeywords([])).toEqual([]);
  });
});

describe('linkDomain (RF-19)', () => {
  it('devuelve el dominio de un enlace con ruta y parámetros', () => {
    expect(
      linkDomain(
        'https://sjconsulta.csjn.gov.ar/sjconsulta/documentos/verDocumentoById.html?idDocumento=7867721',
      ),
    ).toBe('sjconsulta.csjn.gov.ar');
  });

  it('devuelve el dominio de un enlace sin ruta', () => {
    expect(linkDomain('https://www.csjn.gov.ar')).toBe('www.csjn.gov.ar');
    expect(linkDomain('  https://www.csjn.gov.ar#inicio  ')).toBe('www.csjn.gov.ar');
  });

  it.each([
    'http://csjn.gov.ar',
    'https://csjn.gov.ar@sitio-falso.com/fallo',
    'https://190.12.34.56/fallo',
    'https://csjn.gov.ar/?q="x"',
    '',
  ])('devuelve null para %j: no se muestra como enlace', (enlace) => {
    expect(linkDomain(enlace)).toBeNull();
  });
});
