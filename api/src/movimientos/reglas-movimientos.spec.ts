import { describe, expect, it } from 'vitest';
import {
  diffMovement,
  isDateInRange,
  isExistingDate,
  isFutureDate,
  loadChanges,
  type MovementData,
  todayInBuenosAires,
  visibleText,
} from './reglas-movimientos.js';

const MOVEMENT: MovementData = {
  fecha: '2024-03-01',
  tipo: 'providencia',
  descripcion: 'Se fija audiencia preliminar.',
  textoCliente: null,
  visible: false,
  anulado: false,
};

describe('visibleText (RF-7)', () => {
  it('usa el texto para el cliente si está informado', () => {
    expect(visibleText({ ...MOVEMENT, textoCliente: 'El juez fijó audiencia.' })).toEqual({
      texto: 'El juez fijó audiencia.',
      origen: 'textoCliente',
    });
  });

  it('usa la descripción si no hay texto para el cliente', () => {
    expect(visibleText(MOVEMENT)).toEqual({
      texto: 'Se fija audiencia preliminar.',
      origen: 'descripcion',
    });
  });
});

describe('diffMovement (RF-20)', () => {
  it('no devuelve cambios si nada cambió', () => {
    expect(diffMovement(MOVEMENT, { ...MOVEMENT })).toEqual([]);
  });

  it.each([
    ['fecha', '2024-03-02'],
    ['tipo', 'resolucion'],
    ['descripcion', 'Otra descripción.'],
    ['textoCliente', 'Texto para el cliente.'],
    ['visible', true],
    ['anulado', true],
  ] as const)('detecta el cambio de %s', (campo, nuevo) => {
    expect(diffMovement(MOVEMENT, { ...MOVEMENT, [campo]: nuevo })).toEqual([
      { campo, anterior: MOVEMENT[campo], nuevo },
    ]);
  });

  it('devuelve varios cambios a la vez, en el orden de los campos', () => {
    expect(
      diffMovement(MOVEMENT, { ...MOVEMENT, visible: true, fecha: '2024-03-05', tipo: 'oficio' }),
    ).toEqual([
      { campo: 'fecha', anterior: '2024-03-01', nuevo: '2024-03-05' },
      { campo: 'tipo', anterior: 'providencia', nuevo: 'oficio' },
      { campo: 'visible', anterior: false, nuevo: true },
    ]);
  });

  it('registra el paso del texto para el cliente de un valor a NULL', () => {
    expect(
      diffMovement(
        { ...MOVEMENT, textoCliente: 'Texto anterior.' },
        { ...MOVEMENT, textoCliente: null },
      ),
    ).toEqual([{ campo: 'textoCliente', anterior: 'Texto anterior.', nuevo: null }]);
  });
});

describe('loadChanges (RF-20)', () => {
  it('registra todos los datos con anterior en null', () => {
    expect(loadChanges({ ...MOVEMENT, visible: true })).toEqual([
      { campo: 'fecha', anterior: null, nuevo: '2024-03-01' },
      { campo: 'tipo', anterior: null, nuevo: 'providencia' },
      { campo: 'descripcion', anterior: null, nuevo: 'Se fija audiencia preliminar.' },
      { campo: 'textoCliente', anterior: null, nuevo: null },
      { campo: 'visible', anterior: null, nuevo: true },
      { campo: 'anulado', anterior: null, nuevo: false },
    ]);
  });
});

describe('isExistingDate (RF-6)', () => {
  it.each(['2024-03-01', '2024-02-29', '2000-02-29', '1900-01-01', '2099-12-31', '0050-01-01'])(
    'acepta %s',
    (fecha) => {
      expect(isExistingDate(fecha)).toBe(true);
    },
  );

  it.each([
    ['31 de febrero', '2024-02-31'],
    ['29 de febrero de un año no bisiesto', '2023-02-29'],
    ['29 de febrero de 1900, que no fue bisiesto', '1900-02-29'],
    ['mes 13', '2024-13-01'],
    ['día 0', '2024-03-00'],
    ['formato dd/mm/aaaa', '01/03/2024'],
    ['sin ceros a la izquierda', '2024-3-1'],
    ['con hora', '2024-03-01T10:00:00'],
    ['año de cinco dígitos', '20240-03-01'],
    ['texto vacío', ''],
  ])('rechaza %s', (_case, fecha) => {
    expect(isExistingDate(fecha)).toBe(false);
  });
});

describe('isDateInRange (RF-5)', () => {
  it.each([
    ['1899-12-31', false],
    ['1900-01-01', true],
    ['2026-10-06', true],
    ['2099-12-31', true],
    ['2100-01-01', false],
  ])('%s → %s', (fecha, expected) => {
    expect(isDateInRange(fecha)).toBe(expected);
  });
});

describe('todayInBuenosAires e isFutureDate (RF-24)', () => {
  // 02:59 UTC del 6 de octubre son las 23:59 del 5 en Buenos Aires (UTC−3).
  const beforeMidnight = new Date('2026-10-06T02:59:00Z');
  const atMidnight = new Date('2026-10-06T03:00:00Z');

  it('el día cambia a las 00:00 de Buenos Aires, que son las 03:00 UTC', () => {
    expect(todayInBuenosAires(beforeMidnight)).toBe('2026-10-05');
    expect(todayInBuenosAires(atMidnight)).toBe('2026-10-06');
  });

  it('el día siguiente es fecha futura y el mismo día no', () => {
    expect(isFutureDate('2026-10-06', beforeMidnight)).toBe(true);
    expect(isFutureDate('2026-10-06', atMidnight)).toBe(false);
    expect(isFutureDate('2026-10-07', atMidnight)).toBe(true);
  });

  it('una fecha pasada no es futura', () => {
    expect(isFutureDate('1998-05-10', atMidnight)).toBe(false);
  });
});
