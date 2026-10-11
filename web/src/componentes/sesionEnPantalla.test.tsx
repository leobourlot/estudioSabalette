import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSessionService, testUser } from '../pruebas/aplicacion-de-prueba';
import { fakeModelosService } from '../pruebas/modelos-de-prueba';
import { IDLE_NOTICE } from '../servicios/inactividad';
import { ProveedorServicios } from './ProveedorServicios';
import { ProveedorSesion, useSession } from './ProveedorSesion';
import { useCierrePorInactividad } from './useCierrePorInactividad';
import { useUsoDeSesion } from './useUsoDeSesion';

const MINUTE = 60_000;

beforeEach(() => {
  // Solo el reloj y los intervalos: las promesas y los setTimeout de Testing Library siguen reales.
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useUsoDeSesion (spec 006, RF-17, RF-48)', () => {
  function Pantalla() {
    const notifyUse = useUsoDeSesion();
    return (
      <button type="button" onClick={notifyUse}>
        Usar
      </button>
    );
  }

  function renderScreen() {
    const modelos = fakeModelosService();
    render(
      <ProveedorServicios services={{ modelos }}>
        <Pantalla />
      </ProveedorServicios>,
    );
    const use = () => act(() => screen.getByRole('button', { name: 'Usar' }).click());
    return { modelos, use };
  }

  it('no consulta la sesión antes de los 5 minutos de uso', async () => {
    const { modelos, use } = renderScreen();

    await use();
    vi.setSystemTime(Date.now() + 4 * MINUTE);
    await use();

    expect(modelos.keepSessionAlive).not.toHaveBeenCalled();
  });

  it('pasados 5 minutos, el uso consulta la sesión una vez y vuelve a esperar', async () => {
    const { modelos, use } = renderScreen();

    vi.setSystemTime(Date.now() + 5 * MINUTE);
    await use();
    await use();
    await vi.waitFor(() => expect(modelos.keepSessionAlive).toHaveBeenCalledTimes(1));

    vi.setSystemTime(Date.now() + 4 * MINUTE);
    await use();
    expect(modelos.keepSessionAlive).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + MINUTE);
    await use();
    await vi.waitFor(() => expect(modelos.keepSessionAlive).toHaveBeenCalledTimes(2));
  });

  it('sin uso no consulta nunca, aunque pase el tiempo', () => {
    const { modelos } = renderScreen();

    vi.setSystemTime(Date.now() + 3 * 60 * MINUTE);

    expect(modelos.keepSessionAlive).not.toHaveBeenCalled();
  });

  it('si la consulta falla, la pantalla sigue funcionando', async () => {
    const modelos = fakeModelosService({
      keepSessionAlive: vi.fn().mockRejectedValue(new Error('sin red')),
    });
    render(
      <ProveedorServicios services={{ modelos }}>
        <Pantalla />
      </ProveedorServicios>,
    );

    vi.setSystemTime(Date.now() + 5 * MINUTE);
    await act(() => screen.getByRole('button', { name: 'Usar' }).click());
    await vi.waitFor(() => expect(modelos.keepSessionAlive).toHaveBeenCalledTimes(1));

    expect(screen.getByRole('button', { name: 'Usar' })).toBeTruthy();
  });
});

describe('useCierrePorInactividad (spec 006, RF-48)', () => {
  let activityListeners: Set<() => void>;

  const subscribeActivity = (listener: () => void) => {
    activityListeners.add(listener);
    return () => activityListeners.delete(listener);
  };

  beforeEach(() => {
    activityListeners = new Set();
  });

  /** Muestra el usuario de la sesión; con `escrito`, monta la pantalla que controla la inactividad. */
  function Estado({ escrito }: { escrito: boolean }) {
    const { usuario, cargando, notice } = useSession();
    if (cargando) return <p>Cargando</p>;
    return (
      <>
        <p>{usuario ? `Usuario: ${usuario.nombre}` : 'Sin sesión'}</p>
        {notice && <p>{notice}</p>}
        {usuario && escrito && <Escrito />}
      </>
    );
  }

  function Escrito() {
    useCierrePorInactividad(undefined, subscribeActivity);
    return <p>Escrito en pantalla</p>;
  }

  async function renderScreen(escrito = true) {
    const service = fakeSessionService({
      fetchOwnUser: vi.fn().mockResolvedValue(testUser('abogado', { nombre: 'Ana' })),
    });
    const view = render(
      <ProveedorSesion
        service={service}
        subscribeSessionClosed={() => () => {}}
        subscribeActivity={() => () => {}}
      >
        <Estado escrito={escrito} />
      </ProveedorSesion>,
    );
    await screen.findByText('Usuario: Ana');
    // El texto aparece antes de que corran los efectos: se espera a que arranque el control.
    await act(async () => {});
    return { service, ...view };
  }

  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
  const emitActivity = () => act(() => activityListeners.forEach((listener) => listener()));

  it('pasados 60 minutos sin pedidos al servidor, cierra la sesión con el aviso de inactividad', async () => {
    const { service } = await renderScreen();

    await advance(59 * MINUTE);
    expect(screen.getByText('Escrito en pantalla')).toBeTruthy();

    await advance(MINUTE);

    expect(screen.getByText('Sin sesión')).toBeTruthy();
    expect(screen.getByText(IDLE_NOTICE)).toBeTruthy();
    expect(screen.queryByText('Escrito en pantalla')).toBeNull();
    // La sesión ya venció en el servidor: no hace falta pedirle nada.
    expect(service.logout).not.toHaveBeenCalled();
  });

  it('un pedido al servidor reinicia la cuenta', async () => {
    await renderScreen();

    await advance(50 * MINUTE);
    await emitActivity();
    await advance(50 * MINUTE);
    expect(screen.getByText('Escrito en pantalla')).toBeTruthy();

    await advance(10 * MINUTE);
    expect(screen.getByText('Sin sesión')).toBeTruthy();
  });

  it.each(['visibilitychange', 'focus'])(
    'al volver a la pestaña (%s) después de 60 minutos cierra sin esperar el control periódico',
    async (event) => {
      await renderScreen();

      // El reloj avanza sin que corra el intervalo, como con la computadora suspendida.
      vi.setSystemTime(Date.now() + 61 * MINUTE);
      await act(() => {
        const target = event === 'focus' ? window : document;
        target.dispatchEvent(new Event(event));
      });

      expect(screen.getByText('Sin sesión')).toBeTruthy();
      expect(screen.getByText(IDLE_NOTICE)).toBeTruthy();
    },
  );

  it('fuera de la pantalla del escrito, un integrante no se cierra por este control', async () => {
    await renderScreen(false);

    await advance(3 * 60 * MINUTE);

    expect(screen.getByText('Usuario: Ana')).toBeTruthy();
  });

  it('al salir de la pantalla deja de escuchar los pedidos y detiene el control', async () => {
    const { rerender } = await renderScreen();
    expect(activityListeners.size).toBe(1);

    rerender(
      <ProveedorSesion
        service={fakeSessionService({
          fetchOwnUser: vi.fn().mockResolvedValue(testUser('abogado', { nombre: 'Ana' })),
        })}
        subscribeSessionClosed={() => () => {}}
        subscribeActivity={() => () => {}}
      >
        <Estado escrito={false} />
      </ProveedorSesion>,
    );
    await act(async () => {});
    expect(activityListeners.size).toBe(0);

    await advance(3 * 60 * MINUTE);
    expect(screen.getByText('Usuario: Ana')).toBeTruthy();
  });
});
