import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeCausasService, testCausaDetalle, testMember } from '../pruebas/causas-de-prueba';
import type { CausaDetalle, CausasService } from '../servicios/causas';
import { ApiError } from '../servicios/cliente-http';
import { EditorAbogados } from './EditorAbogados';
import { ProveedorServicios } from './ProveedorServicios';

const juan = testMember({ id: 1, nombre: 'Juan', apellido: 'Álvarez' });
const lucia = testMember({ id: 2, nombre: 'Lucía', apellido: 'Benítez' });
const pablo = testMember({ id: 5, nombre: 'Pablo', apellido: 'Castro', activo: false });
const bruno = testMember({ id: 3, nombre: 'Bruno', apellido: 'Méndez', activo: false });
const carla = testMember({ id: 4, nombre: 'Carla', apellido: 'Sabalette', rol: 'admin' });
const MEMBERS = [juan, lucia, pablo, bruno, carla];

const causaWith = (overrides: Partial<CausaDetalle> = {}) =>
  testCausaDetalle({ id: 7, responsable: juan, colaboradores: [lucia], ...overrides });

function renderEditor(causa = causaWith(), overrides: Partial<CausasService> = {}) {
  const causas = fakeCausasService({
    listMembers: vi.fn().mockResolvedValue(MEMBERS),
    ...overrides,
  });
  const onSaved = vi.fn();
  render(
    <ProveedorServicios services={{ causas }}>
      <EditorAbogados causa={causa} onSaved={onSaved} />
    </ProveedorServicios>,
  );
  return { causas, onSaved, user: userEvent.setup() };
}

async function openEditor(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Editar abogados' }));
  await screen.findByRole('option', { name: 'Sabalette, Carla' });
}

describe('EditorAbogados (RF-29 a RF-34)', () => {
  it('parte de los abogados actuales y guarda el reemplazo', async () => {
    const updated = causaWith({ responsable: carla, colaboradores: [juan] });
    const { causas, onSaved, user } = renderEditor(causaWith(), {
      updateLawyers: vi.fn().mockResolvedValue(updated),
    });

    await openEditor(user);
    expect(screen.getByLabelText<HTMLSelectElement>('Responsable').value).toBe('1');
    expect(screen.getByLabelText<HTMLInputElement>('Benítez, Lucía').checked).toBe(true);

    await user.selectOptions(screen.getByLabelText('Responsable'), '4');
    await user.click(screen.getByLabelText('Benítez, Lucía'));
    await user.click(screen.getByLabelText('Álvarez, Juan'));
    await user.click(screen.getByRole('button', { name: 'Guardar abogados' }));

    expect(causas.updateLawyers).toHaveBeenCalledWith(7, { responsableId: 4, colaboradorIds: [1] });
    expect(onSaved).toHaveBeenCalledWith(updated);
    expect(screen.queryByRole('button', { name: 'Guardar abogados' })).toBeNull();
  });

  it('conserva a los desactivados que ya ocupaban su lugar (RF-32)', async () => {
    const { causas, user } = renderEditor(
      causaWith({ responsable: bruno, colaboradores: [pablo] }),
      {
        updateLawyers: vi.fn().mockResolvedValue(causaWith()),
      },
    );

    await openEditor(user);
    expect(screen.getByLabelText<HTMLSelectElement>('Responsable').value).toBe('3');
    expect(screen.getByLabelText<HTMLInputElement>('Castro, Pablo (desactivado)').checked).toBe(
      true,
    );
    await user.click(screen.getByLabelText('Benítez, Lucía'));
    await user.click(screen.getByRole('button', { name: 'Guardar abogados' }));

    expect(causas.updateLawyers).toHaveBeenCalledWith(7, {
      responsableId: 3,
      colaboradorIds: [5, 2],
    });
  });

  it('pide el responsable antes de enviar', async () => {
    const { causas, user } = renderEditor();

    await openEditor(user);
    await user.selectOptions(screen.getByLabelText('Responsable'), '');
    await user.click(screen.getByRole('button', { name: 'Guardar abogados' }));

    expect(screen.getByRole('alert').textContent).toContain('Elegí el responsable');
    expect(causas.updateLawyers).not.toHaveBeenCalled();
  });

  it('muestra los mensajes de 409 de la API', async () => {
    const { user } = renderEditor(causaWith(), {
      updateLawyers: vi
        .fn()
        .mockRejectedValue(new ApiError(409, ['El integrante está desactivado'])),
    });

    await openEditor(user);
    await user.click(screen.getByRole('button', { name: 'Guardar abogados' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'El integrante está desactivado',
    );
  });

  it('cancelar cierra el editor sin guardar', async () => {
    const { causas, user } = renderEditor();

    await openEditor(user);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(causas.updateLawyers).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Editar abogados' })).toBeTruthy();
  });

  it('en una causa desactivada no ofrece editar (RF-41)', () => {
    renderEditor(causaWith({ activa: false }));

    expect(screen.queryByRole('button', { name: 'Editar abogados' })).toBeNull();
  });
});
