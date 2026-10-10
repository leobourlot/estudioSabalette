import { fireEvent, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeSessionService, testUser } from '../pruebas/aplicacion-de-prueba';
import {
  fakeJurisprudenciaService,
  renderRulingsApp,
  testFalloDetalle,
} from '../pruebas/jurisprudencia-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import type { JurisprudenciaService } from '../servicios/jurisprudencia';

const MINUTE = 60_000;

const REPEATED = {
  id: 3,
  caratula: 'Muñoz c/ Clínica del Sur',
  tribunal: 'Cámara Civil, Sala B',
  fecha: '2020-08-14',
  numero: '5678/2019',
};

const repeatedQuestion = () =>
  new ApiError(409, ['Ya existe un fallo con ese número en ese tribunal'], {
    codigo: 'FALLO_REPETIDO',
    fallo: REPEATED,
  });

async function openNew(overrides: Partial<JurisprudenciaService> = {}) {
  const service = fakeJurisprudenciaService({
    createRuling: vi.fn().mockResolvedValue(testFalloDetalle({ id: 9 })),
    ...overrides,
  });
  renderRulingsApp(
    '/panel/jurisprudencia/nuevo',
    fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(testUser('abogado')) }),
    service,
  );
  await screen.findByRole('heading', { name: 'Nuevo fallo', level: 1 });
  return service;
}

const change = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** Completa el formulario con un fallo válido. */
async function fillValid(user: UserEvent) {
  change('Carátula', 'Pérez c/ López s/ daños');
  change('Tribunal', 'CNCiv., Sala A');
  await user.selectOptions(screen.getByLabelText('Fuero'), 'civil');
  change('Fecha del fallo', '2019-05-03');
  change(/^Número/, '1234/2018');
  change('Sumario', 'La responsabilidad del dueño de la cosa es objetiva.');
  await user.type(screen.getByLabelText('Palabras clave'), 'daño moral{Enter}');
  change(/^Enlace/, 'https://www.csjn.gov.ar/fallos/1234');
}

const save = (user: UserEvent) => user.click(screen.getByRole('button', { name: 'Guardar fallo' }));

