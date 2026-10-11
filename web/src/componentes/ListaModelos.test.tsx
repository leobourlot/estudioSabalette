import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { fakeModelosService, modeloPage, testModeloResumen } from '../pruebas/modelos-de-prueba';
import type { ModelosService } from '../servicios/modelos-escritos';
import type { ModelListState } from '../servicios/sesion-escrito';
import { ListaModelos } from './ListaModelos';
import { ProveedorServicios } from './ProveedorServicios';

const THREE = [
  testModeloResumen({ id: 1, titulo: 'Cédula de notificación', tipo: 'cedula', fuero: 'laboral' }),
  testModeloResumen({
    id: 2,
    titulo: 'Demanda de daños',
    tipo: 'demanda',
    fuero: 'civil',
    descripcion: null,
  }),
  testModeloResumen({
    id: 3,
    titulo: 'Oficio viejo',
    tipo: 'oficio',
    fuero: 'otro',
    activo: false,
  }),
];

interface Options {
  modelos?: ModelosService;
  showDeactivated?: boolean;
  initialState?: ModelListState;
}

function renderList(options: Options = {}) {
  const modelos = options.modelos ?? fakeModelosService();
  render(
    <MemoryRouter>
      <ProveedorServicios services={{ modelos }}>
        <ListaModelos
          showDeactivated={options.showDeactivated ?? true}
          initialState={options.initialState}
          rowLink={(modelo) => ({ to: `/destino/${modelo.id}` })}
        />
      </ProveedorServicios>
    </MemoryRouter>,
  );
  return modelos as ReturnType<typeof fakeModelosService>;
}

const withModels = (page = modeloPage(THREE)) =>
  fakeModelosService({ listModels: vi.fn().mockResolvedValue(page) });

describe('ListaModelos: filas (RF-19)', () => {
  it('muestra de cada modelo su título, tipo, fuero y descripción, y nunca su texto', async () => {
    renderList({ modelos: withModels() });

    const row = await screen.findByRole('listitem', { name: 'Cédula de notificación' });
    expect(within(row).getByText('Cédula')).toBeTruthy();
    expect(within(row).getByText('Laboral')).toBeTruthy();
    expect(within(row).getByText('Para pedir un informe de dominio')).toBeTruthy();
    expect(screen.queryByText(/Señor Director/)).toBeNull();
  });

  it('el título lleva al destino que indica quien usa la lista', async () => {
    renderList({ modelos: withModels() });

    const link = await screen.findByRole('link', { name: 'Demanda de daños' });

    expect(link.getAttribute('href')).toBe('/destino/2');
  });

  it('un modelo sin fuero específico se muestra con el fuero Otro', async () => {
    renderList({ modelos: withModels() });

    const row = await screen.findByRole('listitem', { name: 'Oficio viejo' });

    expect(within(row).getByText('Otro')).toBeTruthy();
  });

  it('un modelo desactivado lleva la etiqueta "Desactivado"', async () => {
    renderList({ modelos: withModels() });

    const deactivated = await screen.findByRole('listitem', { name: 'Oficio viejo' });
    const active = screen.getByRole('listitem', { name: 'Demanda de daños' });

    expect(within(deactivated).getByText('Desactivado')).toBeTruthy();
    expect(within(active).queryByText('Desactivado')).toBeNull();
  });
});

