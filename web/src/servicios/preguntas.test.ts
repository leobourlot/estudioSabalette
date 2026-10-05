import { describe, expect, it } from 'vitest';
import type { NewPartyData } from './causas';
import { ApiError } from './cliente-http';
import { applyPartyAnswer, pendingQuestion } from './preguntas';

const question = (message: string, details: Record<string, unknown>) =>
  new ApiError(409, [message], details);

const NON_CLIENT: NewPartyData = {
  rol: 'demandado',
  tipoPersona: 'fisica',
  nombre: 'Juan',
  apellido: 'Pérez',
  dni: '20111111',
  confirmarNombreRepetido: true,
};

describe('pendingQuestion (RF-9, RF-16, RF-19, RF-43)', () => {
  it('expediente repetido: guardar igual o cancelar', () => {
    expect(
      pendingQuestion(
        question('Ya existe otra causa con ese número de expediente', {
          codigo: 'EXPEDIENTE_REPETIDO',
        }),
      ),
    ).toEqual({
      codigo: 'EXPEDIENTE_REPETIDO',
      message: 'Ya existe otra causa con ese número de expediente',
      options: [
        { kind: 'confirm', field: 'confirmarExpedienteRepetido', label: 'Guardar igual' },
        { kind: 'cancel', label: 'Cancelar' },
      ],
    });
  });

  it('documento de un cliente activo: agregar como cliente o como no cliente, con el índice de la parte', () => {
    expect(
      pendingQuestion(
        question('Ese DNI o CUIT pertenece a un cliente del estudio', {
          codigo: 'DOCUMENTO_DE_CLIENTE',
          clienteId: 7,
          clienteActivo: true,
          indiceParte: 1,
        }),
      ),
    ).toEqual({
      codigo: 'DOCUMENTO_DE_CLIENTE',
      message: 'Ese DNI o CUIT pertenece a un cliente del estudio',
      indiceParte: 1,
      options: [
        { kind: 'linkClient', clienteId: 7, label: 'Agregar como cliente' },
        { kind: 'confirm', field: 'confirmarDocumentoDeCliente', label: 'Agregar como no cliente' },
      ],
    });
  });

  it('documento de un cliente desactivado: no ofrece vincularlo (RF-17)', () => {
    expect(
      pendingQuestion(
        question('Ese DNI o CUIT pertenece a un cliente desactivado', {
          codigo: 'DOCUMENTO_DE_CLIENTE',
          clienteId: 7,
          clienteActivo: false,
        }),
      )?.options,
    ).toEqual([
      { kind: 'confirm', field: 'confirmarDocumentoDeCliente', label: 'Agregar como no cliente' },
      { kind: 'cancel', label: 'Cancelar' },
    ]);
  });

  it('nombre repetido en la causa: es la misma persona o es otra, con la parte existente', () => {
    expect(
      pendingQuestion(
        question('Ya hay una parte con ese nombre en la causa. ¿Es la misma persona?', {
          codigo: 'NOMBRE_REPETIDO',
          parteId: 3,
        }),
      ),
    ).toEqual({
      codigo: 'NOMBRE_REPETIDO',
      message: 'Ya hay una parte con ese nombre en la causa. ¿Es la misma persona?',
      parteId: 3,
      options: [
        { kind: 'skipParty', label: 'Es la misma persona' },
        { kind: 'confirm', field: 'confirmarNombreRepetido', label: 'Es otra persona' },
      ],
    });
  });

  it('nombre de clientes del estudio: una opción por cliente, con su documento, y "ninguno"', () => {
    const result = pendingQuestion(
      question('Hay clientes del estudio con ese nombre. ¿Es alguno de ellos?', {
        codigo: 'NOMBRE_DE_CLIENTE',
        indiceParte: 0,
        clientes: [
          {
            id: 4,
            tipoPersona: 'fisica',
            nombre: 'Juan',
            apellido: 'Pérez',
            razonSocial: null,
            dni: '20111111',
            cuit: null,
          },
          {
            id: 5,
            tipoPersona: 'juridica',
            nombre: null,
            apellido: null,
            razonSocial: 'Pérez S.A.',
            dni: null,
            cuit: '30712345671',
          },
        ],
      }),
    );

    expect(result?.options).toEqual([
      { kind: 'linkClient', clienteId: 4, label: 'Juan Pérez · DNI 20.111.111' },
      { kind: 'linkClient', clienteId: 5, label: 'Pérez S.A. · CUIT 30-71234567-1' },
      {
        kind: 'confirm',
        field: 'confirmarNombreDeCliente',
        label: 'Ninguno: agregar como no cliente',
      },
    ]);
    expect(result?.indiceParte).toBe(0);
  });

  it.each([
    ['un error sin código', new ApiError(409, ['Esa persona ya es parte de la causa'])],
    ['un código desconocido', question('Otra cosa', { codigo: 'OTRA_COSA' })],
    ['un error que no es de la API', new Error('falló')],
    ['algo que no es un error', 'texto'],
  ])('%s no es una pregunta', (_case, error) => {
    expect(pendingQuestion(error)).toBeNull();
  });
});

describe('applyPartyAnswer', () => {
  it('confirmar agrega la respuesta a la parte y conserva las anteriores', () => {
    expect(
      applyPartyAnswer(NON_CLIENT, {
        kind: 'confirm',
        field: 'confirmarDocumentoDeCliente',
        label: 'Agregar como no cliente',
      }),
    ).toEqual({ ...NON_CLIENT, confirmarDocumentoDeCliente: true });
  });

  it('elegir un cliente convierte la parte en parte cliente con el mismo rol y las respuestas ya dadas', () => {
    expect(
      applyPartyAnswer(NON_CLIENT, { kind: 'linkClient', clienteId: 4, label: 'Juan Pérez' }),
    ).toEqual({ rol: 'demandado', clienteId: 4, confirmarNombreRepetido: true });
  });

  it('"es la misma persona" quita la parte', () => {
    expect(
      applyPartyAnswer(NON_CLIENT, { kind: 'skipParty', label: 'Es la misma persona' }),
    ).toBeNull();
  });

  it('cancelar deja la parte como estaba', () => {
    expect(applyPartyAnswer(NON_CLIENT, { kind: 'cancel', label: 'Cancelar' })).toEqual(NON_CLIENT);
  });
});
