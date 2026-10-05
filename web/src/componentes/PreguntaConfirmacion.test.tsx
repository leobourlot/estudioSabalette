import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../servicios/cliente-http';
import { pendingQuestion } from '../servicios/preguntas';
import { PreguntaConfirmacion } from './PreguntaConfirmacion';

const questionFrom = (message: string, details: Record<string, unknown>) =>
  pendingQuestion(new ApiError(409, [message], details))!;

describe('PreguntaConfirmacion (RF-9, RF-16, RF-19, RF-43)', () => {
  it('muestra el mensaje y un botón por opción', () => {
    render(
      <PreguntaConfirmacion
        question={questionFrom('Ya existe otra causa con ese número de expediente', {
          codigo: 'EXPEDIENTE_REPETIDO',
        })}
        onAnswer={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('alertdialog', {
      name: 'Ya existe otra causa con ese número de expediente',
    });
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Guardar igual', 'Cancelar']);
  });

  it('con clientes homónimos muestra un botón por cliente, con su documento', () => {
    render(
      <PreguntaConfirmacion
        question={questionFrom('Hay clientes del estudio con ese nombre. ¿Es alguno de ellos?', {
          codigo: 'NOMBRE_DE_CLIENTE',
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
              id: 6,
              tipoPersona: 'fisica',
              nombre: 'Juan',
              apellido: 'Pérez',
              razonSocial: null,
              dni: '20222222',
              cuit: null,
            },
          ],
        })}
        onAnswer={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Juan Pérez · DNI 20.111.111',
      'Juan Pérez · DNI 20.222.222',
      'Ninguno: agregar como no cliente',
    ]);
  });

  it('cada botón devuelve la opción elegida', async () => {
    const onAnswer = vi.fn();
    const question = questionFrom('Ese DNI o CUIT pertenece a un cliente del estudio', {
      codigo: 'DOCUMENTO_DE_CLIENTE',
      clienteId: 7,
      clienteActivo: true,
    });
    render(<PreguntaConfirmacion question={question} onAnswer={onAnswer} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Agregar como cliente' }));
    await user.click(screen.getByRole('button', { name: 'Agregar como no cliente' }));

    expect(onAnswer.mock.calls).toEqual([[question.options[0]], [question.options[1]]]);
  });

  it('indica a qué parte del alta se refiere, si corresponde', () => {
    render(
      <PreguntaConfirmacion
        question={questionFrom(
          'Ya hay una parte con ese nombre en la causa. ¿Es la misma persona?',
          {
            codigo: 'NOMBRE_REPETIDO',
            indiceParte: 1,
          },
        )}
        partyName="Pedro López"
        onAnswer={vi.fn()}
      />,
    );

    expect(screen.getByText('Parte 2: Pedro López')).toBeTruthy();
  });
});
