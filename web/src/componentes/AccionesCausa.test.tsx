import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeCausasService, testCausaDetalle } from '../pruebas/causas-de-prueba';
import type { CausaDetalle, CausasService } from '../servicios/causas';
import { ApiError } from '../servicios/cliente-http';
import { AccionesCausa } from './AccionesCausa';
import { ProveedorServicios } from './ProveedorServicios';

const active = testCausaDetalle({ id: 7, activa: true });
const deactivated = testCausaDetalle({ id: 7, activa: false });

function renderActions(causa: CausaDetalle, overrides: Partial<CausasService> = {}) {
  const causas = fakeCausasService(overrides);
  const onChanged = vi.fn();
  render(
    <ProveedorServicios services={{ causas }}>
      <AccionesCausa causa={causa} onChanged={onChanged} />
    </ProveedorServicios>,
  );
  return { causas, onChanged, user: userEvent.setup() };
}

describe('AccionesCausa (RF-40 a RF-43)', () => {
  it('una causa activa ofrece desactivar, y pide confirmación explicando para qué es (RF-40)', async () => {
    const { causas, user } = renderActions(active);
    expect(screen.queryByRole('button', { name: 'Reactivar' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Desactivar' }));

    const dialog = screen.getByRole('alertdialog', { name: '¿Desactivar esta causa?' });
    expect(dialog.textContent).toContain('Archivada o Finalizada');
    expect(causas.deactivateCausa).not.toHaveBeenCalled();
  });

  it('al confirmar, desactiva y muestra la causa actualizada', async () => {
    const getCausa = vi.fn().mockResolvedValue(deactivated);
    const { causas, onChanged, user } = renderActions(active, { getCausa });

    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    await user.click(screen.getByRole('button', { name: 'Sí, desactivar' }));

    expect(causas.deactivateCausa).toHaveBeenCalledWith(7);
    expect(getCausa).toHaveBeenCalledWith(7);
    expect(onChanged).toHaveBeenCalledWith(deactivated);
  });

  it('cancelar la confirmación no desactiva', async () => {
    const { causas, user } = renderActions(active);

    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(causas.deactivateCausa).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('una causa desactivada ofrece solo reactivar (RF-41, RF-42)', async () => {
    const getCausa = vi.fn().mockResolvedValue(active);
    const { causas, onChanged, user } = renderActions(deactivated, { getCausa });
    expect(screen.queryByRole('button', { name: 'Desactivar' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Reactivar' }));

    expect(causas.reactivateCausa).toHaveBeenCalledWith(7, false);
    expect(onChanged).toHaveBeenCalledWith(active);
  });

  it('al reactivar pregunta por el expediente repetido y reactiva al confirmar (RF-43)', async () => {
    const reactivateCausa = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError(409, ['Ya existe otra causa con ese número de expediente'], {
          codigo: 'EXPEDIENTE_REPETIDO',
        }),
      )
      .mockResolvedValueOnce(undefined);
    const { user } = renderActions(deactivated, {
      reactivateCausa,
      getCausa: vi.fn().mockResolvedValue(active),
    });

    await user.click(screen.getByRole('button', { name: 'Reactivar' }));
    await user.click(await screen.findByRole('button', { name: 'Guardar igual' }));

    expect(reactivateCausa).toHaveBeenLastCalledWith(7, true);
  });

  it('muestra el rechazo por duplicado exacto al reactivar (RF-43)', async () => {
    const { user } = renderActions(deactivated, {
      reactivateCausa: vi
        .fn()
        .mockRejectedValue(
          new ApiError(409, [
            'Ya existe una causa con ese número de expediente en ese juzgado y fuero',
          ]),
        ),
    });

    await user.click(screen.getByRole('button', { name: 'Reactivar' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Ya existe una causa con ese número de expediente en ese juzgado y fuero',
    );
  });
});
