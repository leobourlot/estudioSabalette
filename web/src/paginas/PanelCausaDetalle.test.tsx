import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  fakeCausasService,
  renderCausaPages,
  testCausaDetalle,
  testMember,
  testParte,
} from '../pruebas/causas-de-prueba';
import type { CausaDetalle } from '../servicios/causas';
import { ApiError } from '../servicios/cliente-http';

const detail = (overrides: Partial<CausaDetalle> = {}) =>
  testCausaDetalle({
    id: 7,
    caratula: 'Pérez, Juan c/ Gómez S.A. s/ daños',
    numeroExpediente: '1234/2024',
    juzgado: 'Juzgado Civil N° 3',
    fuero: 'laboral',
    estado: 'paralizada',
    colaboradores: [testMember({ id: 2, nombre: 'Lucía', apellido: 'Benítez' })],
    creadoEn: '2026-10-01T13:00:00.000Z',
    creadoPor: { id: 1, nombre: 'Juan', apellido: 'Álvarez' },
    ...overrides,
  });

async function openDetail(
  causa: CausaDetalle = detail(),
  overrides: Parameters<typeof fakeCausasService>[0] = {},
) {
  const causas = fakeCausasService({ getCausa: vi.fn().mockResolvedValue(causa), ...overrides });
  renderCausaPages(`/panel/causas/${causa.id}`, causas);
  await screen.findByRole('heading', { name: causa.caratula, level: 1 });
  return { causas, user: userEvent.setup() };
}

const dataSection = () => screen.getByRole('region', { name: 'Datos de la causa' });

