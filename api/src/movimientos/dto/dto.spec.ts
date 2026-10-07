import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { formatValidationErrors } from '../../configuracion/errores-de-validacion.js';
import { allowedCharactersMessage } from '../validadores/texto-movimiento.js';
import { CreateMovimientoDto } from './crear-movimiento.dto.js';
import { UpdateMovimientoDto } from './modificar-movimiento.dto.js';
import { MOVIMIENTO_MESSAGES } from './reglas-movimiento.js';

type DtoClass<T> = new () => T;

/** Transforma y valida igual que el ValidationPipe global (whitelist + forbidNonWhitelisted). */
async function check<T extends object>(dto: DtoClass<T>, plain: object) {
  const instance = plainToInstance(dto, plain);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance, messages: formatValidationErrors(errors) };
}

const MINIMAL = {
  fecha: '2024-03-01',
  tipo: 'providencia',
  descripcion: 'Se fija audiencia preliminar.',
};

const COMPLETE = {
  ...MINIMAL,
  textoCliente: 'El juez fijó una audiencia.',
  visible: true,
};

describe('CreateMovimientoDto', () => {
  it.each([
    ['solo los datos obligatorios', MINIMAL],
    ['todos los datos', COMPLETE],
  ])('acepta %s', async (_case, plain) => {
    expect((await check(CreateMovimientoDto, plain)).messages).toEqual([]);
  });

  it('normaliza los textos y convierte el texto para el cliente vacío en null (RF-3)', async () => {
    const { instance, messages } = await check(CreateMovimientoDto, {
      ...MINIMAL,
      descripcion: ' \r\n Primer párrafo.\r\n\r\nSegundo párrafo. \n ',
      textoCliente: '  \n  ',
    });

    expect(messages).toEqual([]);
    expect(instance.descripcion).toBe('Primer párrafo.\n\nSegundo párrafo.');
    expect(instance.textoCliente).toBeNull();
  });

  it.each([
    ['sin fecha', { fecha: undefined }, MOVIMIENTO_MESSAGES.fechaRequired],
    ['con la fecha vacía', { fecha: '' }, MOVIMIENTO_MESSAGES.fechaRequired],
    ['con la fecha null', { fecha: null }, MOVIMIENTO_MESSAGES.fechaRequired],
    ['con formato dd/mm/aaaa', { fecha: '01/03/2024' }, MOVIMIENTO_MESSAGES.fechaInvalid],
    ['con una fecha inexistente', { fecha: '2023-02-29' }, MOVIMIENTO_MESSAGES.fechaInvalid],
    ['con una fecha que no es texto', { fecha: 20240301 }, MOVIMIENTO_MESSAGES.fechaInvalid],
    ['con una fecha anterior a 1900', { fecha: '1899-12-31' }, MOVIMIENTO_MESSAGES.fechaRange],
    ['con una fecha posterior a 2099', { fecha: '2100-01-01' }, MOVIMIENTO_MESSAGES.fechaRange],
    ['sin tipo', { tipo: undefined }, MOVIMIENTO_MESSAGES.tipo],
    ['con un tipo fuera de la lista', { tipo: 'cedula' }, MOVIMIENTO_MESSAGES.tipo],
    ['sin descripción', { descripcion: undefined }, MOVIMIENTO_MESSAGES.descripcionRequired],
    ['con la descripción vacía', { descripcion: '' }, MOVIMIENTO_MESSAGES.descripcionRequired],
    [
      'con la descripción solo con espacios y saltos de línea',
      { descripcion: ' \n \r\n ' },
      MOVIMIENTO_MESSAGES.descripcionRequired,
    ],
    [
      'con la descripción larga',
      { descripcion: 'a'.repeat(2001) },
      'La descripción no puede tener más de 2000 caracteres',
    ],
    [
      'con el texto para el cliente largo',
      { textoCliente: 'a'.repeat(2001) },
      'El texto para el cliente no puede tener más de 2000 caracteres',
    ],
    [
      'con un emoji en la descripción',
      { descripcion: 'Providencia 😀' },
      allowedCharactersMessage('La descripción'),
    ],
    [
      'con < en el texto para el cliente',
      { textoCliente: '<script>alert(1)</script>' },
      allowedCharactersMessage('El texto para el cliente'),
    ],
    [
      'con una tabulación en la descripción',
      { descripcion: 'Providencia\tfirme' },
      allowedCharactersMessage('La descripción'),
    ],
    ['con la visibilidad como texto', { visible: 'si' }, MOVIMIENTO_MESSAGES.visible],
    ['con la visibilidad null', { visible: null }, MOVIMIENTO_MESSAGES.visible],
  ])('rechaza un movimiento %s', async (_case, override, message) => {
    expect((await check(CreateMovimientoDto, { ...MINIMAL, ...override })).messages).toEqual([
      message,
    ]);
  });

  it('acepta exactamente 2.000 caracteres', async () => {
    const { messages } = await check(CreateMovimientoDto, {
      ...MINIMAL,
      descripcion: 'a'.repeat(2000),
      textoCliente: 'b'.repeat(2000),
    });
    expect(messages).toEqual([]);
  });

  it.each(['anulado', 'causaId', 'creadoPorId'])('rechaza el campo %s', async (field) => {
    expect((await check(CreateMovimientoDto, { ...MINIMAL, [field]: 1 })).messages).toEqual([
      `El campo ${field} no está permitido`,
    ]);
  });

  it('ningún mensaje repite el valor recibido (RNF de registros)', async () => {
    const mark = 'MARCASECRETA';
    const { messages } = await check(CreateMovimientoDto, {
      fecha: `${mark}`,
      tipo: mark,
      descripcion: `${mark} <`,
      textoCliente: `${mark} ${'a'.repeat(2001)}`,
      visible: mark,
    });

    expect(messages).toHaveLength(5);
    for (const message of messages) expect(message).not.toContain(mark);
  });
});

