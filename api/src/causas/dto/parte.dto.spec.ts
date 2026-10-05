import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { formatValidationErrors } from '../../configuracion/errores-de-validacion.js';
import {
  CreateParteDto,
  PARTE_MESSAGES,
  UpdateParteDto,
  validateCreateParte,
} from './parte.dto.js';
import { CAUSA_MESSAGES } from './reglas-causa.js';

type DtoClass<T> = new () => T;

/** Transforma y valida igual que el ValidationPipe global (whitelist + forbidNonWhitelisted). */
async function check<T extends object>(dto: DtoClass<T>, plain: object) {
  const instance = plainToInstance(dto, plain);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance, messages: formatValidationErrors(errors) };
}

const CLIENT_PARTY = { rol: 'actor', clienteId: 7 };
const NATURAL_PERSON = {
  rol: 'demandado',
  tipoPersona: 'fisica',
  nombre: 'Juan',
  apellido: 'Pérez',
};
const LEGAL_PERSON = { rol: 'tercero', tipoPersona: 'juridica', razonSocial: 'Gómez S.A.' };

describe('CreateParteDto (RF-13 a RF-15)', () => {
  it.each([
    ['una parte cliente', CLIENT_PARTY],
    ['una persona física sin DNI', NATURAL_PERSON],
    ['una persona física con DNI', { ...NATURAL_PERSON, dni: '30123456' }],
    ['una persona jurídica sin CUIT', LEGAL_PERSON],
    ['una persona jurídica con CUIT', { ...LEGAL_PERSON, cuit: '30712345671' }],
    [
      'las respuestas a las preguntas',
      {
        ...NATURAL_PERSON,
        confirmarDocumentoDeCliente: true,
        confirmarNombreRepetido: false,
        confirmarNombreDeCliente: true,
      },
    ],
    [
      'una parte cliente con la respuesta a la pregunta de nombre',
      { ...CLIENT_PARTY, confirmarNombreRepetido: true },
    ],
  ])('acepta %s', async (_case, plain) => {
    expect((await check(CreateParteDto, plain)).messages).toEqual([]);
  });

  it.each(['actor', 'demandado', 'tercero', 'otro'])('acepta el rol %s', async (rol) => {
    expect((await check(CreateParteDto, { ...NATURAL_PERSON, rol })).messages).toEqual([]);
  });

  it('normaliza DNI y CUIT y recorta los nombres (RF-15)', async () => {
    const natural = await check(CreateParteDto, {
      ...NATURAL_PERSON,
      nombre: '  Juan ',
      dni: '30.123.456',
    });
    const legal = await check(CreateParteDto, { ...LEGAL_PERSON, cuit: '30-71234567-1' });

    expect(natural.messages).toEqual([]);
    expect(natural.instance.nombre).toBe('Juan');
    expect(natural.instance.dni).toBe('30123456');
    expect(legal.messages).toEqual([]);
    expect(legal.instance.cuit).toBe('30712345671');
  });

  it('trata un DNI vacío como no informado', async () => {
    const { instance, messages } = await check(CreateParteDto, { ...NATURAL_PERSON, dni: ' ' });

    expect(messages).toEqual([]);
    expect(instance.dni).toBeNull();
  });

  it.each([
    ['falta el rol', { ...NATURAL_PERSON, rol: undefined }, PARTE_MESSAGES.rol],
    ['el rol no existe', { ...NATURAL_PERSON, rol: 'querellante' }, PARTE_MESSAGES.rol],
    ['el cliente no es un id', { ...CLIENT_PARTY, clienteId: 'siete' }, PARTE_MESSAGES.clienteId],
    [
      'no es cliente y falta el tipo de persona',
      { rol: 'actor' },
      PARTE_MESSAGES.tipoPersonaRequired,
    ],
    [
      'el tipo de persona no existe',
      { ...NATURAL_PERSON, tipoPersona: 'otra' },
      'El tipo de persona debe ser fisica o juridica',
    ],
    [
      'a una persona física le falta el nombre',
      { ...NATURAL_PERSON, nombre: ' ' },
      'El nombre es obligatorio',
    ],
    [
      'a una persona física le falta el apellido',
      { ...NATURAL_PERSON, apellido: undefined },
      'El apellido es obligatorio',
    ],
    [
      'el nombre es largo',
      { ...NATURAL_PERSON, nombre: 'a'.repeat(56) },
      'El nombre no puede tener más de 55 caracteres',
    ],
    ['el DNI no es válido', { ...NATURAL_PERSON, dni: '123' }, 'El DNI debe tener 7 u 8 dígitos'],
    [
      'una persona física trae razón social',
      { ...NATURAL_PERSON, razonSocial: 'Pérez S.A.' },
      'La razón social solo corresponde a personas jurídicas',
    ],
    [
      'una persona física trae CUIT',
      { ...NATURAL_PERSON, cuit: '30712345671' },
      'El CUIT solo corresponde a personas jurídicas',
    ],
    [
      'a una persona jurídica le falta la razón social',
      { ...LEGAL_PERSON, razonSocial: undefined },
      'La razón social es obligatoria para personas jurídicas',
    ],
    [
      'la razón social es larga',
      { ...LEGAL_PERSON, razonSocial: 'a'.repeat(56) },
      'La razón social no puede tener más de 55 caracteres',
    ],
    [
      'el CUIT no es válido',
      { ...LEGAL_PERSON, cuit: '30712345672' },
      'El CUIT debe tener 11 dígitos y un dígito verificador válido',
    ],
    [
      'una persona jurídica trae nombre',
      { ...LEGAL_PERSON, nombre: 'Juan' },
      'El nombre solo corresponde a personas físicas',
    ],
    [
      'una persona jurídica trae DNI',
      { ...LEGAL_PERSON, dni: '30123456' },
      'El DNI solo corresponde a personas físicas',
    ],
    [
      'una parte cliente trae tipo de persona',
      { ...CLIENT_PARTY, tipoPersona: 'fisica' },
      PARTE_MESSAGES.clientOwnData,
    ],
    [
      'una parte cliente trae nombre',
      { ...CLIENT_PARTY, nombre: 'Juan' },
      PARTE_MESSAGES.clientOwnData,
    ],
    [
      'una parte cliente trae DNI',
      { ...CLIENT_PARTY, dni: '30123456' },
      PARTE_MESSAGES.clientOwnData,
    ],
    [
      'una respuesta no es booleana',
      { ...NATURAL_PERSON, confirmarNombreDeCliente: 'si' },
      CAUSA_MESSAGES.confirmation,
    ],
    [
      'trae un campo desconocido',
      { ...NATURAL_PERSON, vigente: false },
      'El campo vigente no está permitido',
    ],
  ])('rechaza si %s', async (_case, plain, message) => {
    expect((await check(CreateParteDto, plain)).messages).toEqual([message]);
  });
});

