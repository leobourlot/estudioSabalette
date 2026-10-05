import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  causaPage,
  fakeCausasService,
  renderCausaPages,
  testCausa,
  testMember,
} from '../pruebas/causas-de-prueba';
import type { CausaPage } from '../servicios/causas';
import { ApiError } from '../servicios/cliente-http';

const causas = [
  testCausa({ id: 7 }),
  testCausa({
    id: 8,
    caratula: 'Incidente de embargo',
    numeroExpediente: '1234/2024',
    fuero: 'laboral',
    estado: 'archivada',
    esIncidente: true,
    expedientePrincipal: '1000/2023',
    responsable: testMember({ id: 3, nombre: 'Bruno', apellido: 'Méndez', activo: false }),
  }),
  testCausa({
    id: 9,
    caratula: 'Causa vieja',
    activa: false,
    juzgado: null,
    numeroExpediente: null,
  }),
];

const members = [
  testMember({ id: 1, nombre: 'Juan', apellido: 'Álvarez' }),
  testMember({ id: 3, nombre: 'Bruno', apellido: 'Méndez', activo: false }),
  testMember({ id: 4, nombre: 'Carla', apellido: 'Sabalette', rol: 'admin' }),
];

async function openList(listCausas: () => Promise<CausaPage> = async () => causaPage(causas)) {
  const service = fakeCausasService({
    listCausas: vi.fn(listCausas),
    listMembers: vi.fn().mockResolvedValue(members),
  });
  renderCausaPages('/panel/causas', service);
  await screen.findByRole('heading', { name: 'Causas', level: 1 });
  return service;
}

const lastQuery = (service: ReturnType<typeof fakeCausasService>) =>
  service.listCausas.mock.calls.at(-1)?.[0];

describe('PanelCausas (RF-36 a RF-39)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('al abrir, carga la primera página y muestra cada causa con sus datos', async () => {
    const service = await openList();

    expect(lastQuery(service)).toEqual({ pagina: 1 });
    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(4);
    const first = within(rows[1]);
    expect(
      first.getByRole('link', { name: 'Pérez, Juan c/ Gómez S.A. s/ daños' }).getAttribute('href'),
    ).toBe('/panel/causas/7');
    expect(first.getByText('1234/2024')).toBeTruthy();
    expect(first.getByText('Juzgado Civil N° 3')).toBeTruthy();
    expect(first.getByText('Civil')).toBeTruthy();
    expect(first.getByText('En trámite')).toBeTruthy();
    expect(first.getByText('Álvarez, Juan')).toBeTruthy();
  });

  it('marca los incidentes, los responsables desactivados y las causas desactivadas', async () => {
    await openList();

    const rows = await screen.findAllByRole('row');
    expect(within(rows[2]).getByText('Vinculado al expte. principal Nº 1000/2023')).toBeTruthy();
    expect(within(rows[2]).getByText('Méndez, Bruno (desactivado)')).toBeTruthy();
    expect(within(rows[3]).getByText('Desactivada')).toBeTruthy();
  });

  it('el buscador filtra por el texto y vuelve a la página 1 (RF-37)', async () => {
    const service = await openList(async () => causaPage(causas, 45));
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Siguiente' }));

    await user.type(screen.getByLabelText('Buscar'), 'pérez');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(lastQuery(service)).toEqual({ pagina: 1, buscar: 'pérez' });
  });

  it('filtra por fuero y por estado (RF-38)', async () => {
    const service = await openList();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText('Fuero'), 'laboral');
    expect(lastQuery(service)).toEqual({ pagina: 1, fuero: 'laboral' });

    await user.selectOptions(screen.getByLabelText('Estado'), 'archivada');
    expect(lastQuery(service)).toEqual({ pagina: 1, fuero: 'laboral', estado: 'archivada' });

    await user.selectOptions(screen.getByLabelText('Fuero'), '');
    expect(lastQuery(service)).toEqual({ pagina: 1, estado: 'archivada' });
  });

  it('el filtro de responsable ofrece solo integrantes activos (RF-38)', async () => {
    const service = await openList();
    const user = userEvent.setup();
    const select = screen.getByLabelText('Responsable');
    await within(select).findByRole('option', { name: 'Sabalette, Carla' });

    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Todos', 'Álvarez, Juan', 'Sabalette, Carla']);

    await user.selectOptions(select, '4');
    expect(lastQuery(service)).toEqual({ pagina: 1, responsableId: 4 });
  });

  it.each([
    ['Solo mis causas', 'mias'],
    ['Con responsable desactivado', 'responsableDesactivado'],
    ['Mostrar desactivadas', 'incluirDesactivadas'],
  ])('la casilla "%s" filtra y se puede desmarcar (RF-38, RF-39)', async (label, field) => {
    const service = await openList();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText(label));
    expect(lastQuery(service)).toEqual({ pagina: 1, [field]: true });

    await user.click(screen.getByLabelText(label));
    expect(lastQuery(service)).toEqual({ pagina: 1, [field]: false });
  });

  it('pagina de a 20 causas', async () => {
    const service = await openList(async () => causaPage(causas, 45));
    const user = userEvent.setup();

    expect(await screen.findByText('Página 1 de 3 · 45 causas')).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Anterior' }).disabled).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(lastQuery(service)).toEqual({ pagina: 2 });
  });

  it('avisa cuando no hay causas que coincidan', async () => {
    await openList(async () => causaPage([]));

    expect(await screen.findByText('No hay causas que coincidan.')).toBeTruthy();
  });

  it('muestra el error de la API', async () => {
    await openList(async () => {
      throw new ApiError(400, ['La búsqueda no puede tener más de 100 caracteres']);
    });

    expect((await screen.findByRole('alert')).textContent).toBe(
      'La búsqueda no puede tener más de 100 caracteres',
    );
  });

  it('tiene el enlace para dar de alta una causa', async () => {
    await openList();

    expect(screen.getByRole('link', { name: 'Nueva causa' }).getAttribute('href')).toBe(
      '/panel/causas/nueva',
    );
  });

  it('no guarda nada en el almacenamiento del navegador (principio 5)', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await openList();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText('Solo mis causas'));
    await user.type(screen.getByLabelText('Buscar'), 'pérez');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(setItem).not.toHaveBeenCalled();
  });
});
