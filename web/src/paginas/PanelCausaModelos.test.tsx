import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeCausasService, testCausaDetalle } from '../pruebas/causas-de-prueba';
import {
  currentLocationState,
  currentPath,
  fakeModelosService,
  lawyerSession,
  modeloPage,
  renderModelsApp,
  testModeloResumen,
} from '../pruebas/modelos-de-prueba';
import type { CausaDetalle } from '../servicios/causas';
import { ApiError } from '../servicios/cliente-http';
import type { ModelFilters } from '../servicios/formulario-modelo';

const MODELS = [
  testModeloResumen({ id: 1, titulo: 'Cédula laboral', tipo: 'cedula', fuero: 'laboral' }),
  testModeloResumen({ id: 2, titulo: 'Demanda civil', tipo: 'demanda', fuero: 'civil' }),
  testModeloResumen({ id: 3, titulo: 'Oficio general', tipo: 'oficio', fuero: 'otro' }),
];

const CAUSA = testCausaDetalle({ id: 5, caratula: 'Gómez, Luis c/ Acme S.A.', fuero: 'penal' });

async function openPicker(options: { causa?: CausaDetalle; state?: unknown } = {}) {
  const causa = options.causa ?? CAUSA;
  const modelos = fakeModelosService({
    listModels: vi.fn(async ({ pagina = 1 }: { pagina?: number } = {}) =>
      modeloPage(MODELS, { pagina, haySiguiente: pagina < 3 }),
    ),
  });
  const causas = fakeCausasService({ getCausa: vi.fn().mockResolvedValue(causa) });
  renderModelsApp(`/panel/causas/${causa.id}/modelos`, {
    session: lawyerSession(),
    modelos,
    causas,
    state: options.state,
  });
  await screen.findByRole('heading', { name: 'Completar un modelo', level: 1 });
  return { modelos, causas };
}

const list = () => screen.findByRole('list', { name: 'Lista de modelos' });

