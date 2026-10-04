import { describe, expect, it } from 'vitest';
import {
  caseKey,
  documentOf,
  hasSameDocument,
  hasSameName,
  isSamePerson,
  normalizeNameForComparison,
  partyIdentity,
  type CaseKeyData,
  type PartyIdentity,
  type PartySource,
} from './reglas-causas.js';

const ACTIVE_CASE: CaseKeyData = {
  activa: true,
  esIncidente: false,
  fuero: 'civil',
  juzgado: 'Juzgado Civil N° 3',
  numeroExpediente: '1234/2024',
};

const naturalPerson = (overrides: Partial<PartyIdentity> = {}): PartyIdentity => ({
  clienteId: null,
  tipoPersona: 'fisica',
  nombre: 'Juan',
  apellido: 'Pérez',
  razonSocial: null,
  dni: null,
  cuit: null,
  ...overrides,
});

const legalPerson = (overrides: Partial<PartyIdentity> = {}): PartyIdentity => ({
  clienteId: null,
  tipoPersona: 'juridica',
  nombre: null,
  apellido: null,
  razonSocial: 'Gómez S.A.',
  dni: null,
  cuit: null,
  ...overrides,
});

describe('caseKey (RF-8 a RF-10)', () => {
  it('arma la clave de una causa activa no incidente con número y juzgado', () => {
    expect(caseKey(ACTIVE_CASE)).toBe('civil|Juzgado Civil N° 3|1234/2024');
  });

  it.each<[string, Partial<CaseKeyData>]>([
    ['desactivada', { activa: false }],
    ['incidente', { esIncidente: true }],
    ['sin número', { numeroExpediente: null }],
    ['sin juzgado', { juzgado: null }],
  ])('no tiene clave si está %s', (_case, changes) => {
    expect(caseKey({ ...ACTIVE_CASE, ...changes })).toBeNull();
  });

  it('distingue el fuero', () => {
    expect(caseKey({ ...ACTIVE_CASE, fuero: 'familia' })).not.toBe(caseKey(ACTIVE_CASE));
  });

  it('no quita separadores del número: "1234-2024" no es "1234/2024"', () => {
    expect(caseKey({ ...ACTIVE_CASE, numeroExpediente: '1234-2024' })).not.toBe(
      caseKey(ACTIVE_CASE),
    );
  });
});

describe('partyIdentity (RF-14, RF-15)', () => {
  it('toma los datos propios de una parte no cliente', () => {
    const source: PartySource = {
      clienteId: null,
      tipoPersona: 'fisica',
      nombre: 'Juan',
      apellido: 'Pérez',
      razonSocial: null,
      dni: '30123456',
      cuit: null,
      cliente: null,
    };

    expect(partyIdentity(source)).toEqual(naturalPerson({ dni: '30123456' }));
  });

  it('toma de la cuenta los datos de una parte cliente persona física', () => {
    const source: PartySource = {
      clienteId: 7,
      tipoPersona: null,
      nombre: null,
      apellido: null,
      razonSocial: null,
      dni: null,
      cuit: null,
      cliente: {
        tipoPersona: 'fisica',
        razonSocial: null,
        dni: '30123456',
        cuit: null,
        usuario: { nombre: 'Juan', apellido: 'Pérez' },
      },
    };

    expect(partyIdentity(source)).toEqual(naturalPerson({ clienteId: 7, dni: '30123456' }));
  });

  it('en una parte cliente persona jurídica toma la razón social y no el contacto', () => {
    const source: PartySource = {
      clienteId: 8,
      tipoPersona: null,
      nombre: null,
      apellido: null,
      razonSocial: null,
      dni: null,
      cuit: null,
      cliente: {
        tipoPersona: 'juridica',
        razonSocial: 'Gómez S.A.',
        dni: null,
        cuit: '30712345671',
        usuario: { nombre: 'Laura', apellido: 'Contacto' },
      },
    };

    expect(partyIdentity(source)).toEqual(legalPerson({ clienteId: 8, cuit: '30712345671' }));
  });

  it('exige la cuenta cargada en una parte cliente', () => {
    expect(() =>
      partyIdentity({
        clienteId: 7,
        tipoPersona: null,
        nombre: null,
        apellido: null,
        razonSocial: null,
        dni: null,
        cuit: null,
        cliente: null,
      }),
    ).toThrow();
  });
});