describe('ListaModelos: filtros y buscador (RF-20 a RF-22)', () => {
  it('abre sin ningún filtro elegido y pide la primera página', async () => {
    const modelos = renderList({ modelos: withModels() });
    await screen.findByRole('list', { name: 'Lista de modelos' });

    expect(modelos.listModels).toHaveBeenCalledExactlyOnceWith({ pagina: 1 });
    expect((screen.getByLabelText('Buscar') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Tipo de escrito') as HTMLSelectElement).value).toBe('');
    expect((screen.getByLabelText('Fuero') as HTMLSelectElement).value).toBe('');
    expect((screen.getByLabelText('Mostrar desactivados') as HTMLInputElement).checked).toBe(false);
  });

  it('cada filtro llama al servicio con sus parámetros', async () => {
    const modelos = renderList({ modelos: withModels() });
    const user = userEvent.setup();
    await screen.findByRole('list', { name: 'Lista de modelos' });

    await user.selectOptions(screen.getByLabelText('Tipo de escrito'), 'cedula');
    expect(modelos.listModels).toHaveBeenLastCalledWith({ pagina: 1, tipo: 'cedula' });

    await user.selectOptions(screen.getByLabelText('Fuero'), 'laboral');
    expect(modelos.listModels).toHaveBeenLastCalledWith({
      pagina: 1,
      tipo: 'cedula',
      fuero: 'laboral',
    });

    await user.click(screen.getByLabelText('Mostrar desactivados'));
    expect(modelos.listModels).toHaveBeenLastCalledWith({
      pagina: 1,
      tipo: 'cedula',
      fuero: 'laboral',
      incluirDesactivados: true,
    });
  });

  it('aplica el buscador al enviarlo, no mientras se escribe, y envía el texto convertido', async () => {
    const modelos = renderList({ modelos: withModels() });
    const user = userEvent.setup();
    await screen.findByRole('list', { name: 'Lista de modelos' });

    await user.type(screen.getByLabelText('Buscar'), '  “cédula”  ');
    expect(modelos.listModels).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(modelos.listModels).toHaveBeenLastCalledWith({ pagina: 1, buscar: '"cédula"' });
  });

  it('una búsqueda con caracteres no permitidos muestra el error sin llamar al servicio', async () => {
    const modelos = renderList({ modelos: withModels() });
    const user = userEvent.setup();
    await screen.findByRole('list', { name: 'Lista de modelos' });

    await user.type(screen.getByLabelText('Buscar'), '<script>');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(screen.getByText('La búsqueda tiene caracteres no permitidos')).toBeTruthy();
    expect(modelos.listModels).toHaveBeenCalledTimes(1);
  });

  it('acepta buscar una variable y un email', async () => {
    const modelos = renderList({ modelos: withModels() });
    const user = userEvent.setup();
    await screen.findByRole('list', { name: 'Lista de modelos' });

    await user.type(screen.getByLabelText('Buscar'), '#JUZGADO#');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(modelos.listModels).toHaveBeenLastCalledWith({ pagina: 1, buscar: '#JUZGADO#' });

    await user.clear(screen.getByLabelText('Buscar'));
    await user.type(screen.getByLabelText('Buscar'), '@ejemplo.com');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(modelos.listModels).toHaveBeenLastCalledWith({ pagina: 1, buscar: '@ejemplo.com' });
  });

  it('sin "Mostrar desactivados", no ofrece la casilla ni pide los desactivados (RF-29)', async () => {
    const modelos = renderList({ modelos: withModels(), showDeactivated: false });
    const user = userEvent.setup();
    await screen.findByRole('list', { name: 'Lista de modelos' });

    expect(screen.queryByLabelText('Mostrar desactivados')).toBeNull();
    await user.selectOptions(screen.getByLabelText('Fuero'), 'civil');

    for (const [query] of modelos.listModels.mock.calls) {
      expect(query).not.toHaveProperty('incluirDesactivados');
    }
  });
});

describe('ListaModelos: paginado (RF-18, RF-24)', () => {
  it('"Siguiente" y "Anterior" piden la página que corresponde, sin totales', async () => {
    const listModels = vi.fn(async ({ pagina = 1 }: { pagina?: number } = {}) =>
      modeloPage(THREE, { pagina, haySiguiente: pagina < 3 }),
    );
    const modelos = renderList({ modelos: fakeModelosService({ listModels }) });
    const user = userEvent.setup();
    await screen.findByRole('list', { name: 'Lista de modelos' });

    expect(screen.getByText('Página 1')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Anterior' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.queryByText(/de \d+|total/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Página 2')).toBeTruthy();
    expect(modelos.listModels).toHaveBeenLastCalledWith({ pagina: 2 });

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Página 3')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Siguiente' }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(await screen.findByText('Página 2')).toBeTruthy();
  });

  it('cambiar un filtro o buscar vuelve a la primera página', async () => {
    const listModels = vi.fn(async ({ pagina = 1 }: { pagina?: number } = {}) =>
      modeloPage(THREE, { pagina, haySiguiente: true }),
    );
    const modelos = renderList({ modelos: fakeModelosService({ listModels }) });
    const user = userEvent.setup();
    await screen.findByRole('list', { name: 'Lista de modelos' });
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByText('Página 2');

    await user.selectOptions(screen.getByLabelText('Tipo de escrito'), 'oficio');
    expect(await screen.findByText('Página 1')).toBeTruthy();
    expect(modelos.listModels).toHaveBeenLastCalledWith({ pagina: 1, tipo: 'oficio' });

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByText('Página 2');
    await user.type(screen.getByLabelText('Buscar'), 'banco');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByText('Página 1')).toBeTruthy();
    expect(modelos.listModels).toHaveBeenLastCalledWith({
      pagina: 1,
      tipo: 'oficio',
      buscar: 'banco',
    });
  });

  it('con un estado inicial abre en esa página, con esa búsqueda y esos filtros (RF-32)', async () => {
    const modelos = renderList({
      modelos: withModels(modeloPage(THREE, { pagina: 3 })),
      showDeactivated: false,
      initialState: {
        filtros: { buscar: 'oficio', tipo: 'oficio', fuero: 'laboral', incluirDesactivados: false },
        pagina: 3,
      },
    });
    await screen.findByRole('list', { name: 'Lista de modelos' });

    expect(modelos.listModels).toHaveBeenCalledExactlyOnceWith({
      pagina: 3,
      buscar: 'oficio',
      tipo: 'oficio',
      fuero: 'laboral',
    });
    expect((screen.getByLabelText('Buscar') as HTMLInputElement).value).toBe('oficio');
    expect((screen.getByLabelText('Tipo de escrito') as HTMLSelectElement).value).toBe('oficio');
    expect((screen.getByLabelText('Fuero') as HTMLSelectElement).value).toBe('laboral');
    expect(screen.getByText('Página 3')).toBeTruthy();
  });

  it('cada fila recibe la página y los filtros del momento, para poder volver', async () => {
    const rowLink = vi.fn(() => ({ to: '/destino' }));
    const modelos = withModels();
    render(
      <MemoryRouter>
        <ProveedorServicios services={{ modelos }}>
          <ListaModelos showDeactivated={false} rowLink={rowLink} />
        </ProveedorServicios>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await screen.findByRole('list', { name: 'Lista de modelos' });

    await user.selectOptions(screen.getByLabelText('Fuero'), 'civil');
    await screen.findByRole('list', { name: 'Lista de modelos' });

    expect(rowLink).toHaveBeenLastCalledWith(THREE[2], {
      filtros: { buscar: '', tipo: '', fuero: 'civil', incluirDesactivados: false },
      pagina: 1,
    });
  });
});

