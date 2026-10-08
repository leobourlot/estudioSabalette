import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSessionService, testUser } from '../pruebas/aplicacion-de-prueba';
import { IDLE_NOTICE } from '../servicios/inactividad';
import type { Rol } from '../servicios/sesion';
import { ProveedorSesion, useSession } from './ProveedorSesion';

const MINUTE = 60_000;

/** Muestra el usuario de la sesión y el aviso pendiente. */
function Estado() {
  const { usuario, cargando, notice } = useSession();
  if (cargando) return <p>Cargando</p>;
  return (
    <>
      <p>{usuario ? `Usuario: ${usuario.nombre}` : 'Sin sesión'}</p>
      {notice && <p>{notice}</p>}
    </>
  );
}

describe('ProveedorSesion: cierre por inactividad del cliente (spec 004, RF-4, RF-5)', () => {
  let activityListeners: Set<() => void>;

  beforeEach(() => {
    // Solo el reloj y los intervalos: las promesas y los setTimeout de Testing Library siguen reales.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-10-08T12:00:00Z'));
    activityListeners = new Set();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function renderAs(rol: Rol) {
    const service = fakeSessionService({
      fetchOwnUser: vi.fn().mockResolvedValue(testUser(rol, { nombre: 'Ana' })),
    });
    render(
      <ProveedorSesion
        service={service}
        subscribeSessionClosed={() => () => {}}
        subscribeActivity={(listener) => {
          activityListeners.add(listener);
          return () => activityListeners.delete(listener);
        }}
      >
        <Estado />
      </ProveedorSesion>,
    );
    await screen.findByText('Usuario: Ana');
    return service;
  }

  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
  const emitActivity = () => act(() => activityListeners.forEach((listener) => listener()));

  it('un cliente sin actividad durante 20 minutos queda sin sesión, con el aviso y sin pedir nada a la API', async () => {
    const service = await renderAs('cliente');

    await advance(20 * MINUTE);

    expect(screen.getByText('Sin sesión')).toBeTruthy();
    expect(screen.getByText(IDLE_NOTICE)).toBeTruthy();
    expect(service.fetchOwnUser).toHaveBeenCalledTimes(1);
    expect(service.logout).not.toHaveBeenCalled();
  });

  it('con actividad, la sesión sigue; se vacía 20 minutos después de la última', async () => {
    await renderAs('cliente');

    await advance(15 * MINUTE);
    await emitActivity();
    await advance(15 * MINUTE);
    expect(screen.getByText('Usuario: Ana')).toBeTruthy();

    await advance(5 * MINUTE);
    expect(screen.getByText('Sin sesión')).toBeTruthy();
  });

  it.each(['visibilitychange', 'focus'])(
    'al volver a la pestaña (%s) después de 20 minutos se vacía sin esperar el control periódico',
    async (event) => {
      await renderAs('cliente');

      // El reloj avanza sin que corra el intervalo, como con la computadora suspendida.
      vi.setSystemTime(Date.now() + 21 * MINUTE);
      await act(() => {
        const target = event === 'focus' ? window : document;
        target.dispatchEvent(new Event(event));
      });

      expect(screen.getByText('Sin sesión')).toBeTruthy();
      expect(screen.getByText(IDLE_NOTICE)).toBeTruthy();
    },
  );

  it.each(['admin', 'abogado'] as const)('un %s no se vacía por este control', async (rol) => {
    await renderAs(rol);

    await advance(2 * 60 * MINUTE);

    expect(screen.getByText('Usuario: Ana')).toBeTruthy();
  });
});
