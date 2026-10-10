import { describe, expect, it } from 'vitest';
import { allowedCharactersMessage as singleLineCharactersMessage } from './formulario-causa';
import {
  addKeyword,
  buildCreateRulingData,
  buildUpdateRulingData,
  convertedSumarioLength,
  EMPTY_RULING_FILTERS,
  EMPTY_RULING_FORM,
  FALLO_MESSAGES,
  removeKeyword,
  type RulingFilters,
  type RulingForm,
  rulingFormFrom,
  todayInBuenosAires,
  toListQuery,
  validateRulingFilters,
  validateRulingForm,
} from './formulario-fallo';
import { allowedCharactersMessage as sumarioCharactersMessage } from './formulario-movimiento';
import type { FalloDetalle } from './jurisprudencia';

// 15/06/2026 a las 15:00 en Buenos Aires.
const NOW = new Date('2026-06-15T18:00:00Z');

const VALID: RulingForm = {
  caratula: 'Pérez c/ López s/ daños',
  tribunal: 'CNCiv., Sala A',
  fuero: 'civil',
  fecha: '2019-05-03',
  numero: '1234/2018',
  sumario: 'La responsabilidad del dueño de la cosa es objetiva.',
  palabrasClave: ['daño moral', 'accidente de tránsito'],
  enlace: 'https://www.csjn.gov.ar/fallos/1234',
};

const RULING = {
  id: 5,
  caratula: 'Pérez c/ López s/ daños',
  tribunal: 'CNCiv., Sala A',
  fuero: 'civil',
  fecha: '2019-05-03',
  numero: '1234/2018',
  sumario: 'La responsabilidad del dueño de la cosa es objetiva.',
  palabrasClave: [
    { id: 2, texto: 'accidente de tránsito' },
    { id: 1, texto: 'daño moral' },
  ],
  enlace: 'https://www.csjn.gov.ar/fallos/1234',
  activo: true,
} as FalloDetalle;

const validate = (changes: Partial<RulingForm>) =>
  validateRulingForm({ ...VALID, ...changes }, NOW);

describe('todayInBuenosAires (RF-7)', () => {
  it('devuelve el día de Buenos Aires como AAAA-MM-DD', () => {
    expect(todayInBuenosAires(NOW)).toBe('2026-06-15');
  });

  it('cambia de día a las 03:00 UTC', () => {
    expect(todayInBuenosAires(new Date('2026-06-16T02:59:00Z'))).toBe('2026-06-15');
    expect(todayInBuenosAires(new Date('2026-06-16T03:00:00Z'))).toBe('2026-06-16');
  });
});