describe('documentos (RF-16, RF-18)', () => {
  it('documentOf devuelve el DNI o el CUIT, o null si no tiene', () => {
    expect(documentOf(naturalPerson({ dni: '30123456' }))).toBe('30123456');
    expect(documentOf(legalPerson({ cuit: '30712345671' }))).toBe('30712345671');
    expect(documentOf(naturalPerson())).toBeNull();
  });

  it('iguala una parte cliente con una no cliente del mismo DNI', () => {
    expect(
      hasSameDocument(
        naturalPerson({ clienteId: 7, dni: '30123456' }),
        naturalPerson({ nombre: 'Otro', dni: '30123456' }),
      ),
    ).toBe(true);
  });

  it('no iguala documentos distintos ni partes sin documento', () => {
    expect(
      hasSameDocument(naturalPerson({ dni: '30123456' }), naturalPerson({ dni: '30123457' })),
    ).toBe(false);
    expect(hasSameDocument(naturalPerson(), naturalPerson())).toBe(false);
  });
});

describe('isSamePerson (RF-18)', () => {
  it('es la misma persona si es el mismo cliente', () => {
    expect(isSamePerson(naturalPerson({ clienteId: 7 }), naturalPerson({ clienteId: 7 }))).toBe(
      true,
    );
  });

  it('es la misma persona si tiene el mismo DNI o CUIT', () => {
    expect(
      isSamePerson(
        legalPerson({ clienteId: 8, cuit: '30712345671' }),
        legalPerson({ razonSocial: 'Otra S.R.L.', cuit: '30712345671' }),
      ),
    ).toBe(true);
  });

  it('no alcanza con el nombre: eso es una pregunta (RF-19), no un rechazo', () => {
    expect(isSamePerson(naturalPerson(), naturalPerson())).toBe(false);
  });

  it('clientes distintos no son la misma persona', () => {
    expect(isSamePerson(naturalPerson({ clienteId: 7 }), naturalPerson({ clienteId: 9 }))).toBe(
      false,
    );
  });
});

describe('nombres (RF-19)', () => {
  it('normaliza mayúsculas, tildes, ñ, ü y espacios de los extremos', () => {
    expect(normalizeNameForComparison('  Núñez Güemes ')).toBe('nunez guemes');
    expect(normalizeNameForComparison('Pérez')).toBe('perez');
  });

  it('compara nombre y apellido de personas físicas sin distinguir mayúsculas ni tildes', () => {
    expect(hasSameName(naturalPerson(), naturalPerson({ nombre: 'JUAN', apellido: 'perez' }))).toBe(
      true,
    );
    expect(hasSameName(naturalPerson(), naturalPerson({ nombre: 'Juana' }))).toBe(false);
    expect(hasSameName(naturalPerson(), naturalPerson({ apellido: 'Perez Gómez' }))).toBe(false);
  });

  it('compara la razón social de personas jurídicas', () => {
    expect(hasSameName(legalPerson(), legalPerson({ razonSocial: 'GOMEZ s.a.' }))).toBe(true);
    expect(hasSameName(legalPerson(), legalPerson({ razonSocial: 'Gómez S.R.L.' }))).toBe(false);
  });

  it('una persona física y una jurídica nunca tienen el mismo nombre', () => {
    expect(hasSameName(naturalPerson(), legalPerson({ razonSocial: 'Juan Pérez' }))).toBe(false);
  });
});
