import { describe, expect, it } from 'vitest';
import type { CausaDetalle, ParteDetalle } from './causas';
import {
  allowedCharactersMessage,
  buildCreateCausaData,
  buildPartyData,
  buildUpdateCausaData,
  type CausaForm,
  causaFormFrom,
  EMPTY_CAUSA_FORM,
  EMPTY_PARTY_FORM,
  type PartyForm,
  partyFormFrom,
  validateCausaForm,
  validatePartyForm,
} from './formulario-causa';

const VALID_CAUSA: CausaForm = {
  ...EMPTY_CAUSA_FORM,
  caratula: 'Pérez, Juan c/ Gómez S.A. s/ daños',
  fuero: 'civil',
};

const NATURAL_PERSON: PartyForm = {
  ...EMPTY_PARTY_FORM,
  modo: 'noCliente',
  rol: 'actor',
  tipoPersona: 'fisica',
  nombre: 'Juan',
  apellido: 'Pérez',
};

function detail(overrides: Partial<CausaDetalle> = {}): CausaDetalle {
  return {
    id: 7,
    caratula: 'Pérez c/ Gómez',
    numeroExpediente: '1234/2024',
    juzgado: 'Juzgado Civil N° 3',
    fuero: 'civil',
    estado: 'en_tramite',
    esIncidente: false,
    expedientePrincipal: null,
    activa: true,
    responsable: { id: 1, nombre: 'Juan', apellido: 'Álvarez', rol: 'abogado', activo: true },
    creadoEn: '2026-10-01T13:00:00.000Z',
    modificadoEn: null,
    colaboradores: [],
    partes: [],
    partesDesvinculadas: [],
    creadoPor: null,
    modificadoPor: null,
    desactivadaPor: null,
    desactivadaEn: null,
    reactivadaPor: null,
    reactivadaEn: null,
    ...overrides,
  };
}