describe('validateRulingForm (RF-1, RF-3 a RF-8, RF-14)', () => {
  it('acepta un formulario completo y uno sin número ni enlace', () => {
    expect(validateRulingForm(VALID, NOW)).toEqual([]);
    expect(validate({ numero: '', enlace: '' })).toEqual([]);
  });

  it('el formulario vacío informa cada dato obligatorio, en el orden de los campos', () => {
    expect(validateRulingForm(EMPTY_RULING_FORM, NOW)).toEqual([
      FALLO_MESSAGES.caratulaRequired,
      FALLO_MESSAGES.tribunalRequired,
      FALLO_MESSAGES.fuero,
      FALLO_MESSAGES.fechaRequired,
      FALLO_MESSAGES.sumarioRequired,
      FALLO_MESSAGES.keywordsRequired,
    ]);
  });

  it('acepta los textos que la conversión deja válidos (RF-3)', () => {
    expect(
      validate({
        caratula: '“Pérez” c/ López – s/ daños',
        sumario: '“La responsabilidad…” [...] §3',
        palabrasClave: ['“daño” moral'],
      }),
    ).toEqual([]);
  });

  it.each([
    ['la carátula solo con espacios', { caratula: '   ' }, FALLO_MESSAGES.caratulaRequired],
    [
      'una carátula de 256 caracteres',
      { caratula: 'a'.repeat(256) },
      'La carátula no puede tener más de 255 caracteres',
    ],
    ['< en la carátula', { caratula: 'Pérez <b>' }, singleLineCharactersMessage('La carátula')],
    [
      'un tribunal de 151 caracteres',
      { tribunal: 'a'.repeat(151) },
      'El tribunal no puede tener más de 150 caracteres',
    ],
    ['= en el tribunal', { tribunal: 'Sala=A' }, singleLineCharactersMessage('El tribunal')],
    [
      'un número de 51 caracteres',
      { numero: '1'.repeat(51) },
      'El número no puede tener más de 50 caracteres',
    ],
    ['{ en el número', { numero: '12{3}' }, singleLineCharactersMessage('El número')],
    [
      'un sumario de 5.001 caracteres',
      { sumario: 'a'.repeat(5001) },
      FALLO_MESSAGES.sumarioTooLong,
    ],
    [
      'un sumario de 4.999 caracteres y un "…"',
      { sumario: `${'a'.repeat(4998)}…` },
      FALLO_MESSAGES.sumarioTooLong,
    ],
    ['un emoji en el sumario', { sumario: 'Fallo 😀' }, sumarioCharactersMessage('El sumario')],
    ['| en el sumario', { sumario: 'a | b' }, sumarioCharactersMessage('El sumario')],
  ])('rechaza %s con el mensaje de la API', (_case, changes, message) => {
    expect(validate(changes)).toEqual([message]);
  });

  it('acepta un sumario de exactamente 5.000 caracteres', () => {
    expect(validate({ sumario: 'a'.repeat(5000) })).toEqual([]);
  });

  it.each([
    ['con formato dd/mm/aaaa', '03/05/2019', FALLO_MESSAGES.fechaInvalid],
    ['inexistente', '2023-02-29', FALLO_MESSAGES.fechaInvalid],
    ['anterior al 01/01/1800', '1799-12-31', FALLO_MESSAGES.fechaBeforeMin],
    ['de mañana', '2026-06-16', FALLO_MESSAGES.fechaFuture],
  ])('rechaza una fecha %s', (_case, fecha, message) => {
    expect(validate({ fecha })).toEqual([message]);
  });

  it.each(['1800-01-01', '1887-05-03', '2026-06-15'])('acepta la fecha %s', (fecha) => {
    expect(validate({ fecha })).toEqual([]);
  });

  it.each([
    [
      '11 palabras clave distintas',
      Array.from({ length: 11 }, (_, index) => `palabra ${index}`),
      FALLO_MESSAGES.keywordsMax,
    ],
    ['una palabra clave vacía', ['daño', '  '], FALLO_MESSAGES.keywordEmpty],
    ['una palabra clave de 51 caracteres', ['a'.repeat(51)], FALLO_MESSAGES.keywordTooLong],
    ['< en una palabra clave', ['daño <moral>'], singleLineCharactersMessage('La palabra clave')],
  ])('rechaza %s', (_case, palabrasClave, message) => {
    expect(validate({ palabrasClave })).toEqual([message]);
  });

  it('las palabras clave repetidas cuentan una sola vez para el máximo (RF-14)', () => {
    const diez = Array.from({ length: 10 }, (_, index) => `palabra ${index}`);
    expect(validate({ palabrasClave: [...diez, 'PALABRA 0', 'palábra 1'] })).toEqual([]);
  });

  it.each([
    ['http://', 'http://csjn.gov.ar', FALLO_MESSAGES.linkScheme],
    ['HTTPS://', 'HTTPS://csjn.gov.ar', FALLO_MESSAGES.linkScheme],
    ['usuario antes del dominio', 'https://csjn.gov.ar@sitio-falso.com', FALLO_MESSAGES.linkFormat],
    ['comillas', 'https://csjn.gov.ar/?q="x"', FALLO_MESSAGES.linkFormat],
    ['501 caracteres', `https://csjn.gov.ar/${'a'.repeat(481)}`, FALLO_MESSAGES.linkTooLong],
  ])('rechaza un enlace con %s', (_case, enlace, message) => {
    expect(validate({ enlace })).toEqual([message]);
  });
});

describe('convertedSumarioLength (RF-3)', () => {
  it('cuenta el largo después de convertir', () => {
    expect(convertedSumarioLength('  hola  mundo  ')).toBe(10);
    expect(convertedSumarioLength('a…')).toBe(4);
    expect(convertedSumarioLength('uno\r\ndos')).toBe(7);
  });
});

describe('palabras clave del formulario (RF-14)', () => {
  it('agrega una palabra convertida', () => {
    expect(addKeyword(['daño moral'], '  “culpa”  grave ')).toEqual([
      'daño moral',
      '"culpa" grave',
    ]);
  });

  it('no repite una palabra igual por comparación flexible', () => {
    const palabras = ['daño moral'];
    expect(addKeyword(palabras, 'DANO  MORAL')).toEqual(['daño moral']);
    expect(addKeyword(['año judicial'], 'ano judicial')).toEqual(['año judicial']);
  });

  it('no agrega una palabra vacía', () => {
    expect(addKeyword(['daño moral'], '   ')).toEqual(['daño moral']);
  });

  it('quita una palabra', () => {
    expect(removeKeyword(['daño moral', 'culpa'], 'Dano Moral')).toEqual(['culpa']);
  });
});

describe('buildCreateRulingData (RF-16)', () => {
  it('arma los datos con los textos convertidos', () => {
    expect(
      buildCreateRulingData({
        ...VALID,
        caratula: '  “Pérez”  c/ López ',
        sumario: ' Primer párrafo.\r\n\r\nSegundo  párrafo… ',
        palabrasClave: ['Daño  moral', 'dano moral', 'culpa'],
        enlace: '  https://www.csjn.gov.ar/fallo  ',
      }),
    ).toEqual({
      caratula: '"Pérez" c/ López',
      tribunal: 'CNCiv., Sala A',
      fuero: 'civil',
      fecha: '2019-05-03',
      numero: '1234/2018',
      sumario: 'Primer párrafo.\n\nSegundo párrafo...',
      palabrasClave: ['Daño moral', 'culpa'],
      enlace: 'https://www.csjn.gov.ar/fallo',
    });
  });

  it('el número y el enlace vacíos van como null', () => {
    const data = buildCreateRulingData({ ...VALID, numero: '  ', enlace: '' });
    expect(data.numero).toBeNull();
    expect(data.enlace).toBeNull();
  });
});

