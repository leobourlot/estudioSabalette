import { describe, expect, it } from 'vitest';
import {
  allowedCharactersMessage,
  buildCreateMovementData,
  buildUpdateMovementData,
  EMPTY_MOVEMENT_FILTERS,
  EMPTY_MOVEMENT_FORM,
  MOVEMENT_MESSAGES,
  type MovementForm,
  movementFormFrom,
  toListQuery,
  validateMovementFilters,
  validateMovementForm,
} from './formulario-movimiento';
import type { MovimientoDetalle } from './movimientos';

const VALID: MovementForm = {
  fecha: '2024-03-01',
  tipo: 'providencia',
  descripcion: 'Se fija audiencia preliminar.',
  textoCliente: '',
  visible: false,
};

const MOVEMENT = {
  id: 7,
  causaId: 3,
  fecha: '2024-03-01',
  tipo: 'providencia',
  descripcion: 'Se fija audiencia preliminar.',
  textoCliente: 'El juez fijó audiencia.',
  visible: true,
} as MovimientoDetalle;

describe('validateMovementForm (RF-1, RF-3 a RF-6)', () => {
  it('el formulario vacío nace no visible (RF-8)', () => {
    expect(EMPTY_MOVEMENT_FORM.visible).toBe(false);
  });

  it('acepta un movimiento válido, con saltos de línea y los símbolos agregados', () => {
    expect(
      validateMovementForm({
        ...VALID,
        descripcion: '¿Hay audiencia? ¡Sí!\n\nHonorarios del 20 %.',
        textoCliente: 'Texto "para" el cliente.',
      }),
    ).toEqual([]);
  });

  it.each([
    ['sin fecha', { fecha: '' }, MOVEMENT_MESSAGES.fechaRequired],
    ['con una fecha inexistente', { fecha: '2023-02-29' }, MOVEMENT_MESSAGES.fechaInvalid],
    ['con una fecha anterior a 1900', { fecha: '1899-12-31' }, MOVEMENT_MESSAGES.fechaRange],
    ['con una fecha posterior a 2099', { fecha: '2100-01-01' }, MOVEMENT_MESSAGES.fechaRange],
    ['sin tipo', { tipo: '' as const }, MOVEMENT_MESSAGES.tipo],
    ['sin descripción', { descripcion: ' \n ' }, MOVEMENT_MESSAGES.descripcionRequired],
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
    ['con un emoji', { descripcion: 'Providencia 😀' }, allowedCharactersMessage('La descripción')],
    [
      'con < en el texto para el cliente',
      { textoCliente: '<b>hola</b>' },
      allowedCharactersMessage('El texto para el cliente'),
    ],
  ])('rechaza un movimiento %s', (_case, override, message) => {
    expect(validateMovementForm({ ...VALID, ...override })).toEqual([message]);
  });

  it('usa el mensaje de caracteres de la API', () => {
    expect(allowedCharactersMessage('La descripción')).toBe(
      'La descripción solo puede tener letras, números, espacios, saltos de línea y los símbolos . , ; : / - _ ( ) " \' $ & # ° º ª ¿ ? ¡ ! %',
    );
  });

  it('cuenta los caracteres en puntos de código y \\r\\n como uno', () => {
    expect(validateMovementForm({ ...VALID, descripcion: '𝐀'.repeat(2000) })).toEqual([]);
    expect(validateMovementForm({ ...VALID, descripcion: `${'a'.repeat(1998)}\r\nb` })).toEqual([]);
  });

  it('devuelve todos los problemas en el orden de los campos', () => {
    expect(validateMovementForm(EMPTY_MOVEMENT_FORM)).toEqual([
      MOVEMENT_MESSAGES.fechaRequired,
      MOVEMENT_MESSAGES.tipo,
      MOVEMENT_MESSAGES.descripcionRequired,
    ]);
  });
});

describe('cuerpos (RF-8, RF-11)', () => {
  it('la carga normaliza los textos y envía el texto para el cliente vacío como null', () => {
    expect(
      buildCreateMovementData({
        ...VALID,
        descripcion: '  Primer párrafo.\r\n\r\nSegundo.  ',
        textoCliente: '   ',
        visible: true,
      }),
    ).toEqual({
      fecha: '2024-03-01',
      tipo: 'providencia',
      descripcion: 'Primer párrafo.\n\nSegundo.',
      textoCliente: null,
      visible: true,
    });
  });

  it('la edición sin cambios no envía nada', () => {
    expect(buildUpdateMovementData(movementFormFrom(MOVEMENT), MOVEMENT)).toEqual({});
  });

  it('la edición envía solo los datos que cambiaron', () => {
    const form = { ...movementFormFrom(MOVEMENT), tipo: 'oficio' as const, visible: false };
    expect(buildUpdateMovementData(form, MOVEMENT)).toEqual({ tipo: 'oficio', visible: false });
  });

  it('vaciar el texto para el cliente lo envía como null', () => {
    const form = { ...movementFormFrom(MOVEMENT), textoCliente: '  ' };
    expect(buildUpdateMovementData(form, MOVEMENT)).toEqual({ textoCliente: null });
  });

  it('un texto que solo cambia en espacios de los extremos no es un cambio', () => {
    const form = { ...movementFormFrom(MOVEMENT), descripcion: ` ${MOVEMENT.descripcion}\n` };
    expect(buildUpdateMovementData(form, MOVEMENT)).toEqual({});
  });
});

describe('filtros del historial (RF-25, RF-26)', () => {
  it('acepta los filtros vacíos y el mismo día como desde y hasta', () => {
    expect(validateMovementFilters(EMPTY_MOVEMENT_FILTERS)).toEqual([]);
    expect(
      validateMovementFilters({
        ...EMPTY_MOVEMENT_FILTERS,
        desde: '2024-03-01',
        hasta: '2024-03-01',
      }),
    ).toEqual([]);
  });

  it('rechaza la fecha desde posterior a la fecha hasta con el mensaje de la API', () => {
    expect(
      validateMovementFilters({
        ...EMPTY_MOVEMENT_FILTERS,
        desde: '2024-03-02',
        hasta: '2024-03-01',
      }),
    ).toEqual(['La fecha desde no puede ser posterior a la fecha hasta']);
  });

  it('rechaza una búsqueda de más de 100 caracteres', () => {
    expect(validateMovementFilters({ ...EMPTY_MOVEMENT_FILTERS, buscar: 'a'.repeat(101) })).toEqual(
      [MOVEMENT_MESSAGES.buscar],
    );
  });

  it('arma la consulta de una página sin el tipo vacío', () => {
    expect(toListQuery({ ...EMPTY_MOVEMENT_FILTERS, ocultarAnulados: true }, 2)).toEqual({
      pagina: 2,
      buscar: '',
      tipo: undefined,
      visibilidad: 'todos',
      desde: '',
      hasta: '',
      ocultarAnulados: true,
    });
  });
});