describe('formulario de causa (RF-1, RF-3 a RF-5, RF-10)', () => {
  it('el formulario vacío arranca en trámite y sin fuero elegido', () => {
    expect(EMPTY_CAUSA_FORM).toMatchObject({ estado: 'en_tramite', fuero: '', esIncidente: false });
  });

  it('acepta una causa con los datos obligatorios', () => {
    expect(validateCausaForm(VALID_CAUSA)).toEqual([]);
  });

  it.each<[string, Partial<CausaForm>, string]>([
    ['falta la carátula', { caratula: '   ' }, 'La carátula es obligatoria'],
    [
      'la carátula es larga',
      { caratula: 'a'.repeat(256) },
      'La carátula no puede tener más de 255 caracteres',
    ],
    [
      'la carátula tiene un emoji',
      { caratula: 'Pérez 😀' },
      allowedCharactersMessage('La carátula'),
    ],
    [
      'el número es largo',
      { numeroExpediente: '1'.repeat(51) },
      'El número de expediente no puede tener más de 50 caracteres',
    ],
    [
      'el número tiene un asterisco',
      { numeroExpediente: '12*3' },
      allowedCharactersMessage('El número de expediente'),
    ],
    [
      'el juzgado es largo',
      { juzgado: 'a'.repeat(151) },
      'El juzgado no puede tener más de 150 caracteres',
    ],
    [
      'falta el fuero',
      { fuero: '' },
      'El fuero debe ser civil, penal, familia, laboral, federal u otro',
    ],
    [
      'es incidente sin expediente principal',
      { esIncidente: true },
      'Indicá el número del expediente principal',
    ],
    [
      'el expediente principal es largo',
      { esIncidente: true, expedientePrincipal: '1'.repeat(51) },
      'El número del expediente principal no puede tener más de 50 caracteres',
    ],
  ])('rechaza si %s', (_case, changes, message) => {
    expect(validateCausaForm({ ...VALID_CAUSA, ...changes })).toEqual([message]);
  });

  it('acepta letras con tilde, ñ, ü, los símbolos permitidos y una tilde combinable', () => {
    expect(
      validateCausaForm({
        ...VALID_CAUSA,
        caratula: 'Muñoz y Güemes c/ Pérez s/ "daños" (art. 1.234); $ & # _ \' ° º ª -',
      }),
    ).toEqual([]);
  });

  it('ignora el expediente principal si no es incidente', () => {
    expect(validateCausaForm({ ...VALID_CAUSA, expedientePrincipal: '😀' })).toEqual([]);
  });

  describe('alta (RF-6)', () => {
    it('envía los datos recortados, sin los opcionales vacíos', () => {
      const data = buildCreateCausaData(
        { ...VALID_CAUSA, caratula: '  Pérez c/ Gómez ', numeroExpediente: ' ', juzgado: '' },
        { responsableId: 1, colaboradorIds: [2] },
        [{ rol: 'actor', clienteId: 5 }],
      );

      expect(data).toEqual({
        caratula: 'Pérez c/ Gómez',
        fuero: 'civil',
        estado: 'en_tramite',
        esIncidente: false,
        responsableId: 1,
        colaboradorIds: [2],
        partes: [{ rol: 'actor', clienteId: 5 }],
      });
    });

    it('envía el número, el juzgado y el expediente principal de un incidente', () => {
      const data = buildCreateCausaData(
        {
          ...VALID_CAUSA,
          numeroExpediente: ' 1234/2024 ',
          juzgado: 'Juzgado Civil N° 3',
          esIncidente: true,
          expedientePrincipal: ' 1000/2023 ',
        },
        { responsableId: 1, colaboradorIds: [] },
        [],
      );

      expect(data).toMatchObject({
        numeroExpediente: '1234/2024',
        juzgado: 'Juzgado Civil N° 3',
        esIncidente: true,
        expedientePrincipal: '1000/2023',
      });
    });
  });

  describe('edición (RF-11)', () => {
    it('arma el formulario a partir de la causa', () => {
      expect(causaFormFrom(detail({ juzgado: null }))).toEqual({
        caratula: 'Pérez c/ Gómez',
        numeroExpediente: '1234/2024',
        juzgado: '',
        fuero: 'civil',
        estado: 'en_tramite',
        esIncidente: false,
        expedientePrincipal: '',
      });
    });

    it('envía solo lo que cambió, y null para un opcional vaciado', () => {
      const causa = detail();
      const form = { ...causaFormFrom(causa), estado: 'finalizada' as const, juzgado: '  ' };

      expect(buildUpdateCausaData(form, causa)).toEqual({ estado: 'finalizada', juzgado: null });
    });

    it('sin cambios no envía nada', () => {
      const causa = detail();

      expect(buildUpdateCausaData(causaFormFrom(causa), causa)).toEqual({});
    });

    it('al marcar como incidente envía el expediente principal; al desmarcar, solo la marca', () => {
      const causa = detail();
      const marked = { ...causaFormFrom(causa), esIncidente: true, expedientePrincipal: '1/2020' };
      expect(buildUpdateCausaData(marked, causa)).toEqual({
        esIncidente: true,
        expedientePrincipal: '1/2020',
      });

      const incident = detail({ esIncidente: true, expedientePrincipal: '1/2020' });
      const unmarked = { ...causaFormFrom(incident), esIncidente: false };
      expect(buildUpdateCausaData(unmarked, incident)).toEqual({ esIncidente: false });
    });
  });
});