describe('ListaModelos: listado vacío y errores (RF-23, RF-24)', () => {
  it('sin ningún modelo, avisa que todavía no hay modelos cargados', async () => {
    renderList({ modelos: withModels(modeloPage([], { hayModelos: false })) });

    expect(await screen.findByText('Todavía no hay modelos cargados')).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Lista de modelos' })).toBeNull();
  });

  it('con modelos que no coinciden, avisa que ninguno coincide con la búsqueda', async () => {
    renderList({ modelos: withModels(modeloPage([], { hayModelos: true })) });

    expect(await screen.findByText('No hay modelos que coincidan con la búsqueda')).toBeTruthy();
  });

  it('en una página que no existe no muestra mensaje y ofrece volver a la primera', async () => {
    const listModels = vi.fn(async ({ pagina = 1 }: { pagina?: number } = {}) =>
      pagina === 1 ? modeloPage(THREE) : modeloPage([], { pagina }),
    );
    const modelos = renderList({
      modelos: fakeModelosService({ listModels }),
      initialState: {
        filtros: { buscar: '', tipo: '', fuero: '', incluirDesactivados: false },
        pagina: 9,
      },
    });
    const user = userEvent.setup();

    const back = await screen.findByRole('button', { name: 'Volver a la primera página' });
    expect(screen.queryByText('No hay modelos que coincidan con la búsqueda')).toBeNull();
    expect(screen.queryByText('Todavía no hay modelos cargados')).toBeNull();

    await user.click(back);
    expect(await screen.findByRole('list', { name: 'Lista de modelos' })).toBeTruthy();
    expect(modelos.listModels).toHaveBeenLastCalledWith({ pagina: 1 });
  });

  it('muestra el error de la API si el listado falla', async () => {
    renderList({
      modelos: fakeModelosService({ listModels: vi.fn().mockRejectedValue(new Error('sin red')) }),
    });

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Ocurrió un error inesperado. Intentá de nuevo.',
    );
  });
});
