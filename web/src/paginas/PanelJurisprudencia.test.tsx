import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeSessionService, testUser } from '../pruebas/aplicacion-de-prueba';
import {
  fakeJurisprudenciaService,
  falloPage,
  renderRulingsApp,
  testFalloResumen,
  testSuggestion,
} from '../pruebas/jurisprudencia-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import type { FalloPage, ListFallosQuery } from '../servicios/jurisprudencia';

const fallos = [
  testFalloResumen({ id: 5 }),
  testFalloResumen({
    id: 6,
    caratula: 'Muñoz c/ Clínica del Sur',
    tribunal: 'Cámara Federal de Rosario',
    fuero: 'federal',
    fecha: '2021-03-10',
    numero: null,
    sumario: `${'a'.repeat(300)}${'b'.repeat(40)}`,
    palabrasClave: [{ id: 3, texto: 'mala praxis' }],
  }),
  testFalloResumen({ id: 7, caratula: 'Fallo viejo', activo: false }),
];

async function openList(
  listRulings: (query?: ListFallosQuery) => Promise<FalloPage> = async () => falloPage(fallos),
) {
  const service = fakeJurisprudenciaService({
    listRulings: vi.fn(listRulings),
    suggestKeywords: vi.fn().mockResolvedValue([testSuggestion(1, 'daño moral', 12)]),
  });
  renderRulingsApp(
    '/panel/jurisprudencia',
    fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(testUser('abogado')) }),
    service,
  );
  await screen.findByRole('heading', { name: 'Jurisprudencia', level: 1 });
  return service;
}

const lastQuery = (service: ReturnType<typeof fakeJurisprudenciaService>) =>
  service.listRulings.mock.calls.at(-1)?.[0];

const rows = async () =>
  within(await screen.findByRole('list', { name: 'Lista de fallos' })).getAllByRole('listitem', {
    name: /\d{2}\/\d{2}\/\d{4}/,
  });

