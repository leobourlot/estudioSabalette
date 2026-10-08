import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from '../pruebas/aplicacion-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import type { Rol } from '../servicios/sesion';

const CURRENT = 'clave del estudio 2026';
const NEW = 'otra clave segura 2026';
const SESSION_CLOSED = 'Por seguridad, cerramos tu sesión. Volvé a ingresar';

async function openPage(
  options: { rol?: Rol; pending?: boolean; changePassword?: () => Promise<void> } = {},
) {
  const service = fakeSessionService({
    fetchOwnUser: vi
      .fn()
      .mockResolvedValue(
        testUser(options.rol ?? 'abogado', { debeCambiarContrasena: options.pending ?? true }),
      ),
    changePassword: vi.fn(options.changePassword ?? (async () => undefined)),
  });
  renderApp('/cambiar-contrasena', service);
  await screen.findByRole('heading', { name: 'Cambiar contraseña' });
  return service;
}

async function fill(current: string, next: string, repeated = next) {
  const user = userEvent.setup();
  if (current) await user.type(screen.getByLabelText('Contraseña actual'), current);
  if (next) await user.type(screen.getByLabelText('Contraseña nueva'), next);
  if (repeated) await user.type(screen.getByLabelText('Repetí la contraseña nueva'), repeated);
  await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
}

const alertText = async () => (await screen.findByRole('alert')).textContent;

describe('PaginaCambiarContrasena: WhatsApp (spec 004, RF-18, RF-19)', () => {
  it('a un cliente le muestra el botón de WhatsApp, sin el bloque de contacto', async () => {
    await openPage({ rol: 'cliente', pending: false });

    expect(screen.getByRole('link', { name: 'Escribinos por WhatsApp' })).toBeTruthy();
    expect(screen.queryByRole('contentinfo', { name: 'Contacto del estudio' })).toBeNull();
  });

  it('a un integrante no le muestra nada de eso', async () => {
    await openPage({ rol: 'abogado', pending: false });

    expect(screen.queryByRole('link', { name: 'Escribinos por WhatsApp' })).toBeNull();
    expect(screen.queryByRole('contentinfo', { name: 'Contacto del estudio' })).toBeNull();
  });
});

describe('PaginaCambiarContrasena (RF-11, RF-36 a RF-39)', () => {
  it.each([
    ['tiene tildes', 'contraseña nueva 2026', 'La contraseña no puede tener tildes, ñ ni emojis'],
    ['es corta', 'corta', 'La contraseña debe tener al menos 10 caracteres'],
    ['es larga', 'a'.repeat(65), 'La contraseña no puede tener más de 64 caracteres'],
    ['es igual a la actual', CURRENT, 'La contraseña nueva debe ser distinta de la actual'],
  ])('avisa antes de enviar si la nueva %s (RF-39)', async (_case, next, message) => {
    const service = await openPage();

    await fill(CURRENT, next);

    expect(await alertText()).toBe(message);
    expect(service.changePassword).not.toHaveBeenCalled();
  });

  it('avisa si las dos contraseñas nuevas no coinciden', async () => {
    const service = await openPage();

    await fill(CURRENT, NEW, 'otra clave distinta 2026');

    expect(await alertText()).toBe('Las contraseñas nuevas no coinciden');
    expect(service.changePassword).not.toHaveBeenCalled();
  });

  it('pide completar todos los campos', async () => {
    await openPage();

    await fill('', NEW);

    expect(await alertText()).toBe('Completá todos los campos');
  });

  it('muestra el error de la API si la contraseña actual es incorrecta (RF-37)', async () => {
    await openPage({
      changePassword: async () => {
        throw new ApiError(400, ['La contraseña actual no es correcta']);
      },
    });

    await fill('no es la clave', NEW);

    expect(await alertText()).toBe('La contraseña actual no es correcta');
    expect((screen.getByLabelText('Contraseña actual') as HTMLInputElement).value).toBe('');
  });

  it.each([
    ['abogado', 'Panel'],
    ['admin', 'Panel'],
    ['cliente', 'Mis causas'],
  ] as const)('al cambiarla, un %s va al inicio de su sección (RF-36)', async (rol, page) => {
    const service = await openPage({ rol });

    await fill(CURRENT, NEW);

    expect(await screen.findByRole('heading', { name: page })).toBeTruthy();
    expect(service.changePassword).toHaveBeenCalledWith(CURRENT, NEW);
  });

  it('si la API cierra la sesión por errores repetidos, lleva a /ingresar con el aviso (RF-38)', async () => {
    await openPage({
      changePassword: async () => {
        throw new ApiError(401, [SESSION_CLOSED]);
      },
    });

    await fill('no es la clave', NEW);

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect(await alertText()).toBe(SESSION_CLOSED);
  });

  it('con el cambio pendiente no ofrece volver, pero sí cerrar sesión (RF-11)', async () => {
    const service = await openPage({ pending: true });
    expect(screen.queryByRole('link', { name: 'Volver' })).toBeNull();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect(service.logout).toHaveBeenCalled();
  });

  it('si el cambio es voluntario, ofrece volver a la sección', async () => {
    await openPage({ pending: false, rol: 'cliente' });

    await userEvent.setup().click(screen.getByRole('link', { name: 'Volver' }));

    expect(await screen.findByRole('heading', { name: 'Mis causas' })).toBeTruthy();
  });
});
