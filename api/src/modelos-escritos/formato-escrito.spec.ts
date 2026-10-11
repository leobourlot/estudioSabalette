import { describe, expect, it } from 'vitest';
import type { PartyIdentity } from '../causas/reglas-causas.js';
import {
  comparePeople,
  formatCuit,
  formatDate,
  formatDateInWords,
  formatDni,
  joinPeople,
  personName,
  personSortKeys,
} from './formato-escrito.js';

const person = (nombre: string, apellido: string): PartyIdentity => ({
  clienteId: null,
  tipoPersona: 'fisica',
  nombre,
  apellido,
  razonSocial: null,
  dni: null,
  cuit: null,
});

const company = (razonSocial: string): PartyIdentity => ({
  clienteId: null,
  tipoPersona: 'juridica',
  nombre: null,
  apellido: null,
  razonSocial,
  dni: null,
  cuit: null,
});

describe('personName (RF-34)', () => {
  it('escribe a una persona física como nombre y apellido, en ese orden', () => {
    expect(personName(person('Luis', 'Gómez'))).toBe('Luis Gómez');
  });

  it('escribe a una persona jurídica con su razón social', () => {
    expect(personName(company('Acme S.A.'))).toBe('Acme S.A.');
  });

  it('conserva las tildes y las mayúsculas tal como están cargadas', () => {
    expect(personName(person('MARÍA JOSÉ', 'de la Peña'))).toBe('MARÍA JOSÉ de la Peña');
  });
});

describe('formatDni y formatCuit (RF-35)', () => {
  it.each([
    ['20111222', 'DNI 20.111.222'],
    ['5123456', 'DNI 5.123.456'],
    ['05123456', 'DNI 05.123.456'],
  ])('el DNI %s se escribe %s', (dni, expected) => {
    expect(formatDni(dni)).toBe(expected);
  });

  it('el CUIT se escribe con guiones', () => {
    expect(formatCuit('30712345678')).toBe('CUIT 30-71234567-8');
  });
});

describe('joinPeople (RF-36)', () => {
  it('una sola persona va sola, sin "y"', () => {
    expect(joinPeople(['Luis Gómez'], false)).toBe('Luis Gómez');
    expect(joinPeople(['Luis Gómez, DNI 20.111.222'], true)).toBe('Luis Gómez, DNI 20.111.222');
  });

  it('dos personas van unidas solo por "y", con o sin detalle', () => {
    expect(joinPeople(['Luis Gómez', 'María López'], false)).toBe('Luis Gómez y María López');
    expect(joinPeople(['Luis Gómez, DNI 20.111.222', 'María López, DNI 27.333.444'], true)).toBe(
      'Luis Gómez, DNI 20.111.222 y María López, DNI 27.333.444',
    );
  });

  it('tres o más nombres van separados por comas, con "y" antes del último', () => {
    expect(joinPeople(['Acme S.A.', 'Luis Gómez', 'María López'], false)).toBe(
      'Acme S.A., Luis Gómez y María López',
    );
    expect(joinPeople(['a', 'b', 'c', 'd'], false)).toBe('a, b, c y d');
  });

  it('tres o más con detalle van separados por punto y coma, con "y" antes del último', () => {
    expect(
      joinPeople(
        [
          'Acme S.A., CUIT 30-71234567-8',
          'Luis Gómez, DNI 20.111.222',
          'María López, DNI 27.333.444',
        ],
        true,
      ),
    ).toBe(
      'Acme S.A., CUIT 30-71234567-8; Luis Gómez, DNI 20.111.222; y María López, DNI 27.333.444',
    );
  });

  it('sin personas devuelve un texto vacío', () => {
    expect(joinPeople([], false)).toBe('');
  });
});

describe('orden de las personas (RF-36)', () => {
  const sorted = (people: { id: number; identity: PartyIdentity }[]) =>
    people
      .map(({ id, identity }) => ({ id, ...personSortKeys(identity), name: personName(identity) }))
      .sort(comparePeople)
      .map((row) => row.name);

  it('ordena por apellido y después por nombre', () => {
    expect(
      sorted([
        { id: 1, identity: person('María', 'López') },
        { id: 2, identity: person('Luis', 'Gómez') },
        { id: 3, identity: person('Ana', 'López') },
      ]),
    ).toEqual(['Luis Gómez', 'Ana López', 'María López']);
  });

  it('ordena las razones sociales junto con los apellidos', () => {
    expect(
      sorted([
        { id: 1, identity: person('María', 'López') },
        { id: 2, identity: company('Acme S.A.') },
        { id: 3, identity: person('Luis', 'Gómez') },
        { id: 4, identity: company('Hierros del Sur S.R.L.') },
      ]),
    ).toEqual(['Acme S.A.', 'Luis Gómez', 'Hierros del Sur S.R.L.', 'María López']);
  });

  it('no distingue mayúsculas, minúsculas ni tildes', () => {
    expect(
      sorted([
        { id: 1, identity: person('Zoe', 'álvarez') },
        { id: 2, identity: person('Ana', 'ALVAREZ') },
        { id: 3, identity: person('Luis', 'Alvarez') },
      ]),
    ).toEqual(['Ana ALVAREZ', 'Luis Alvarez', 'Zoe álvarez']);
  });

  it('a igual nombre, primero la parte que se cargó antes', () => {
    const rows = [
      { id: 9, ...personSortKeys(person('Luis', 'Gómez')) },
      { id: 4, ...personSortKeys(person('LUIS', 'GOMEZ')) },
      { id: 7, ...personSortKeys(person('Luis', 'Gómez')) },
    ];
    expect(rows.sort(comparePeople).map((row) => row.id)).toEqual([4, 7, 9]);
  });
});

describe('fechas (RF-9)', () => {
  it('formatDate escribe el día como dd/mm/aaaa', () => {
    expect(formatDate('2026-10-10')).toBe('10/10/2026');
    expect(formatDate('2026-03-01')).toBe('01/03/2026');
  });

  it('formatDateInWords escribe el día sin cero inicial y el mes en minúsculas', () => {
    expect(formatDateInWords('2026-10-10')).toBe('10 de octubre de 2026');
    expect(formatDateInWords('2026-03-01')).toBe('1 de marzo de 2026');
    expect(formatDateInWords('2026-12-31')).toBe('31 de diciembre de 2026');
  });

  it.each([
    ['01', 'enero'],
    ['02', 'febrero'],
    ['03', 'marzo'],
    ['04', 'abril'],
    ['05', 'mayo'],
    ['06', 'junio'],
    ['07', 'julio'],
    ['08', 'agosto'],
    ['09', 'septiembre'],
    ['10', 'octubre'],
    ['11', 'noviembre'],
    ['12', 'diciembre'],
  ])('el mes %s es %s', (mes, nombre) => {
    expect(formatDateInWords(`2026-${mes}-15`)).toBe(`15 de ${nombre} de 2026`);
  });
});