describe('PanelCausaDetalle: datos y edición (RF-11, RF-12, RF-33, RF-41)', () => {
  it('muestra los datos de la causa, sus abogados y la marca de incidente', async () => {
    await openDetail(detail({ esIncidente: true, expedientePrincipal: '1000/2023' }));
    const data = within(dataSection());

    expect(data.getByText('1234/2024')).toBeTruthy();
    expect(data.getByText('Juzgado Civil N° 3')).toBeTruthy();
    expect(data.getByText('Laboral')).toBeTruthy();
    expect(data.getByText('Paralizada')).toBeTruthy();
    expect(data.getByText('Álvarez, Juan')).toBeTruthy();
    expect(data.getByText('Benítez, Lucía')).toBeTruthy();
    expect(data.getByText('Vinculado al expte. principal Nº 1000/2023')).toBeTruthy();
  });

  it('muestra la auditoría con fechas en hora de Buenos Aires (RF-2)', async () => {
    await openDetail(
      detail({
        modificadoEn: '2026-10-02T21:30:00.000Z',
        modificadoPor: { id: 2, nombre: 'Lucía', apellido: 'Benítez' },
      }),
    );

    expect(screen.getByText('Creada por Juan Álvarez el 01/10/2026 10:00')).toBeTruthy();
    expect(
      screen.getByText('Modificada por última vez por Lucía Benítez el 02/10/2026 18:30'),
    ).toBeTruthy();
  });

  it('una causa sin modificaciones lo indica', async () => {
    await openDetail();

    expect(screen.getByText('Sin modificaciones desde el alta')).toBeTruthy();
  });

  it('edita los datos y muestra la causa actualizada (RF-11)', async () => {
    const updateCausa = vi.fn().mockResolvedValue(detail({ estado: 'finalizada' }));
    const { causas, user } = await openDetail(detail(), { updateCausa });

    await user.click(screen.getByRole('button', { name: 'Editar datos' }));
    expect(screen.getByLabelText<HTMLInputElement>('Carátula').value).toBe(
      'Pérez, Juan c/ Gómez S.A. s/ daños',
    );
    await user.selectOptions(screen.getByLabelText('Estado'), 'finalizada');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(causas.updateCausa).toHaveBeenCalledWith(7, { estado: 'finalizada' });
    expect(within(dataSection()).getByText('Finalizada')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull();
  });

  it('sin cambios, cerrar la edición no llama a la API', async () => {
    const { causas, user } = await openDetail();

    await user.click(screen.getByRole('button', { name: 'Editar datos' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(causas.updateCausa).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull();
  });

  it('cancelar la edición descarta los cambios', async () => {
    const { user } = await openDetail();

    await user.click(screen.getByRole('button', { name: 'Editar datos' }));
    await user.clear(screen.getByLabelText('Juzgado'));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(within(dataSection()).getByText('Juzgado Civil N° 3')).toBeTruthy();
  });

  it('pregunta por el expediente repetido y guarda al confirmar (RF-9)', async () => {
    const updateCausa = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError(409, ['Ya existe otra causa con ese número de expediente'], {
          codigo: 'EXPEDIENTE_REPETIDO',
        }),
      )
      .mockResolvedValueOnce(detail({ numeroExpediente: '99/2024' }));
    const { user } = await openDetail(detail(), { updateCausa });

    await user.click(screen.getByRole('button', { name: 'Editar datos' }));
    await user.clear(screen.getByLabelText('Número de expediente'));
    await user.type(screen.getByLabelText('Número de expediente'), '99/2024');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await user.click(await screen.findByRole('button', { name: 'Guardar igual' }));

    expect(updateCausa).toHaveBeenLastCalledWith(7, {
      numeroExpediente: '99/2024',
      confirmarExpedienteRepetido: true,
    });
    expect(within(dataSection()).getByText('99/2024')).toBeTruthy();
  });

  it('muestra los errores de la API al editar', async () => {
    const updateCausa = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError(409, [
          'Ya existe una causa con ese número de expediente en ese juzgado y fuero',
        ]),
      );
    const { user } = await openDetail(detail(), { updateCausa });

    await user.click(screen.getByRole('button', { name: 'Editar datos' }));
    await user.type(screen.getByLabelText('Número de expediente'), '1');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Ya existe una causa con ese número de expediente en ese juzgado y fuero',
    );
  });

  it('avisa si el responsable está desactivado (RF-33)', async () => {
    await openDetail(detail({ responsable: testMember({ activo: false }) }));

    expect(
      screen.getByText(
        'El responsable de esta causa está desactivado. Asigná un nuevo responsable',
      ),
    ).toBeTruthy();
  });

  it('en una causa desactivada no ofrece editar (RF-41)', async () => {
    await openDetail(
      detail({
        activa: false,
        desactivadaEn: '2026-10-03T15:00:00.000Z',
        desactivadaPor: { id: 1, nombre: 'Juan', apellido: 'Álvarez' },
        responsable: testMember({ activo: false }),
      }),
    );

    expect(screen.getByText('Esta causa está desactivada')).toBeTruthy();
    expect(screen.getByText('Desactivada por Juan Álvarez el 03/10/2026 12:00')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Editar datos' })).toBeNull();
    expect(
      screen.queryByText(
        'El responsable de esta causa está desactivado. Asigná un nuevo responsable',
      ),
    ).toBeNull();
  });

  it('muestra el error si la causa no existe', async () => {
    const causas = fakeCausasService({
      getCausa: vi.fn().mockRejectedValue(new ApiError(404, ['No existe esa causa'])),
    });
    renderCausaPages('/panel/causas/99999', causas);

    expect((await screen.findByRole('alert')).textContent).toBe('No existe esa causa');
    expect(screen.getByRole('heading', { name: 'Causa', level: 1 })).toBeTruthy();
  });

  it('muestra las partes y, al volver a vincular un cliente, el aviso de causas como no cliente (RF-20, RF-24)', async () => {
    const ana = testParte({
      id: 5,
      esCliente: true,
      clienteId: 12,
      clienteActivo: true,
      nombre: 'Ana',
      apellido: 'Gómez',
    });
    const relinkParty = vi.fn().mockResolvedValue({
      causa: detail({ partes: [testParte(), ana] }),
      causasComoNoCliente: [
        { id: 3, caratula: 'López c/ Gómez s/ desalojo', numeroExpediente: null },
      ],
    });
    const { user } = await openDetail(detail({ partesDesvinculadas: [ana] }), { relinkParty });

    expect(screen.getByRole('table', { name: 'Partes vigentes' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Volver a vincular' }));

    expect(await screen.findByRole('link', { name: 'López c/ Gómez s/ desalojo' })).toBeTruthy();
    expect(
      within(screen.getByRole('table', { name: 'Partes vigentes' })).getByText('Ana Gómez'),
    ).toBeTruthy();
  });

  it('edita los abogados desde el detalle y muestra los nuevos (RF-29, RF-34)', async () => {
    const carla = testMember({ id: 4, nombre: 'Carla', apellido: 'Sabalette', rol: 'admin' });
    const updateLawyers = vi
      .fn()
      .mockResolvedValue(detail({ responsable: carla, colaboradores: [] }));
    const { user } = await openDetail(detail(), {
      listMembers: vi.fn().mockResolvedValue([testMember(), carla]),
      updateLawyers,
    });

    await user.click(screen.getByRole('button', { name: 'Editar abogados' }));
    await user.selectOptions(await screen.findByLabelText('Responsable'), '4');
    await user.click(screen.getByRole('button', { name: 'Guardar abogados' }));

    expect(updateLawyers).toHaveBeenCalledWith(7, { responsableId: 4, colaboradorIds: [2] });
    expect(within(dataSection()).getByText('Sabalette, Carla')).toBeTruthy();
  });
});