describe('PanelCausaModelos (RF-29, RF-30, RF-41)', () => {
  it('pide la causa de la dirección y muestra su carátula', async () => {
    const { causas } = await openPicker();

    expect(await screen.findByText('Gómez, Luis c/ Acme S.A.')).toBeTruthy();
    expect(causas.getCausa).toHaveBeenCalledExactlyOnceWith(5);
  });

  it('ofrece todos los modelos activos, sea cual sea el fuero de la causa', async () => {
    const { modelos } = await openPicker();

    const rows = within(await list()).getAllByRole('listitem');

    // La causa es penal: igual aparecen los modelos laborales, civiles y los de fuero Otro.
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
      'Cédula laboral',
      'Demanda civil',
      'Oficio general',
    ]);
    expect(modelos.listModels).toHaveBeenCalledExactlyOnceWith({ pagina: 1 });
  });

  it('abre sin ningún filtro elegido, y sin "Mostrar desactivados"', async () => {
    const { modelos } = await openPicker();
    await list();

    expect((screen.getByLabelText('Buscar') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Tipo de escrito') as HTMLSelectElement).value).toBe('');
    expect((screen.getByLabelText('Fuero') as HTMLSelectElement).value).toBe('');
    expect(screen.queryByLabelText('Mostrar desactivados')).toBeNull();
    for (const [query] of modelos.listModels.mock.calls) {
      expect(query).not.toHaveProperty('incluirDesactivados');
    }
  });

  it('los filtros y el buscador funcionan como en la sección de modelos, sin pedir desactivados', async () => {
    const { modelos } = await openPicker();
    const user = userEvent.setup();
    await list();

    await user.selectOptions(screen.getByLabelText('Fuero'), 'laboral');
    await user.type(screen.getByLabelText('Buscar'), 'cédula');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(modelos.listModels).toHaveBeenLastCalledWith({
      pagina: 1,
      buscar: 'cédula',
      fuero: 'laboral',
    });
    for (const [query] of modelos.listModels.mock.calls) {
      expect(query).not.toHaveProperty('incluirDesactivados');
    }
  });

  it('cada fila lleva al escrito de ese modelo en esta causa', async () => {
    await openPicker();

    const link = within(await list()).getByRole('link', { name: 'Demanda civil' });

    expect(link.getAttribute('href')).toBe('/panel/causas/5/modelos/2');
  });

  it('al elegir un modelo, lleva la página, la búsqueda y los filtros en el estado de navegación (RF-32)', async () => {
    await openPicker();
    const user = userEvent.setup();
    await list();
    await user.selectOptions(screen.getByLabelText('Tipo de escrito'), 'demanda');
    await user.type(screen.getByLabelText('Buscar'), 'civil');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByText('Página 2');

    await user.click(within(await list()).getByRole('link', { name: 'Demanda civil' }));

    expect(await screen.findByRole('heading', { name: 'Escrito', level: 1 })).toBeTruthy();
    expect(currentPath()).toBe('/panel/causas/5/modelos/2');
    expect(currentLocationState()).toEqual({
      listaDeModelos: {
        filtros: { buscar: 'civil', tipo: 'demanda', fuero: '', incluirDesactivados: false },
        pagina: 2,
      },
    });
  });

  it('al volver desde un escrito, abre en la misma página con la misma búsqueda y los mismos filtros (RF-32)', async () => {
    const filtros: ModelFilters = {
      buscar: 'oficio',
      tipo: 'oficio',
      fuero: 'laboral',
      incluirDesactivados: false,
    };
    const { modelos } = await openPicker({ state: { listaDeModelos: { filtros, pagina: 2 } } });
    await list();

    expect(modelos.listModels).toHaveBeenCalledExactlyOnceWith({
      pagina: 2,
      buscar: 'oficio',
      tipo: 'oficio',
      fuero: 'laboral',
    });
    expect((screen.getByLabelText('Buscar') as HTMLInputElement).value).toBe('oficio');
    expect(screen.getByText('Página 2')).toBeTruthy();
  });

  it('con un estado de navegación de otra pantalla, abre como siempre', async () => {
    const { modelos } = await openPicker({ state: { avisos: { rechazos: [] } } });
    await list();

    expect(modelos.listModels).toHaveBeenCalledExactlyOnceWith({ pagina: 1 });
  });

  it('sin modelos activos, muestra "Todavía no hay modelos cargados"', async () => {
    const modelos = fakeModelosService();
    renderModelsApp('/panel/causas/5/modelos', {
      session: lawyerSession(),
      modelos,
      causas: fakeCausasService({ getCausa: vi.fn().mockResolvedValue(CAUSA) }),
    });

    expect(await screen.findByText('Todavía no hay modelos cargados')).toBeTruthy();
  });

  it('tiene un acceso para volver a la causa', async () => {
    await openPicker();

    const link = await screen.findByRole('link', { name: 'Volver a la causa' });

    expect(link.getAttribute('href')).toBe('/panel/causas/5');
  });

  it('en una causa desactivada avisa y no lista modelos (RF-41)', async () => {
    const { modelos } = await openPicker({
      causa: testCausaDetalle({ id: 5, caratula: 'Gómez, Luis c/ Acme S.A.', activa: false }),
    });

    expect(await screen.findByText('La causa está desactivada')).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Lista de modelos' })).toBeNull();
    expect(screen.queryByLabelText('Buscar')).toBeNull();
    expect(modelos.listModels).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Volver a la causa' })).toBeTruthy();
  });

  it('si la causa no existe, muestra el mensaje de la API y no lista modelos (RF-49)', async () => {
    const modelos = fakeModelosService();
    renderModelsApp('/panel/causas/999/modelos', {
      session: lawyerSession(),
      modelos,
      causas: fakeCausasService({
        getCausa: vi.fn().mockRejectedValue(new ApiError(404, ['No existe esa causa'])),
      }),
    });

    expect((await screen.findByRole('alert')).textContent).toBe('No existe esa causa');
    expect(modelos.listModels).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Volver a las causas' })).toBeTruthy();
  });
});
