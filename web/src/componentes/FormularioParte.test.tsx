import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fakeUsersService, testAccount } from '../pruebas/aplicacion-de-prueba';
import type { NewPartyData } from '../servicios/causas';
import { EMPTY_PARTY_FORM, type PartyForm } from '../servicios/formulario-causa';
import { FormularioParte } from './FormularioParte';
import { ProveedorServicios } from './ProveedorServicios';

const ana = testAccount({
  id: 12,
  rol: 'cliente',
  nombre: 'Ana',
  apellido: 'Gómez',
  cliente: {
    tipoPersona: 'fisica',
    dni: '30123456',
    cuit: null,
    razonSocial: null,
    telefono: null,
    domicilio: null,
  },
});

function Harness({
  initial = EMPTY_PARTY_FORM,
  onSubmit,
  fixedMode = false,
  clientLabel = null,
}: {
  initial?: PartyForm;
  onSubmit: (data: NewPartyData) => void;
  fixedMode?: boolean;
  clientLabel?: string | null;
}) {
  const [form, setForm] = useState(initial);
  return (
    <FormularioParte
      value={form}
      onChange={setForm}
      submitLabel="Agregar parte"
      onSubmit={onSubmit}
      fixedMode={fixedMode}
      clientLabel={clientLabel}
    />
  );
}

function renderForm(props: Partial<Parameters<typeof Harness>[0]> = {}) {
  const onSubmit = vi.fn();
  const users = fakeUsersService({
    listUsers: vi.fn().mockResolvedValue({ items: [ana], total: 1, pagina: 1, porPagina: 20 }),
  });
  render(
    <ProveedorServicios services={{ users }}>
      <Harness onSubmit={onSubmit} {...props} />
    </ProveedorServicios>,
  );
  return { onSubmit, users };
}

describe('FormularioParte (RF-13 a RF-15)', () => {
  it('muestra los campos de cada modo y tipo de persona', async () => {
    renderForm();
    const user = userEvent.setup();
    expect(screen.getByLabelText('Buscar cliente')).toBeTruthy();
    expect(screen.queryByLabelText('Nombre')).toBeNull();

    await user.click(screen.getByLabelText('No es cliente'));
    expect(screen.getByLabelText('Nombre')).toBeTruthy();
    expect(screen.getByLabelText('Apellido')).toBeTruthy();
    expect(screen.getByLabelText('DNI (opcional)')).toBeTruthy();
    expect(screen.queryByLabelText('Buscar cliente')).toBeNull();

    await user.click(screen.getByLabelText('Persona jurídica'));
    expect(screen.getByLabelText('Razón social')).toBeTruthy();
    expect(screen.getByLabelText('CUIT (opcional)')).toBeTruthy();
    expect(screen.queryByLabelText('Nombre')).toBeNull();
  });

  it('ofrece los roles procesales de la spec', () => {
    renderForm();

    expect(
      [...screen.getByLabelText<HTMLSelectElement>('Rol procesal').options].map(
        (option) => option.text,
      ),
    ).toEqual(['Actor', 'Demandado', 'Tercero', 'Otro']);
  });

  it('muestra los errores antes de enviar y no envía', async () => {
    const { onSubmit } = renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Agregar parte' }));
    expect(screen.getByRole('alert').textContent).toContain('Elegí el cliente');

    await user.click(screen.getByLabelText('No es cliente'));
    await user.type(screen.getByLabelText('DNI (opcional)'), '123');
    await user.click(screen.getByRole('button', { name: 'Agregar parte' }));
    expect(
      [...screen.getByRole('alert').querySelectorAll('li')].map((item) => item.textContent),
    ).toEqual([
      'El nombre es obligatorio',
      'El apellido es obligatorio',
      'El DNI debe tener 7 u 8 dígitos',
    ]);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía una parte cliente elegida en el buscador', async () => {
    const { onSubmit, users } = renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Buscar cliente'), 'gómez');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await user.click(await screen.findByRole('button', { name: 'Gómez, Ana · DNI 30.123.456' }));
    await user.selectOptions(screen.getByLabelText('Rol procesal'), 'demandado');
    await user.click(screen.getByRole('button', { name: 'Agregar parte' }));

    expect(users.listUsers).toHaveBeenCalledWith({ rol: 'cliente', activo: true, buscar: 'gómez' });
    expect(screen.getByText('Cliente elegido: Gómez, Ana · DNI 30.123.456')).toBeTruthy();
    expect(onSubmit).toHaveBeenCalledWith({ rol: 'demandado', clienteId: 12 });
  });

  it('envía una persona jurídica no cliente con el CUIT normalizado', async () => {
    const { onSubmit } = renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText('No es cliente'));
    await user.click(screen.getByLabelText('Persona jurídica'));
    await user.type(screen.getByLabelText('Razón social'), 'Zeta S.R.L.');
    await user.type(screen.getByLabelText('CUIT (opcional)'), '30-71234567-1');
    await user.click(screen.getByRole('button', { name: 'Agregar parte' }));

    expect(onSubmit).toHaveBeenCalledWith({
      rol: 'actor',
      tipoPersona: 'juridica',
      razonSocial: 'Zeta S.R.L.',
      cuit: '30712345671',
    });
  });

  it('al modificar una parte cliente solo deja cambiar el rol (RF-21)', async () => {
    const { onSubmit } = renderForm({
      initial: { ...EMPTY_PARTY_FORM, modo: 'cliente', clienteId: 12, rol: 'actor' },
      fixedMode: true,
      clientLabel: 'Ana Gómez',
    });
    const user = userEvent.setup();

    expect(screen.queryByLabelText('No es cliente')).toBeNull();
    expect(screen.queryByLabelText('Buscar cliente')).toBeNull();
    expect(screen.getByText('Cliente: Ana Gómez')).toBeTruthy();

    await user.selectOptions(screen.getByLabelText('Rol procesal'), 'tercero');
    await user.click(screen.getByRole('button', { name: 'Agregar parte' }));
    expect(onSubmit).toHaveBeenCalledWith({ rol: 'tercero', clienteId: 12 });
  });
});
