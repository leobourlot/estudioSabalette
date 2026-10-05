import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { testMember } from '../pruebas/causas-de-prueba';
import type { LawyersData } from '../servicios/causas';
import type { LawyersForm } from '../servicios/formulario-causa';
import { SelectorIntegrantes } from './SelectorIntegrantes';

const juan = testMember({ id: 1, nombre: 'Juan', apellido: 'Álvarez' });
const lucia = testMember({ id: 2, nombre: 'Lucía', apellido: 'Benítez' });
const carla = testMember({ id: 4, nombre: 'Carla', apellido: 'Sabalette', rol: 'admin' });
const bruno = testMember({ id: 3, nombre: 'Bruno', apellido: 'Méndez', activo: false });
const pablo = testMember({ id: 5, nombre: 'Pablo', apellido: 'Castro', activo: false });
// Ordenados por apellido, como los devuelve la API.
const MEMBERS = [juan, lucia, pablo, bruno, carla];

function Harness({
  initial = { responsableId: null, colaboradorIds: [] },
  assigned = null,
  onChange = vi.fn(),
}: {
  initial?: LawyersForm;
  assigned?: LawyersData | null;
  onChange?: (value: LawyersForm) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <SelectorIntegrantes
      members={MEMBERS}
      value={value}
      assigned={assigned}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

const responsableOptions = () =>
  within(screen.getByLabelText('Responsable'))
    .getAllByRole('option')
    .map((option) => option.textContent);

const collaboratorLabels = () =>
  within(screen.getByRole('group', { name: 'Colaboradores' }))
    .getAllByRole('checkbox')
    .map((checkbox) => checkbox.closest('label')?.textContent);

describe('SelectorIntegrantes (RF-29 a RF-32)', () => {
  it('en el alta ofrece solo integrantes activos, administradores incluidos', () => {
    render(<Harness />);

    expect(responsableOptions()).toEqual([
      'Elegí el responsable',
      'Álvarez, Juan',
      'Benítez, Lucía',
      'Sabalette, Carla',
    ]);
    expect(collaboratorLabels()).toEqual(['Álvarez, Juan', 'Benítez, Lucía', 'Sabalette, Carla']);
  });

  it('el responsable elegido no se ofrece como colaborador (RF-31)', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.setup().selectOptions(screen.getByLabelText('Responsable'), '1');

    expect(onChange).toHaveBeenLastCalledWith({ responsableId: 1, colaboradorIds: [] });
    expect(collaboratorLabels()).toEqual(['Benítez, Lucía', 'Sabalette, Carla']);
  });

  it('marca y desmarca colaboradores', async () => {
    const onChange = vi.fn();
    render(<Harness initial={{ responsableId: 1, colaboradorIds: [] }} onChange={onChange} />);
    const user = userEvent.setup();

    await user.click(screen.getByLabelText('Sabalette, Carla'));
    await user.click(screen.getByLabelText('Benítez, Lucía'));
    expect(onChange).toHaveBeenLastCalledWith({ responsableId: 1, colaboradorIds: [4, 2] });

    await user.click(screen.getByLabelText('Sabalette, Carla'));
    expect(onChange).toHaveBeenLastCalledWith({ responsableId: 1, colaboradorIds: [2] });
  });

  it('elegir como responsable a un colaborador lo quita de los colaboradores', async () => {
    const onChange = vi.fn();
    render(<Harness initial={{ responsableId: 1, colaboradorIds: [2, 4] }} onChange={onChange} />);

    await userEvent.setup().selectOptions(screen.getByLabelText('Responsable'), '2');

    expect(onChange).toHaveBeenLastCalledWith({ responsableId: 2, colaboradorIds: [4] });
  });

  it('muestra marcados y conserva a los desactivados ya asignados, sin ofrecer otros (RF-32)', () => {
    const assigned = { responsableId: 3, colaboradorIds: [5, 2] };
    render(<Harness initial={assigned} assigned={assigned} />);

    expect(responsableOptions()).toEqual([
      'Elegí el responsable',
      'Álvarez, Juan',
      'Benítez, Lucía',
      'Méndez, Bruno (desactivado)',
      'Sabalette, Carla',
    ]);
    expect(screen.getByLabelText<HTMLSelectElement>('Responsable').value).toBe('3');
    expect(collaboratorLabels()).toEqual([
      'Álvarez, Juan',
      'Benítez, Lucía',
      'Castro, Pablo (desactivado)',
      'Sabalette, Carla',
    ]);
    expect(screen.getByLabelText<HTMLInputElement>('Castro, Pablo (desactivado)').checked).toBe(
      true,
    );
  });

  it('un desactivado que era colaborador no se ofrece como responsable (RF-30)', () => {
    const assigned = { responsableId: 1, colaboradorIds: [5] };
    render(<Harness initial={assigned} assigned={assigned} />);

    expect(responsableOptions()).not.toContain('Castro, Pablo (desactivado)');
  });
});
