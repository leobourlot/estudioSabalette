import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from '../pruebas/aplicacion-de-prueba';
import type { UsuarioPropio } from '../servicios/sesion';

async function openMyAccount(path: string, usuario: UsuarioPropio) {
  renderApp(path, fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(usuario) }));
  await screen.findByRole('heading', { name: 'Mi cuenta' });
}

/** Valor que acompaña a una etiqueta de la lista de datos. */
const valueOf = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

describe('MiCuenta (RF-35)', () => {
  it('a un integrante le muestra sus datos, sin datos de cliente', async () => {
    await openMyAccount(
      '/panel/mi-cuenta',
      testUser('abogado', { nombre: 'Juan', apellido: 'Pérez', email: 'juan@estudio.com' }),
    );

    expect(valueOf('Nombre')).toBe('Juan');
    expect(valueOf('Apellido')).toBe('Pérez');
    expect(valueOf('Email')).toBe('juan@estudio.com');
    expect(valueOf('Rol')).toBe('Abogado');
    expect(screen.queryByText('Tipo de persona')).toBeNull();
    expect(screen.queryByText('DNI')).toBeNull();
  });

  it('a un cliente persona física le muestra también sus datos de cliente', async () => {
    await openMyAccount(
      '/portal/mi-cuenta',
      testUser('cliente', {
        cliente: {
          tipoPersona: 'fisica',
          dni: '30123456',
          cuit: null,
          razonSocial: null,
          telefono: '3415551234',
          domicilio: null,
        },
      }),
    );

    expect(valueOf('Tipo de persona')).toBe('Persona física');
    expect(valueOf('DNI')).toBe('30.123.456');
    expect(valueOf('Teléfono')).toBe('3415551234');
    expect(valueOf('Domicilio')).toBe('—');
    expect(screen.queryByText('CUIT')).toBeNull();
    expect(screen.queryByText('Razón social')).toBeNull();
  });

  it('a un cliente persona jurídica le muestra CUIT, razón social y la persona de contacto', async () => {
    await openMyAccount(
      '/portal/mi-cuenta',
      testUser('cliente', {
        nombre: 'Laura',
        apellido: 'Sosa',
        cliente: {
          tipoPersona: 'juridica',
          dni: null,
          cuit: '30712345671',
          razonSocial: 'Zeta S.A.',
          telefono: null,
          domicilio: 'San Martín 123',
        },
      }),
    );

    expect(valueOf('Razón social')).toBe('Zeta S.A.');
    expect(valueOf('CUIT')).toBe('30-71234567-1');
    expect(valueOf('Nombre del contacto')).toBe('Laura');
    expect(valueOf('Apellido del contacto')).toBe('Sosa');
    expect(screen.queryByText('DNI')).toBeNull();
  });

  it('ofrece cambiar la contraseña', async () => {
    await openMyAccount('/panel/mi-cuenta', testUser('admin'));

    await userEvent.setup().click(screen.getByRole('link', { name: 'Cambiar contraseña' }));

    expect(await screen.findByRole('heading', { name: 'Cambiar contraseña' })).toBeTruthy();
  });
});