describe('PanelJurisprudencia (RF-21 a RF-28)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('al abrir, carga la primera página y muestra cada fallo', async () => {
    const service = await openList();

    expect(lastQuery(service)).toEqual({ pagina: 1 });
    const list = await rows();
    expect(list).toHaveLength(3);
    expect(
      within(list[0]).getByRole('link', { name: 'Pérez c/ López s/ daños' }).getAttribute('href'),
    ).toBe('/panel/jurisprudencia/5');
    expect(within(list[1]).getByText('10/03/2021')).toBeTruthy();
    expect(within(list[1]).getByText('Federal')).toBeTruthy();
    expect(within(list[1]).getByText('mala praxis')).toBeTruthy();
  });

  it('recorta el sumario a 300 caracteres, con "Ver más" y "Ver menos" (RF-22)', async () => {
    await openList();
    const user = userEvent.setup();
    const row = (await rows())[1];

    expect(within(row).getByText(`${'a'.repeat(300)}…`)).toBeTruthy();
    await user.click(within(row).getByRole('button', { name: 'Ver más' }));
    expect(within(row).getByText(`${'a'.repeat(300)}${'b'.repeat(40)}`)).toBeTruthy();
    await user.click(within(row).getByRole('button', { name: 'Ver menos' }));
    expect(within(row).getByText(`${'a'.repeat(300)}…`)).toBeTruthy();
  });

  it('identifica los fallos desactivados (RF-25)', async () => {
    await openList();
    const list = await rows();

    expect(within(list[2]).getByText('Desactivado')).toBeTruthy();
    expect(within(list[0]).queryByText('Desactivado')).toBeNull();
  });

  it('ofrece cargar un fallo nuevo', async () => {
    await openList();

    expect(screen.getByRole('link', { name: 'Nuevo fallo' }).getAttribute('href')).toBe(
      '/panel/jurisprudencia/nuevo',
    );
  });

  describe('buscador y filtros', () => {
    it('buscar llama al servicio con el texto convertido y vuelve a la página 1', async () => {
      const service = await openList(async () => falloPage(fallos, { haySiguiente: true }));
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Siguiente' }));
      await vi.waitFor(() => expect(lastQuery(service)).toEqual({ pagina: 2 }));

      await user.type(screen.getByLabelText('Buscar'), '  “daño”  moral ');
      await user.click(screen.getByRole('button', { name: 'Buscar' }));

      await vi.waitFor(() =>
        expect(lastQuery(service)).toEqual({ pagina: 1, buscar: '"daño" moral' }),
      );
    });

    it('cada filtro llama al servicio con sus parámetros', async () => {
      const service = await openList();
      const user = userEvent.setup();

      await user.selectOptions(screen.getByLabelText('Fuero'), 'civil');
      await vi.waitFor(() => expect(lastQuery(service)).toEqual({ pagina: 1, fuero: 'civil' }));

      fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2015-01-01' } });
      fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2020-12-31' } });
      await user.click(screen.getByLabelText('Mostrar desactivados'));

      await vi.waitFor(() =>
        expect(lastQuery(service)).toEqual({
          pagina: 1,
          fuero: 'civil',
          desde: '2015-01-01',
          hasta: '2020-12-31',
          incluirDesactivados: true,
        }),
      );
    });

    it('el filtro por palabras clave envía los ids de las elegidas (RF-25)', async () => {
      const service = await openList();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('Palabras clave'), 'da');
      await user.click(await screen.findByRole('button', { name: 'daño moral (12)' }));

      expect(service.suggestKeywords).toHaveBeenCalledWith('da', 'filtro');
      await vi.waitFor(() => expect(lastQuery(service)).toEqual({ pagina: 1, palabrasClave: [1] }));
    });

    it('una búsqueda con caracteres no permitidos no llama al servicio (RF-24)', async () => {
      const service = await openList();
      const user = userEvent.setup();
      await rows();
      const calls = service.listRulings.mock.calls.length;

      await user.type(screen.getByLabelText('Buscar'), '<script>');
      await user.click(screen.getByRole('button', { name: 'Buscar' }));

      expect(
        screen.getByText('La búsqueda tiene caracteres no permitidos', { exact: false }),
      ).toBeTruthy();
      expect(service.listRulings.mock.calls).toHaveLength(calls);
    });
  });

  describe('paginado (RF-21, RF-28)', () => {
    it('muestra "Anterior" y "Siguiente" según la página y haySiguiente, sin totales', async () => {
      const service = await openList(async (query) =>
        falloPage(fallos, { pagina: query?.pagina, haySiguiente: (query?.pagina ?? 1) < 2 }),
      );
      const user = userEvent.setup();
      const pagination = within(await screen.findByRole('navigation', { name: 'Paginación' }));

      expect(
        (pagination.getByRole('button', { name: 'Anterior' }) as HTMLButtonElement).disabled,
      ).toBe(true);
      expect(
        (pagination.getByRole('button', { name: 'Siguiente' }) as HTMLButtonElement).disabled,
      ).toBe(false);
      expect(pagination.getByText('Página 1')).toBeTruthy();

      await user.click(pagination.getByRole('button', { name: 'Siguiente' }));

      await vi.waitFor(() => expect(lastQuery(service)).toEqual({ pagina: 2 }));
      await screen.findByText('Página 2');
      const second = within(screen.getByRole('navigation', { name: 'Paginación' }));
      expect((second.getByRole('button', { name: 'Anterior' }) as HTMLButtonElement).disabled).toBe(
        false,
      );
      expect(
        (second.getByRole('button', { name: 'Siguiente' }) as HTMLButtonElement).disabled,
      ).toBe(true);
      // Nunca muestra totales de fallos ni de páginas.
      expect(screen.queryByText(/ de \d+/)).toBeNull();
      expect(screen.queryByText(/\d+ fallos/)).toBeNull();
    });

    it('una página que no existe no muestra mensajes y ofrece volver a la primera (RF-28)', async () => {
      // La página 2 queda vacía, como si los fallos se hubieran desactivado mientras se paginaba.
      const service = await openList(async (query) =>
        query?.pagina === 2
          ? falloPage([], { pagina: 2, hayFallos: true })
          : falloPage(fallos, { haySiguiente: true }),
      );
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Siguiente' }));

      const back = await screen.findByRole('button', { name: 'Volver a la primera página' });
      expect(screen.queryByText('No hay fallos que coincidan con la búsqueda')).toBeNull();
      expect(screen.queryByText('Todavía no hay fallos cargados')).toBeNull();
      expect(screen.queryByRole('list', { name: 'Lista de fallos' })).toBeNull();

      await user.click(back);

      await vi.waitFor(() => expect(lastQuery(service)).toEqual({ pagina: 1 }));
      expect(await rows()).toHaveLength(3);
    });
  });

  describe('listado vacío (RF-27)', () => {
    it('sin fallos: "Todavía no hay fallos cargados"', async () => {
      await openList(async () => falloPage([], { hayFallos: false }));

      expect(await screen.findByText('Todavía no hay fallos cargados')).toBeTruthy();
      expect(screen.queryByRole('navigation', { name: 'Paginación' })).toBeNull();
    });

    it('con fallos que no coinciden: "No hay fallos que coincidan con la búsqueda"', async () => {
      await openList(async () => falloPage([], { hayFallos: true }));

      expect(await screen.findByText('No hay fallos que coincidan con la búsqueda')).toBeTruthy();
    });

    it('sin fallos y con una búsqueda escrita, igual dice que no hay fallos cargados', async () => {
      await openList(async () => falloPage([], { hayFallos: false }));
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('Buscar'), 'daño');
      await user.click(screen.getByRole('button', { name: 'Buscar' }));

      expect(await screen.findByText('Todavía no hay fallos cargados')).toBeTruthy();
      expect(screen.queryByText('No hay fallos que coincidan con la búsqueda')).toBeNull();
    });
  });

  it('muestra el error de la API si el listado falla', async () => {
    await openList(async () => {
      throw new ApiError(500, ['Ocurrió un error inesperado']);
    });

    expect((await screen.findByRole('alert')).textContent).toBe('Ocurrió un error inesperado');
  });

  it('no guarda nada en el almacenamiento del navegador (principio 5)', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await openList();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText('Fuero'), 'civil');
    await user.type(screen.getByLabelText('Buscar'), 'daño');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await rows();

    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
