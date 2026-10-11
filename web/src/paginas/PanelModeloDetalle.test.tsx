import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fakeModelosService,
  lawyerSession,
  renderModelsApp,
  testModeloDetalle,
} from '../pruebas/modelos-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import type { ModeloDetalle, ModelosService } from '../servicios/modelos-escritos';

const MINUTE = 60_000;

const repeatedQuestion = () =>
  new ApiError(409, ['Ya existe un modelo con ese título'], {
    codigo: 'MODELO_REPETIDO',
    modelos: [{ id: 3, titulo: 'Cédula de notificación', tipo: 'cedula', fuero: 'laboral' }],
  });

async function openModel(
  modelo: ModeloDetalle = testModeloDetalle(),
  overrides: Partial<ModelosService> = {},
) {
  const modelos = fakeModelosService({
    getModel: vi.fn().mockResolvedValue(modelo),
    ...overrides,
  });
  renderModelsApp(`/panel/modelos/${modelo.id}`, { session: lawyerSession(), modelos });
  // El título ya está mientras carga: se espera a que lleguen los datos.
  await screen.findByRole('region', { name: 'Datos del modelo' });
  return modelos;
}

const data = () => within(screen.getByRole('region', { name: 'Datos del modelo' }));

const change = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('PanelModeloDetalle', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('ficha (RF-16)', () => {
    it('pide el modelo de la dirección y muestra sus datos', async () => {
      const modelos = await openModel();

      expect(await data().findByText('Oficio al Registro de la Propiedad')).toBeTruthy();
      expect(modelos.getModel).toHaveBeenCalledExactlyOnceWith(8);
      expect(data().getByText('Oficio')).toBeTruthy();
      expect(data().getByText('Civil')).toBeTruthy();
      expect(data().getByText('Para pedir un informe de dominio')).toBeTruthy();
    });

    it('muestra el texto completo como texto literal, con sus saltos de línea y sus marcas', async () => {
      await openModel(
        testModeloDetalle({ texto: 'Señor Director:\n\n<b>#CARATULA#</b> & "Expte."' }),
      );

      const texto = await screen.findByText(/Señor Director:/);
      expect(texto.textContent).toBe('Señor Director:\n\n<b>#CARATULA#</b> & "Expte."');
      expect(texto.querySelector('b')).toBeNull();
      expect(texto.className).toContain('whitespace-pre-wrap');
    });

    it('muestra la lista de las variables que usa', async () => {
      await openModel();

      const variables = within(
        await screen.findByRole('list', { name: 'Variables que usa el modelo' }),
      ).getAllByRole('listitem');
      expect(variables.map((item) => item.textContent)).toEqual([
        '#CARATULA#',
        '#NUMERO_EXPEDIENTE#',
      ]);
    });

    it('un modelo sin variables lo indica', async () => {
      await openModel(testModeloDetalle({ texto: 'Texto fijo.', variables: [] }));

      expect(await screen.findByText('Este modelo no usa variables')).toBeTruthy();
      expect(screen.queryByRole('list', { name: 'Variables que usa el modelo' })).toBeNull();
    });

    it('un modelo sin descripción muestra el dato vacío', async () => {
      await openModel(testModeloDetalle({ descripcion: null }));

      await data().findByText('Oficio al Registro de la Propiedad');
      expect(data().getByText('—')).toBeTruthy();
    });

    it('muestra quién lo cargó y que no tiene modificaciones (RF-2)', async () => {
      await openModel();

      const audit = within(await screen.findByRole('region', { name: 'Registro' }));
      expect(audit.getByText(/^Cargado por Sosa, Luis el /)).toBeTruthy();
      expect(audit.getByText('Sin modificaciones desde la carga')).toBeTruthy();
    });

    it('marca a un autor que dejó el estudio como desactivado (RF-51)', async () => {
      await openModel(
        testModeloDetalle({
          creadoPor: { id: 1, nombre: 'Luis', apellido: 'Sosa', activo: false },
          modificadoPor: { id: 2, nombre: 'Ana', apellido: 'Sabalette', activo: true },
          modificadoEn: '2026-10-05T15:00:00.000Z',
        }),
      );

      const audit = within(await screen.findByRole('region', { name: 'Registro' }));
      expect(audit.getByText(/^Cargado por Sosa, Luis \(desactivado\) el /)).toBeTruthy();
      expect(audit.getByText(/^Modificado por última vez por Sabalette, Ana el /)).toBeTruthy();
    });

    it('si el modelo no existe, muestra el mensaje de la API y cómo volver (RF-49)', async () => {
      const modelos = fakeModelosService({
        getModel: vi.fn().mockRejectedValue(new ApiError(404, ['No existe ese modelo'])),
      });
      renderModelsApp('/panel/modelos/999', { session: lawyerSession(), modelos });

      expect((await screen.findByRole('alert')).textContent).toBe('No existe ese modelo');
      expect(screen.getByRole('link', { name: 'Volver a los modelos' })).toBeTruthy();
    });

    it('no ofrece completar el modelo: eso se hace desde una causa (RF-30)', async () => {
      await openModel();

      await data().findByText('Oficio al Registro de la Propiedad');
      expect(screen.queryByRole('button', { name: /completar/i })).toBeNull();
      expect(screen.queryByRole('link', { name: /completar/i })).toBeNull();
    });
  });

  describe('edición (RF-14, RF-15)', () => {
    it('abre el formulario con los datos del modelo y guarda solo lo que cambió', async () => {
      const updated = testModeloDetalle({ titulo: 'Oficio al Banco' });
      const modelos = await openModel(testModeloDetalle(), {
        updateModel: vi.fn().mockResolvedValue(updated),
      });
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Editar' }));
      expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe(
        'Oficio al Registro de la Propiedad',
      );
      change('Título', 'Oficio al Banco');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(await data().findByText('Oficio al Banco')).toBeTruthy();
      expect(modelos.updateModel).toHaveBeenCalledExactlyOnceWith(8, { titulo: 'Oficio al Banco' });
      expect(screen.queryByLabelText('Título')).toBeNull();
    });

    it('guardar sin cambios cierra el formulario sin llamar al servicio', async () => {
      const modelos = await openModel();
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Editar' }));
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(modelos.updateModel).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('Título')).toBeNull();
      expect(data().getByText('Oficio al Registro de la Propiedad')).toBeTruthy();
    });

    it('con datos inválidos muestra el error y no llama al servicio', async () => {
      const modelos = await openModel();
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Editar' }));
      change('Texto del modelo', 'Autos #CARATUAL#.');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(
        within(screen.getByRole('alert')).getByText('El texto tiene variables que no existen'),
      ).toBeTruthy();
      expect(modelos.updateModel).not.toHaveBeenCalled();
    });

    it('"Cancelar" cierra el formulario sin guardar', async () => {
      const modelos = await openModel();
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Editar' }));
      change('Título', 'Otro título');
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(modelos.updateModel).not.toHaveBeenCalled();
      expect(data().getByText('Oficio al Registro de la Propiedad')).toBeTruthy();
    });

    it('ante un título repetido pregunta, y "Guardar igual" repite con la confirmación', async () => {
      const updateModel = vi
        .fn()
        .mockRejectedValueOnce(repeatedQuestion())
        .mockResolvedValueOnce(testModeloDetalle({ titulo: 'Cédula de notificación' }));
      await openModel(testModeloDetalle(), { updateModel });
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Editar' }));
      change('Título', 'Cédula de notificación');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      const question = within(await screen.findByRole('alertdialog'));
      expect(question.getByText('Ya existe un modelo con ese título')).toBeTruthy();
      expect(
        within(screen.getByRole('list', { name: 'Modelos con ese título' })).getByRole('link', {
          name: 'Cédula de notificación',
        }),
      ).toBeTruthy();

      await user.click(question.getByRole('button', { name: 'Guardar igual' }));

      expect(await data().findByText('Cédula de notificación')).toBeTruthy();
      expect(updateModel).toHaveBeenCalledTimes(2);
      expect(updateModel.mock.calls[1]).toEqual([
        8,
        { titulo: 'Cédula de notificación', confirmarRepetido: true },
      ]);
    });

    it('"Cancelar" en la pregunta no guarda y deja el formulario abierto', async () => {
      const updateModel = vi.fn().mockRejectedValue(repeatedQuestion());
      await openModel(testModeloDetalle(), { updateModel });
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Editar' }));
      change('Título', 'Cédula de notificación');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      const question = within(await screen.findByRole('alertdialog'));
      await user.click(question.getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(updateModel).toHaveBeenCalledTimes(1);
      expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe(
        'Cédula de notificación',
      );
    });

    it('muestra el rechazo de la API en el formulario (RF-26)', async () => {
      await openModel(testModeloDetalle(), {
        updateModel: vi
          .fn()
          .mockRejectedValue(
            new ApiError(409, ['El modelo está desactivado. Reactivalo para modificarlo']),
          ),
      });
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Editar' }));
      change('Título', 'Otro título');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(
        await within(await screen.findByRole('alert')).findByText(
          'El modelo está desactivado. Reactivalo para modificarlo',
        ),
      ).toBeTruthy();
      expect(screen.getByLabelText('Título')).toBeTruthy();
    });

    it('escribir en la edición mantiene la sesión (RF-17)', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
      const modelos = await openModel();
      await userEvent.setup().click(await screen.findByRole('button', { name: 'Editar' }));

      vi.setSystemTime(Date.now() + 5 * MINUTE);
      change('Texto del modelo', 'Señor Director: nuevo texto.');

      await vi.waitFor(() => expect(modelos.keepSessionAlive).toHaveBeenCalledTimes(1));
    });
  });

  describe('desactivación y reactivación (RF-25 a RF-28)', () => {
    it('desactivar pide confirmación y deja el modelo solo para consultar y reactivar', async () => {
      const modelos = await openModel(testModeloDetalle(), {
        deactivateModel: vi.fn().mockResolvedValue(testModeloDetalle({ activo: false })),
      });
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Desactivar' }));
      expect(modelos.deactivateModel).not.toHaveBeenCalled();
      const confirmation = within(screen.getByRole('alertdialog'));
      expect(confirmation.getByText('¿Desactivar este modelo?')).toBeTruthy();

      await user.click(confirmation.getByRole('button', { name: 'Sí, desactivar' }));

      expect(await screen.findByRole('button', { name: 'Reactivar' })).toBeTruthy();
      expect(modelos.deactivateModel).toHaveBeenCalledExactlyOnceWith(8);
      expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Desactivar' })).toBeNull();
    });

    it('cancelar la confirmación no desactiva', async () => {
      const modelos = await openModel();
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Desactivar' }));
      await user.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }),
      );

      expect(modelos.deactivateModel).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Editar' })).toBeTruthy();
    });

    it('un modelo desactivado se muestra como tal, sin acciones de edición (RF-26)', async () => {
      await openModel(testModeloDetalle({ activo: false }));

      expect(await screen.findByText('Desactivado')).toBeTruthy();
      expect(
        screen.getByText('Este modelo está desactivado: solo se puede consultar y reactivar.'),
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Reactivar' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Desactivar' })).toBeNull();
    });

    it('reactivar vuelve a mostrar las acciones de edición (RF-27)', async () => {
      const modelos = await openModel(testModeloDetalle({ activo: false }), {
        reactivateModel: vi.fn().mockResolvedValue(testModeloDetalle({ activo: true })),
      });

      await userEvent.setup().click(await screen.findByRole('button', { name: 'Reactivar' }));

      expect(await screen.findByRole('button', { name: 'Editar' })).toBeTruthy();
      expect(modelos.reactivateModel).toHaveBeenCalledExactlyOnceWith(8, false);
    });

    it('si al reactivar el título coincide con otro, pregunta y "Guardar igual" lo reactiva (RF-27)', async () => {
      const reactivateModel = vi
        .fn()
        .mockRejectedValueOnce(repeatedQuestion())
        .mockResolvedValueOnce(testModeloDetalle({ activo: true }));
      await openModel(testModeloDetalle({ activo: false }), { reactivateModel });
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Reactivar' }));
      const question = within(await screen.findByRole('alertdialog'));
      await user.click(question.getByRole('button', { name: 'Guardar igual' }));

      expect(await screen.findByRole('button', { name: 'Editar' })).toBeTruthy();
      expect(reactivateModel.mock.calls).toEqual([
        [8, false],
        [8, true],
      ]);
    });

    it('muestra el mensaje de la API si la acción se rechaza (RF-28)', async () => {
      await openModel(testModeloDetalle(), {
        deactivateModel: vi
          .fn()
          .mockRejectedValue(new ApiError(409, ['El modelo ya está desactivado'])),
      });
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Desactivar' }));
      await user.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí, desactivar' }),
      );

      expect(
        await within(await screen.findByRole('alert')).findByText('El modelo ya está desactivado'),
      ).toBeTruthy();
    });
  });
});
