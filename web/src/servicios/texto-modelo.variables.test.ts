import { describe, expect, it } from 'vitest';
import { textLength } from './texto-fallo';
import {
  canonicalMarks,
  findMarks,
  hasJoinedMarks,
  insertVariable,
  isVariableName,
  replaceMarks,
  unknownVariables,
  usedVariables,
  variableKey,
  VARIABLES,
} from './texto-modelo';

// Los mismos casos que los tests de la API (api/src/modelos-escritos/variables.spec.ts): si el
// catálogo o una regla de las marcas cambia de un solo lado, falla.

describe('catálogo de variables (RF-9)', () => {
  it('tiene exactamente las variables de la spec, sin repetir', () => {
    const nombres = VARIABLES.map((variable) => variable.nombre);
    expect(nombres).toEqual([
      'CARATULA',
      'NUMERO_EXPEDIENTE',
      'JUZGADO',
      'FUERO',
      'EXPEDIENTE_PRINCIPAL',
      'ACTORES',
      'DEMANDADOS',
      'TERCEROS',
      'ACTORES_CON_DOCUMENTO',
      'DEMANDADOS_CON_DOCUMENTO',
      'TERCEROS_CON_DOCUMENTO',
      'CLIENTES',
      'CLIENTES_CON_DOCUMENTO',
      'CLIENTES_DOMICILIO',
      'ABOGADO_RESPONSABLE',
      'FECHA',
      'FECHA_EN_LETRAS',
    ]);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it('no tiene una variable para el integrante que completa el modelo (RF-38)', () => {
    expect(isVariableName('ABOGADO_QUE_COMPLETA')).toBe(false);
  });

  it('cada variable tiene su grupo y una descripción de lo que pone', () => {
    for (const variable of VARIABLES) {
      expect(['causa', 'partes', 'clientes', 'abogados', 'fecha']).toContain(variable.grupo);
      expect(variable.descripcion.trim()).not.toBe('');
    }
  });

  it('los nombres van en mayúsculas, sin tildes y con guion bajo entre palabras', () => {
    for (const variable of VARIABLES) {
      expect(variable.nombre).toMatch(/^[A-Z]+(_[A-Z]+)*$/);
    }
  });
});

describe('variableKey (RF-8)', () => {
  it.each(['caratula', 'Carátula', 'CARATULA', 'CARÁTULA', 'cArAtUlA'])(
    '%j es CARATULA',
    (nombre) => {
      expect(variableKey(nombre)).toBe('CARATULA');
    },
  );

  it('conserva los guiones bajos', () => {
    expect(variableKey('número_expediente')).toBe('NUMERO_EXPEDIENTE');
  });
});

describe('findMarks (RF-7)', () => {
  it('encuentra las marcas de izquierda a derecha, con su nombre y su clave', () => {
    const texto = 'Autos "#carátula#", Expte. #NUMERO_EXPEDIENTE#.';
    expect(findMarks(texto)).toEqual([
      { inicio: 7, fin: 17, nombre: 'carátula', clave: 'CARATULA' },
      { inicio: 27, fin: 46, nombre: 'NUMERO_EXPEDIENTE', clave: 'NUMERO_EXPEDIENTE' },
    ]);
    expect(texto.slice(7, 17)).toBe('#carátula#');
  });

  it('no pide un largo mínimo: una sola letra ya es un nombre', () => {
    expect(findMarks('local #A# y #b#').map((mark) => mark.clave)).toEqual(['A', 'B']);
  });

  it.each([
    ['un numeral suelto', 'local # 3 y local # 5'],
    ['números entre numerales', 'Expte. #123#'],
    ['solo guiones bajos', 'Firma: #____#'],
    ['un nombre con espacios', '# CARATULA #'],
    ['un nombre con un espacio en el medio', '#NUMERO EXPEDIENTE#'],
    ['un nombre con un dígito', '#ACTORES2#'],
    ['una marca partida por un salto de línea', '#NUMERO_\nEXPEDIENTE#'],
    ['una marca sin cerrar', 'ver #CARATULA y seguir'],
    ['un email', 'estudio@ejemplo.com'],
  ])('%s no es una marca', (_caso, texto) => {
    expect(findMarks(texto)).toEqual([]);
  });

  it('un nombre puede llevar guiones bajos en los extremos si tiene al menos una letra', () => {
    expect(findMarks('#_FECHA_#').map((mark) => mark.nombre)).toEqual(['_FECHA_']);
  });

  it('después de un texto que no es una marca, reconoce la marca que sigue', () => {
    expect(findMarks('#____#CARATULA#').map((mark) => mark.clave)).toEqual(['CARATULA']);
    expect(findMarks('# 3 #FECHA#').map((mark) => mark.clave)).toEqual(['FECHA']);
  });

  it('responde rápido con un numeral seguido de miles de letras sin cerrar', () => {
    const texto = `#${'a'.repeat(50_000)} ${'#b'.repeat(5_000)}`;
    const start = performance.now();
    findMarks(texto);
    hasJoinedMarks(texto);
    expect(performance.now() - start).toBeLessThan(500);
  });
});

describe('canonicalMarks (RF-8)', () => {
  it.each(['#caratula#', '#Carátula#', '#CARATULA#'])('%s queda como #CARATULA#', (marca) => {
    expect(canonicalMarks(`Autos "${marca}".`)).toBe('Autos "#CARATULA#".');
  });

  it('no cambia el largo del texto', () => {
    const texto = 'En #fecha_en_letras#, #clientes_con_documento# dice: #carátula#.';
    expect(textLength(canonicalMarks(texto))).toBe(textLength(texto));
  });

  it('deja igual el resto del texto, incluidos los numerales que no son marcas', () => {
    const texto = 'Local # 3, Expte. #123#,\nfirma #____# y email estudio@ejemplo.com';
    expect(canonicalMarks(texto)).toBe(texto);
  });

  it('deja como se escribió una marca que no existe en el catálogo', () => {
    expect(canonicalMarks('#caratual# y #fecha#')).toBe('#caratual# y #FECHA#');
  });
});

describe('hasJoinedMarks (RF-7)', () => {
  it.each(['#ACTORES##DEMANDADOS#', '#ACTORES#DEMANDADOS#', '#actores#demandados#terceros#'])(
    '%s tiene marcas pegadas',
    (texto) => {
      expect(hasJoinedMarks(`Entre ${texto} y otros.`)).toBe(true);
    },
  );

  it.each([
    '#ACTORES# #DEMANDADOS#',
    '#ACTORES#, #DEMANDADOS#',
    '#ACTORES#/#DEMANDADOS#',
    '#ACTORES#\n#DEMANDADOS#',
    '#ACTORES#',
    '#ACTORES#____#',
    '#____#ACTORES#',
    'sin ninguna marca',
  ])('%j no tiene marcas pegadas', (texto) => {
    expect(hasJoinedMarks(texto)).toBe(false);
  });
});

describe('unknownVariables (RF-10)', () => {
  it('devuelve las marcas que no están en el catálogo, sin repetir y en orden', () => {
    const texto = '#CARATUAL# de #DEMANDADO#, #A#, otra vez #caratual# y #FECHA#';
    expect(unknownVariables(texto)).toEqual(['CARATUAL', 'DEMANDADO', 'A']);
  });

  it('no devuelve nada si todas las marcas existen o si no hay marcas', () => {
    expect(unknownVariables('#CARATULA# del #fecha#')).toEqual([]);
    expect(unknownVariables('Texto fijo, local # 3.')).toEqual([]);
  });
});

describe('usedVariables (RF-12, RF-16)', () => {
  it('devuelve las variables del catálogo que usa el texto, sin repetir y en orden', () => {
    const texto = '#FECHA#: #actores# c/ #DEMANDADOS#. #Fecha#, #CARATUAL#.';
    expect(usedVariables(texto)).toEqual(['FECHA', 'ACTORES', 'DEMANDADOS']);
  });

  it('devuelve una lista vacía en un texto sin marcas', () => {
    expect(usedVariables('Texto fijo, sin variables.')).toEqual([]);
  });
});

describe('replaceMarks', () => {
  it('reemplaza cada marca con lo que devuelve la función, que recibe su clave', () => {
    const escrito = replaceMarks('#fecha#: #ACTORES# y #ACTORES#.', (clave) => `<${clave}>`);
    expect(escrito).toBe('<FECHA>: <ACTORES> y <ACTORES>.');
  });

  it('no vuelve a examinar lo que insertó', () => {
    expect(replaceMarks('#CARATULA#', () => '#FECHA# y $& y $1')).toBe('#FECHA# y $& y $1');
  });
});

describe('insertVariable (RF-11)', () => {
  it('inserta la marca al principio del texto', () => {
    expect(insertVariable('Señor Juez:', 0, 0, 'FECHA')).toEqual({
      texto: '#FECHA#Señor Juez:',
      cursor: 7,
    });
  });

  it('inserta la marca en el medio, donde está el cursor', () => {
    expect(insertVariable('Autos "", digo:', 7, 7, 'CARATULA')).toEqual({
      texto: 'Autos "#CARATULA#", digo:',
      cursor: 17,
    });
  });

  it('inserta la marca al final', () => {
    expect(insertVariable('Ante ', 5, 5, 'JUZGADO')).toEqual({
      texto: 'Ante #JUZGADO#',
      cursor: 14,
    });
  });

  it('reemplaza el texto seleccionado', () => {
    expect(insertVariable('Ante el juzgado, digo:', 5, 15, 'JUZGADO')).toEqual({
      texto: 'Ante #JUZGADO#, digo:',
      cursor: 14,
    });
  });

  it('inserta en un texto vacío', () => {
    expect(insertVariable('', 0, 0, 'ACTORES')).toEqual({ texto: '#ACTORES#', cursor: 9 });
  });

  it('con una posición fuera del texto, inserta al final', () => {
    expect(insertVariable('Ante ', 99, 99, 'JUZGADO').texto).toBe('Ante #JUZGADO#');
  });
});