describe('PanelFalloNuevo (RF-1, RF-14, RF-16, RF-18, RF-20)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra los campos del fallo, con la fecha limitada al rango de RF-7', async () => {
    await openNew();

    for (const label of ['Carátula', 'Tribunal', 'Fuero', 'Sumario', 'Palabras clave']) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(screen.getByLabelText(/^Número de expediente o de registro/)).toBeTruthy();
    expect(screen.getByLabelText(/^Enlace a la fuente/)).toBeTruthy();
    const fecha = screen.getByLabelText('Fecha del fallo') as HTMLInputElement;
    expect(fecha.type).toBe('date');
    expect(fecha.min).toBe('1800-01-01');
    expect(fecha.max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('el contador del sumario cuenta el texto ya convertido, sobre 5.000 (RF-3)', async () => {
    await openNew();

    expect(screen.getByText('0/5000')).toBeTruthy();
    change('Sumario', '  hola…  ');
    // "hola..." tiene 7 caracteres: el "…" se convierte en tres puntos.
    expect(screen.getByText('7/5000')).toBeTruthy();
  });

  it('con el formulario vacío muestra cada error y no llama al servicio', async () => {
    const service = await openNew();
    const user = userEvent.setup();

    await save(user);

    const alert = within(screen.getByRole('alert'));
    expect(alert.getByText('La carátula es obligatoria')).toBeTruthy();
    expect(alert.getByText('Indicá el tribunal')).toBeTruthy();
    expect(alert.getByText('Indicá la fecha del fallo')).toBeTruthy();
    expect(alert.getByText('Indicá el sumario del fallo')).toBeTruthy();
    expect(alert.getByText('Indicá al menos una palabra clave')).toBeTruthy();
    expect(service.createRuling).not.toHaveBeenCalled();
  });

  it('con un enlace inválido muestra el error y no llama al servicio (RF-6)', async () => {
    const service = await openNew();
    const user = userEvent.setup();
    await fillValid(user);
    change(/^Enlace/, 'http://csjn.gov.ar');

    await save(user);

    expect(screen.getByRole('alert').textContent).toContain('El enlace debe empezar con https://');
    expect(service.createRuling).not.toHaveBeenCalled();
  });

  it('carga el fallo con los textos convertidos y lleva a su ficha (RF-3, RF-16)', async () => {
    const service = await openNew();
    const user = userEvent.setup();
    await fillValid(user);
    change('Carátula', '  “Pérez”  c/ López ');
    change('Sumario', 'Primer párrafo…\n\n[...] Segundo  párrafo.');

    await save(user);

    expect(await screen.findByRole('heading', { name: 'Fallo', level: 1 })).toBeTruthy();
    expect(service.createRuling).toHaveBeenCalledTimes(1);
    expect(service.createRuling).toHaveBeenCalledWith({
      caratula: '"Pérez" c/ López',
      tribunal: 'CNCiv., Sala A',
      fuero: 'civil',
      fecha: '2019-05-03',
      numero: '1234/2018',
      sumario: 'Primer párrafo...\n\n(...) Segundo párrafo.',
      palabrasClave: ['daño moral'],
      enlace: 'https://www.csjn.gov.ar/fallos/1234',
    });
  });

  it('un fallo sin número ni enlace los envía como null', async () => {
    const service = await openNew();
    const user = userEvent.setup();
    await fillValid(user);
    change(/^Número/, '');
    change(/^Enlace/, '');

    await save(user);

    await vi.waitFor(() => expect(service.createRuling).toHaveBeenCalledTimes(1));
    expect(service.createRuling.mock.calls[0][0]).toMatchObject({ numero: null, enlace: null });
  });

  describe('pregunta de fallo repetido (RF-18)', () => {
    it('muestra el mensaje y el fallo con el que coincide', async () => {
      await openNew({ createRuling: vi.fn().mockRejectedValue(repeatedQuestion()) });
      const user = userEvent.setup();
      await fillValid(user);

      await save(user);

      const dialog = await screen.findByRole('alertdialog');
      expect(
        within(dialog).getByText('Ya existe un fallo con ese número en ese tribunal'),
      ).toBeTruthy();
      const repeated = within(screen.getByLabelText('Fallo con el que coincide'));
      expect(repeated.getByText('14/08/2020')).toBeTruthy();
      expect(repeated.getByText('Cámara Civil, Sala B')).toBeTruthy();
      expect(repeated.getByText(/Nº 5678\/2019/)).toBeTruthy();
      const link = repeated.getByRole('link', { name: 'Muñoz c/ Clínica del Sur' });
      expect(link.getAttribute('href')).toBe('/panel/jurisprudencia/3');
      expect(link.getAttribute('target')).toBe('_blank');
    });

    it('"Guardar igual" repite la carga con la confirmación y lleva a la ficha', async () => {
      const createRuling = vi
        .fn()
        .mockRejectedValueOnce(repeatedQuestion())
        .mockResolvedValueOnce(testFalloDetalle({ id: 9 }));
      const service = await openNew({ createRuling });
      const user = userEvent.setup();
      await fillValid(user);
      await save(user);

      await user.click(await screen.findByRole('button', { name: 'Guardar igual' }));

      expect(await screen.findByRole('heading', { name: 'Fallo', level: 1 })).toBeTruthy();
      expect(service.createRuling).toHaveBeenCalledTimes(2);
      expect(service.createRuling.mock.calls[0][0]).not.toHaveProperty('confirmarRepetido');
      expect(service.createRuling.mock.calls[1][0]).toMatchObject({
        caratula: 'Pérez c/ López s/ daños',
        confirmarRepetido: true,
      });
    });

    it('"Cancelar" no guarda y deja el formulario como estaba', async () => {
      const service = await openNew({
        createRuling: vi.fn().mockRejectedValue(repeatedQuestion()),
      });
      const user = userEvent.setup();
      await fillValid(user);
      await save(user);

      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(service.createRuling).toHaveBeenCalledTimes(1);
      expect((screen.getByLabelText('Carátula') as HTMLInputElement).value).toBe(
        'Pérez c/ López s/ daños',
      );
      expect(screen.getByRole('heading', { name: 'Nuevo fallo', level: 1 })).toBeTruthy();
    });
  });

  it('muestra los mensajes de la API si rechaza la carga', async () => {
    await openNew({
      createRuling: vi
        .fn()
        .mockRejectedValue(new ApiError(400, ['El sumario no puede tener más de 5000 caracteres'])),
    });
    const user = userEvent.setup();
    await fillValid(user);

    await save(user);

    expect((await screen.findByRole('alert')).textContent).toContain(
      'El sumario no puede tener más de 5000 caracteres',
    );
    expect(screen.getByRole('heading', { name: 'Nuevo fallo', level: 1 })).toBeTruthy();
  });

  it('escribir consulta la sesión como mucho una vez cada 5 minutos (RF-20)', async () => {
    let now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const service = await openNew();
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    change('Sumario', 'a');
    change('Carátula', 'b');
    await flush();
    expect(service.keepSessionAlive).not.toHaveBeenCalled();

    now += 5 * MINUTE;
    change('Sumario', 'ab');
    change('Sumario', 'abc');
    change('Tribunal', 'c');
    await vi.waitFor(() => expect(service.keepSessionAlive).toHaveBeenCalledTimes(1));

    now += 4 * MINUTE;
    change('Sumario', 'abcd');
    await flush();
    expect(service.keepSessionAlive).toHaveBeenCalledTimes(1);

    now += MINUTE;
    fireEvent.change(screen.getByLabelText('Palabras clave'), { target: { value: 'da' } });
    await vi.waitFor(() => expect(service.keepSessionAlive).toHaveBeenCalledTimes(2));
  });

  it('sin escribir, no consulta la sesión aunque pase el tiempo (RF-20)', async () => {
    let now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const service = await openNew();

    now += 120 * MINUTE;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(service.keepSessionAlive).not.toHaveBeenCalled();
  });

  it('"Cancelar" del formulario vuelve al listado sin guardar', async () => {
    const service = await openNew();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(await screen.findByRole('heading', { name: 'Jurisprudencia', level: 1 })).toBeTruthy();
    expect(service.createRuling).not.toHaveBeenCalled();
  });

  it('no guarda nada en el almacenamiento del navegador (principio 5)', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await openNew();
    const user = userEvent.setup();

    await fillValid(user);
    await save(user);
    await screen.findByRole('heading', { name: 'Fallo', level: 1 });

    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
