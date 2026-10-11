import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  currentPath,
  fakeModelosService,
  lawyerSession,
  modeloPage,
  renderModelsApp,
  testModeloResumen,
} from '../pruebas/modelos-de-prueba';

const MODELS = [
  testModeloResumen({ id: 1, titulo: 'Cédula de notificación', tipo: 'cedula', fuero: 'laboral' }),
  testModeloResumen({ id: 2, titulo: 'Demanda de daños', tipo: 'demanda' }),
  testModeloResumen({ id: 3, titulo: 'Oficio viejo', activo: false }),
];

async function openSection(page = modeloPage(MODELS)) {
  const modelos = fakeModelosService({ listModels: vi.fn().mockResolvedValue(page) });
  renderModelsApp('/panel/modelos', { session: lawyerSession(), modelos });
  await screen.findByRole('heading', { name: 'Modelos', level: 1 });
  return modelos;
}

describe('PanelModelos (RF-18, RF-22)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('al abrir, carga la primera página sin filtros y muestra cada modelo', async () => {
    const modelos = await openSection();

    const rows = within(await screen.findByRole('list', { name: 'Lista de modelos' })).getAllByRole(
      'listitem',
    );

    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
      'Cédula de notificación',
      'Demanda de daños',
      'Oficio viejo',
    ]);
    expect(modelos.listModels).toHaveBeenCalledExactlyOnceWith({ pagina: 1 });
  });

  it('cada fila lleva a la ficha del modelo', async () => {
    await openSection();

    const link = await screen.findByRole('link', { name: 'Demanda de daños' });
    expect(link.getAttribute('href')).toBe('/panel/modelos/2');

    await userEvent.setup().click(link);
    expect(await screen.findByRole('heading', { name: 'Modelo', level: 1 })).toBeTruthy();
    expect(currentPath()).toBe('/panel/modelos/2');
  });

  it('"Nuevo modelo" lleva al formulario de carga', async () => {
    await openSection();

    await userEvent.setup().click(screen.getByRole('link', { name: 'Nuevo modelo' }));

    expect(await screen.findByRole('heading', { name: 'Nuevo modelo', level: 1 })).toBeTruthy();
  });

  it('"Mostrar desactivados" pide también los modelos desactivados', async () => {
    const modelos = await openSection();
    await screen.findByRole('list', { name: 'Lista de modelos' });

    await userEvent.setup().click(screen.getByLabelText('Mostrar desactivados'));

    expect(modelos.listModels).toHaveBeenLastCalledWith({ pagina: 1, incluirDesactivados: true });
  });

  it('sin modelos, muestra el mensaje de la sección vacía y el acceso para cargar el primero', async () => {
    await openSection(modeloPage([], { hayModelos: false }));

    expect(await screen.findByText('Todavía no hay modelos cargados')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Nuevo modelo' })).toBeTruthy();
  });

  it('no guarda nada en el almacenamiento del navegador (principio 5)', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await openSection();
    const user = userEvent.setup();
    await screen.findByRole('list', { name: 'Lista de modelos' });

    await user.selectOptions(screen.getByLabelText('Fuero'), 'civil');
    await user.type(screen.getByLabelText('Buscar'), 'oficio');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await screen.findByRole('list', { name: 'Lista de modelos' });

    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
