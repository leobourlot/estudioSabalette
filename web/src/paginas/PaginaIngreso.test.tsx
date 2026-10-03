import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from '../pruebas/aplicacion-de-prueba';
import { ApiError, NETWORK_ERROR_MESSAGE } from '../servicios/cliente-http';
import type { UsuarioPropio } from '../servicios/sesion';

async function openLogin(login: (email: string, contrasena: string) => Promise<UsuarioPropio>) {
  const service = fakeSessionService({ login: vi.fn(login) });
  renderApp('/ingresar', service);
  await screen.findByRole('heading', { name: 'Ingresar' });
  return service;
}

async function submit(email: string, contrasena: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText('Email'), email);
  if (contrasena) await user.type(screen.getByLabelText('Contraseña'), contrasena);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('PaginaIngreso (RF-8 a RF-10)', () => {
  it.each([
    ['admin', testUser('admin'), 'Panel'],
    ['abogado', testUser('abogado'), 'Panel'],
    ['cliente', testUser('cliente'), 'Mis causas'],
    [
      'con cambio pendiente',
      testUser('abogado', { debeCambiarContrasena: true }),
      'Cambiar contraseña',
    ],
  ])(
    'al ingresar como %s, lleva a donde indica resolveLandingRoute',
    async (_case, usuario, page) => {
      const service = await openLogin(async () => usuario);

      await submit('juan@estudio.com', 'clave del estudio 2026');

      expect(await screen.findByRole('heading', { name: page })).toBeTruthy();
      expect(service.login).toHaveBeenCalledWith('juan@estudio.com', 'clave del estudio 2026');
    },
  );

  it.each([
    ['401', new ApiError(401, ['Email o contraseña incorrectos'])],
    ['429', new ApiError(429, ['Demasiados intentos. Probá de nuevo en unos minutos'])],
    ['sin conexión', new ApiError(0, [NETWORK_ERROR_MESSAGE])],
  ])('muestra el mensaje de la API ante un %s y borra la contraseña', async (_case, error) => {
    await openLogin(async () => {
      throw error;
    });

    await submit('juan@estudio.com', 'otra clave');

    expect((await screen.findByRole('alert')).textContent).toBe(error.message);
    expect(screen.getByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect((screen.getByLabelText('Contraseña') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('juan@estudio.com');
  });

  it('pide completar los dos campos antes de enviar', async () => {
    const service = await openLogin(async () => testUser('admin'));

    await submit('juan@estudio.com', '');

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Completá el email y la contraseña',
    );
    expect(service.login).not.toHaveBeenCalled();
  });

  it('deshabilita el botón mientras espera la respuesta', async () => {
    let finish!: (usuario: UsuarioPropio) => void;
    await openLogin(() => new Promise((resolve) => (finish = resolve)));

    await submit('juan@estudio.com', 'clave del estudio 2026');

    const button = screen.getByRole('button', { name: 'Ingresando…' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    finish(testUser('admin'));
    expect(await screen.findByRole('heading', { name: 'Panel' })).toBeTruthy();
  });

  it('usa campos de email y contraseña con autocompletado del navegador', async () => {
    await openLogin(async () => testUser('admin'));

    expect(screen.getByLabelText('Email').getAttribute('autocomplete')).toBe('username');
    expect(screen.getByLabelText('Contraseña').getAttribute('type')).toBe('password');
    expect(screen.getByLabelText('Contraseña').getAttribute('autocomplete')).toBe(
      'current-password',
    );
  });
});
