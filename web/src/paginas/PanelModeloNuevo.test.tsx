import { fireEvent, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  currentPath,
  fakeModelosService,
  lawyerSession,
  renderModelsApp,
  testModeloDetalle,
} from '../pruebas/modelos-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import type { ModelosService } from '../servicios/modelos-escritos';

const MINUTE = 60_000;

const REPEATED = [
  { id: 4, titulo: 'OFICIO AL REGISTRO', tipo: 'oficio', fuero: 'otro' },
  { id: 3, titulo: 'Oficio al Registro', tipo: 'cedula', fuero: 'civil' },
];

const repeatedQuestion = () =>
  new ApiError(409, ['Ya existe un modelo con ese título'], {
    codigo: 'MODELO_REPETIDO',
    modelos: REPEATED,
  });

async function openNew(overrides: Partial<ModelosService> = {}) {
  const modelos = fakeModelosService({
    createModel: vi.fn().mockResolvedValue(testModeloDetalle({ id: 9 })),
    ...overrides,
  });
  renderModelsApp('/panel/modelos/nuevo', { session: lawyerSession(), modelos });
  await screen.findByRole('heading', { name: 'Nuevo modelo', level: 1 });
  return modelos;
}

const change = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** Completa el formulario con un modelo válido. */
async function fillValid(user: UserEvent) {
  change('Título', 'Oficio al Registro');
  await user.selectOptions(screen.getByLabelText('Tipo de escrito'), 'oficio');
  change('Texto del modelo', '\tSeñor Director:\r\n\r\n   Autos “#carátula#”…');
}

const save = (user: UserEvent) =>
  user.click(screen.getByRole('button', { name: 'Guardar modelo' }));

describe('PanelModeloNuevo (RF-13, RF-15, RF-17)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('carga el modelo con los textos convertidos y lleva a su ficha', async () => {
    const modelos = await openNew();
    const user = userEvent.setup();

    await fillValid(user);
    await save(user);

    expect(await screen.findByRole('heading', { name: 'Modelo', level: 1 })).toBeTruthy();
    expect(currentPath()).toBe('/panel/modelos/9');
    expect(modelos.createModel).toHaveBeenCalledExactlyOnceWith({
      titulo: 'Oficio al Registro',
      tipo: 'oficio',
      fuero: 'otro',
      descripcion: null,
      texto: 'Señor Director:\n\nAutos "#CARATULA#"...',
    });
  });

  it('con datos inválidos muestra los errores sin llamar al servicio', async () => {
    const modelos = await openNew();
    const user = userEvent.setup();

    change('Título', 'Oficio');
    await save(user);

    const alert = within(screen.getByRole('alert'));
    expect(alert.getByText('Indicá el tipo de escrito')).toBeTruthy();
    expect(alert.getByText('Indicá el texto del modelo')).toBeTruthy();
    expect(modelos.createModel).not.toHaveBeenCalled();
  });

  it('muestra los mensajes de un rechazo de la API y deja el formulario como estaba', async () => {
    const modelos = await openNew({
      createModel: vi
        .fn()
        .mockRejectedValue(new ApiError(400, ['El texto tiene variables que no existen'])),
    });
    const user = userEvent.setup();

    await fillValid(user);
    await save(user);

    expect(
      await within(await screen.findByRole('alert')).findByText(
        'El texto tiene variables que no existen',
      ),
    ).toBeTruthy();
    expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('Oficio al Registro');
    expect(modelos.createModel).toHaveBeenCalledTimes(1);
    expect(currentPath()).toBe('/panel/modelos/nuevo');
  });

  describe('título repetido (RF-15)', () => {
    it('pregunta y muestra todos los modelos con los que coincide', async () => {
      await openNew({ createModel: vi.fn().mockRejectedValue(repeatedQuestion()) });
      const user = userEvent.setup();

      await fillValid(user);
      await save(user);

      const question = within(await screen.findByRole('alertdialog'));
      expect(question.getByText('Ya existe un modelo con ese título')).toBeTruthy();
      const matches = within(
        screen.getByRole('list', { name: 'Modelos con ese título' }),
      ).getAllByRole('listitem');
      expect(matches.map((item) => item.textContent)).toEqual([
        'OFICIO AL REGISTRO · Oficio · Otro',
        'Oficio al Registro · Cédula · Civil',
      ]);
      // Cada uno se abre en otra pestaña, para no perder lo que se está cargando.
      const link = within(matches[1]).getByRole('link', { name: 'Oficio al Registro' });
      expect(link.getAttribute('href')).toBe('/panel/modelos/3');
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('"Guardar igual" repite la carga con la confirmación', async () => {
      const createModel = vi
        .fn()
        .mockRejectedValueOnce(repeatedQuestion())
        .mockResolvedValueOnce(testModeloDetalle({ id: 9 }));
      await openNew({ createModel });
      const user = userEvent.setup();

      await fillValid(user);
      await save(user);
      await user.click(await screen.findByRole('button', { name: 'Guardar igual' }));

      expect(await screen.findByRole('heading', { name: 'Modelo', level: 1 })).toBeTruthy();
      expect(createModel).toHaveBeenCalledTimes(2);
      expect(createModel.mock.calls[0][0]).not.toHaveProperty('confirmarRepetido');
      expect(createModel.mock.calls[1][0]).toMatchObject({
        titulo: 'Oficio al Registro',
        confirmarRepetido: true,
      });
    });

    it('"Cancelar" no guarda y deja el formulario como estaba', async () => {
      const createModel = vi.fn().mockRejectedValue(repeatedQuestion());
      await openNew({ createModel });
      const user = userEvent.setup();

      await fillValid(user);
      await save(user);
      // El de la pregunta, no el del formulario.
      const question = within(await screen.findByRole('alertdialog'));
      await user.click(question.getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(createModel).toHaveBeenCalledTimes(1);
      expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe(
        'Oficio al Registro',
      );
    });
  });

  it('"Cancelar" del formulario vuelve a la sección de modelos sin guardar', async () => {
    const modelos = await openNew();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(await screen.findByRole('heading', { name: 'Modelos', level: 1 })).toBeTruthy();
    expect(modelos.createModel).not.toHaveBeenCalled();
  });

  it('escribir consulta la sesión como mucho una vez cada 5 minutos (RF-17)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
    const modelos = await openNew();

    change('Título', 'O');
    expect(modelos.keepSessionAlive).not.toHaveBeenCalled();

    vi.setSystemTime(Date.now() + 5 * MINUTE);
    change('Título', 'Of');
    change('Texto del modelo', 'Señor');
    await vi.waitFor(() => expect(modelos.keepSessionAlive).toHaveBeenCalledTimes(1));

    vi.setSystemTime(Date.now() + 4 * MINUTE);
    change('Texto del modelo', 'Señor Juez');
    expect(modelos.keepSessionAlive).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + MINUTE);
    change('Texto del modelo', 'Señor Juez:');
    await vi.waitFor(() => expect(modelos.keepSessionAlive).toHaveBeenCalledTimes(2));
  });

  it('dejar el formulario abierto sin escribir no consulta la sesión', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
    const modelos = await openNew();

    vi.setSystemTime(Date.now() + 2 * 60 * MINUTE);

    expect(modelos.keepSessionAlive).not.toHaveBeenCalled();
  });

  it('no guarda nada en el almacenamiento del navegador (principio 5)', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await openNew();
    const user = userEvent.setup();

    await fillValid(user);
    await save(user);
    await screen.findByRole('heading', { name: 'Modelo', level: 1 });

    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