describe('UpdateParteDto (RF-16, RF-21)', () => {
  it.each([
    ['solo el rol', { rol: 'tercero' }],
    ['los datos completos de una parte no cliente', NATURAL_PERSON],
    ['la conversión en parte cliente', { rol: 'actor', clienteId: 7 }],
  ])('acepta %s', async (_case, plain) => {
    expect((await check(UpdateParteDto, plain)).messages).toEqual([]);
  });

  it('exige el tipo de persona si se envían datos propios', async () => {
    expect((await check(UpdateParteDto, { rol: 'actor', nombre: 'Juan' })).messages).toEqual([
      PARTE_MESSAGES.tipoPersonaRequired,
    ]);
  });

  it('valida los datos propios igual que el alta', async () => {
    expect(
      (await check(UpdateParteDto, { ...LEGAL_PERSON, cuit: '30712345672' })).messages,
    ).toEqual(['El CUIT debe tener 11 dígitos y un dígito verificador válido']);
    expect((await check(UpdateParteDto, { ...CLIENT_PARTY, nombre: 'Juan' })).messages).toEqual([
      PARTE_MESSAGES.clientOwnData,
    ]);
  });

  it('exige el rol', async () => {
    expect((await check(UpdateParteDto, {})).messages).toEqual([PARTE_MESSAGES.rol]);
  });
});

describe('validateCreateParte (RF-7)', () => {
  it('devuelve la parte transformada si es válida', async () => {
    const result = await validateCreateParte({ ...NATURAL_PERSON, dni: '30.123.456' });

    expect(result.messages).toEqual([]);
    expect(result.parte).toBeInstanceOf(CreateParteDto);
    expect(result.parte?.dni).toBe('30123456');
  });

  it('devuelve los mensajes sin lanzar excepciones si no es válida', async () => {
    const result = await validateCreateParte({ rol: 'querellante', tipoPersona: 'fisica' });

    expect(result.parte).toBeNull();
    expect(result.messages).toEqual([
      PARTE_MESSAGES.rol,
      'El nombre es obligatorio',
      'El apellido es obligatorio',
    ]);
  });

  it('rechaza campos desconocidos como el ValidationPipe', async () => {
    const result = await validateCreateParte({ ...CLIENT_PARTY, extra: 1 });

    expect(result.parte).toBeNull();
    expect(result.messages).toEqual(['El campo extra no está permitido']);
  });

  it.each([null, 'Juan', 3, ['actor']])('rechaza %j porque no es un objeto', async (raw) => {
    expect(await validateCreateParte(raw)).toEqual({
      parte: null,
      messages: [CAUSA_MESSAGES.parteObject],
    });
  });
});