describe('UpdateMovimientoDto (RF-11, RF-12)', () => {
  it('acepta un cuerpo vacío y cada dato por separado', async () => {
    expect((await check(UpdateMovimientoDto, {})).messages).toEqual([]);
    for (const [field, value] of Object.entries(COMPLETE)) {
      expect((await check(UpdateMovimientoDto, { [field]: value })).messages, field).toEqual([]);
    }
  });

  it.each([
    ['null', null],
    ['vacío', '  '],
  ])('borra el texto para el cliente si llega %s', async (_case, textoCliente) => {
    const { instance, messages } = await check(UpdateMovimientoDto, { textoCliente });
    expect(messages).toEqual([]);
    expect(instance.textoCliente).toBeNull();
  });

  it.each([
    ['la descripción vacía', { descripcion: '' }, MOVIMIENTO_MESSAGES.descripcionRequired],
    ['la descripción null', { descripcion: null }, MOVIMIENTO_MESSAGES.descripcionRequired],
    ['la fecha null', { fecha: null }, MOVIMIENTO_MESSAGES.fechaRequired],
    ['una fecha fuera de rango', { fecha: '2100-01-01' }, MOVIMIENTO_MESSAGES.fechaRange],
    ['un tipo fuera de la lista', { tipo: 'cedula' }, MOVIMIENTO_MESSAGES.tipo],
    ['la visibilidad null', { visible: null }, MOVIMIENTO_MESSAGES.visible],
  ])('rechaza %s', async (_case, plain, message) => {
    expect((await check(UpdateMovimientoDto, plain)).messages).toEqual([message]);
  });

  it.each(['causaId', 'anulado', 'id', 'creadoPorId'])(
    'rechaza el campo %s: un movimiento no cambia de causa ni se anula con PATCH',
    async (field) => {
      expect((await check(UpdateMovimientoDto, { [field]: 2 })).messages).toEqual([
        `El campo ${field} no está permitido`,
      ]);
    },
  );
});