describe('edición (RF-12, RF-17)', () => {
  it('rulingFormFrom carga el formulario con los datos del fallo', () => {
    expect(rulingFormFrom(RULING)).toEqual({
      ...VALID,
      palabrasClave: ['accidente de tránsito', 'daño moral'],
    });
    expect(rulingFormFrom({ ...RULING, numero: null, enlace: null })).toMatchObject({
      numero: '',
      enlace: '',
    });
  });

  it('sin cambios no envía nada', () => {
    expect(buildUpdateRulingData(rulingFormFrom(RULING), RULING)).toEqual({});
  });

  it('el mismo conjunto de palabras clave en otro orden no es un cambio', () => {
    expect(
      buildUpdateRulingData(
        { ...rulingFormFrom(RULING), palabrasClave: ['daño moral', 'accidente de tránsito'] },
        RULING,
      ),
    ).toEqual({});
  });

  it('envía solo lo que cambió', () => {
    expect(
      buildUpdateRulingData(
        { ...rulingFormFrom(RULING), tribunal: 'CNCiv., Sala B', fecha: '2020-01-01' },
        RULING,
      ),
    ).toEqual({ tribunal: 'CNCiv., Sala B', fecha: '2020-01-01' });
  });

  it('el número y el enlace vaciados se envían como null', () => {
    expect(
      buildUpdateRulingData({ ...rulingFormFrom(RULING), numero: '', enlace: ' ' }, RULING),
    ).toEqual({ numero: null, enlace: null });
  });

  it('envía las palabras clave si cambió la lista o la forma de alguna', () => {
    const form = rulingFormFrom(RULING);

    expect(buildUpdateRulingData({ ...form, palabrasClave: ['daño moral'] }, RULING)).toEqual({
      palabrasClave: ['daño moral'],
    });
    expect(
      buildUpdateRulingData(
        { ...form, palabrasClave: ['Daño Moral', 'accidente de tránsito'] },
        RULING,
      ),
    ).toEqual({ palabrasClave: ['Daño Moral', 'accidente de tránsito'] });
  });
});

describe('filtros del listado (RF-24 a RF-26)', () => {
  const filters = (changes: Partial<RulingFilters>) =>
    validateRulingFilters({ ...EMPTY_RULING_FILTERS, ...changes }, NOW);

  it('los filtros vacíos son válidos', () => {
    expect(filters({})).toEqual([]);
  });

  it.each(['<script>', 'a=b', 'a{b}', 'a|b'])('rechaza la búsqueda %j', (buscar) => {
    expect(filters({ buscar })).toEqual([FALLO_MESSAGES.buscarCharacters]);
  });

  it('acepta una búsqueda con "[...]", % y _', () => {
    expect(filters({ buscar: '[...] 50% art_1' })).toEqual([]);
  });

  it('acepta 100 caracteres y rechaza 101', () => {
    expect(filters({ buscar: 'a'.repeat(100) })).toEqual([]);
    expect(filters({ buscar: 'a'.repeat(101) })).toEqual([FALLO_MESSAGES.buscarTooLong]);
  });

  it.each([
    ['inexistente', '2023-02-29', FALLO_MESSAGES.fechaInvalid],
    ['de 1790', '1790-01-01', FALLO_MESSAGES.fechaBeforeMin],
    ['futura', '2026-06-16', FALLO_MESSAGES.fechaFuture],
  ])('rechaza una fecha %s', (_case, fecha, message) => {
    expect(filters({ desde: fecha })).toEqual([message]);
    expect(filters({ hasta: fecha })).toEqual([message]);
  });

  it('rechaza desde posterior a hasta, y acepta que sean iguales', () => {
    expect(filters({ desde: '2020-01-02', hasta: '2020-01-01' })).toEqual([
      FALLO_MESSAGES.rangoInvertido,
    ]);
    expect(filters({ desde: '2020-01-01', hasta: '2020-01-01' })).toEqual([]);
  });

  it('toListQuery no envía los filtros vacíos', () => {
    expect(toListQuery(EMPTY_RULING_FILTERS, 1)).toEqual({ pagina: 1 });
    expect(toListQuery({ ...EMPTY_RULING_FILTERS, buscar: '   ' }, 2)).toEqual({ pagina: 2 });
  });

  it('toListQuery convierte la búsqueda y envía los ids de las palabras clave', () => {
    expect(
      toListQuery(
        {
          buscar: '  “daño”  moral ',
          palabrasClave: [
            { id: 3, texto: 'daño moral' },
            { id: 7, texto: 'culpa' },
          ],
          fuero: 'civil',
          desde: '2015-01-01',
          hasta: '2024-12-31',
          incluirDesactivados: true,
        },
        3,
      ),
    ).toEqual({
      pagina: 3,
      buscar: '"daño" moral',
      palabrasClave: [3, 7],
      fuero: 'civil',
      desde: '2015-01-01',
      hasta: '2024-12-31',
      incluirDesactivados: true,
    });
  });
});