describe('formulario de parte (RF-13 a RF-15)', () => {
  it('acepta una parte cliente con el cliente elegido', () => {
    expect(validatePartyForm({ ...EMPTY_PARTY_FORM, modo: 'cliente', clienteId: 5 })).toEqual([]);
  });

  it('exige elegir el cliente', () => {
    expect(validatePartyForm({ ...EMPTY_PARTY_FORM, modo: 'cliente' })).toEqual([
      'Elegí el cliente',
    ]);
  });

  it('acepta una persona física o jurídica no cliente, con o sin documento', () => {
    expect(validatePartyForm(NATURAL_PERSON)).toEqual([]);
    expect(validatePartyForm({ ...NATURAL_PERSON, dni: '30.123.456' })).toEqual([]);
    expect(
      validatePartyForm({
        ...NATURAL_PERSON,
        tipoPersona: 'juridica',
        razonSocial: 'Gómez S.A.',
        cuit: '30-71234567-1',
      }),
    ).toEqual([]);
  });

  it.each<[string, Partial<PartyForm>, string[]]>([
    [
      'faltan nombre y apellido',
      { nombre: ' ', apellido: '' },
      ['El nombre es obligatorio', 'El apellido es obligatorio'],
    ],
    [
      'el nombre es largo',
      { nombre: 'a'.repeat(56) },
      ['El nombre no puede tener más de 55 caracteres'],
    ],
    ['el DNI no es válido', { dni: '123' }, ['El DNI debe tener 7 u 8 dígitos']],
    [
      'a una jurídica le falta la razón social',
      { tipoPersona: 'juridica' },
      ['La razón social es obligatoria para personas jurídicas'],
    ],
    [
      'el CUIT no es válido',
      { tipoPersona: 'juridica', razonSocial: 'Gómez S.A.', cuit: '30712345672' },
      ['El CUIT debe tener 11 dígitos y un dígito verificador válido'],
    ],
  ])('rechaza si %s', (_case, changes, messages) => {
    expect(validatePartyForm({ ...NATURAL_PERSON, ...changes })).toEqual(messages);
  });

  describe('datos para la API', () => {
    it('una parte cliente envía solo el rol y el cliente', () => {
      expect(
        buildPartyData({ ...NATURAL_PERSON, modo: 'cliente', rol: 'demandado', clienteId: 5 }),
      ).toEqual({ rol: 'demandado', clienteId: 5 });
    });

    it('una persona física envía nombre, apellido y el DNI normalizado si lo tiene', () => {
      expect(
        buildPartyData({
          ...NATURAL_PERSON,
          nombre: ' Juan ',
          dni: '30.123.456',
          razonSocial: 'x',
        }),
      ).toEqual({
        rol: 'actor',
        tipoPersona: 'fisica',
        nombre: 'Juan',
        apellido: 'Pérez',
        dni: '30123456',
      });
      expect(buildPartyData(NATURAL_PERSON)).not.toHaveProperty('dni');
    });

    it('una persona jurídica envía la razón social y el CUIT normalizado si lo tiene', () => {
      expect(
        buildPartyData({
          ...NATURAL_PERSON,
          tipoPersona: 'juridica',
          razonSocial: 'Gómez S.A.',
          cuit: '30-71234567-1',
        }),
      ).toEqual({
        rol: 'actor',
        tipoPersona: 'juridica',
        razonSocial: 'Gómez S.A.',
        cuit: '30712345671',
      });
    });
  });

  it('arma el formulario a partir de una parte existente', () => {
    const nonClient: ParteDetalle = {
      id: 3,
      rol: 'tercero',
      esCliente: false,
      clienteId: null,
      clienteActivo: null,
      tipoPersona: 'fisica',
      nombre: 'Juan',
      apellido: 'Pérez',
      razonSocial: null,
      dni: '30123456',
      cuit: null,
    };

    expect(partyFormFrom(nonClient)).toEqual({
      modo: 'noCliente',
      rol: 'tercero',
      clienteId: null,
      tipoPersona: 'fisica',
      nombre: 'Juan',
      apellido: 'Pérez',
      razonSocial: '',
      dni: '30123456',
      cuit: '',
    });
    expect(partyFormFrom({ ...nonClient, esCliente: true, clienteId: 5 })).toMatchObject({
      modo: 'cliente',
      clienteId: 5,
    });
  });
});
