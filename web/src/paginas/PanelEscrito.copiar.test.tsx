import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fakeModelosService,
  lawyerSession,
  renderModelsApp,
  testEscrito,
} from '../pruebas/modelos-de-prueba';
import { IDLE_NOTICE } from '../servicios/inactividad';
import type { EscritoCompletado } from '../servicios/modelos-escritos';

const MINUTE = 60_000;

const ESCRITO = testEscrito({
  texto: 'Señor Juez:\n\nLuis Gómez, DNI 20.111.222,\nante (FALTA JUZGADO), digo:',
  faltantes: ['juzgado'],
  clientesDesactivados: ['Luis Gómez'],
  responsableDesactivado: true,
});

async function openEscrito(
  escrito: EscritoCompletado = ESCRITO,
  subscribeSessionClosed?: (listener: () => void) => () => void,
) {
  const modelos = fakeModelosService({ completeModel: vi.fn().mockResolvedValue(escrito) });
  renderModelsApp('/panel/causas/5/modelos/8', {
    session: lawyerSession(),
    modelos,
    subscribeSessionClosed,
  });
  await screen.findByRole('region', { name: 'Escrito completado' });
  return modelos;
}

describe('PanelEscrito: copiar (RF-44 a RF-46)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('"Copiar" deja en el portapapeles el texto exacto del escrito, sin título, carátula ni avisos', async () => {
    // userEvent.setup() instala un portapapeles simulado en el navegador de pruebas.
    const user = userEvent.setup();
    await openEscrito();

    await user.click(screen.getByRole('button', { name: 'Copiar' }));

    expect(await screen.findByText('Escrito copiado')).toBeTruthy();
    const copied = await navigator.clipboard.readText();
    expect(copied).toBe(ESCRITO.texto);
    expect(copied).not.toContain('A esta causa le faltan datos');
    expect(copied).not.toContain('Oficio al Registro de la Propiedad');
    expect(copied).not.toContain('Gómez, Luis c/ Acme');
  });

  it('los avisos no impiden copiar', async () => {
    const user = userEvent.setup();
    await openEscrito();

    expect(screen.getAllByRole('status')).toHaveLength(3);
    expect((screen.getByRole('button', { name: 'Copiar' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    await user.click(screen.getByRole('button', { name: 'Copiar' }));

    expect(await navigator.clipboard.readText()).toBe(ESCRITO.texto);
  });

  it('si el navegador no permite copiar, avisa que hay que copiarlo a mano', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('sin permiso'));
    await openEscrito();

    await user.click(screen.getByRole('button', { name: 'Copiar' }));

    expect(
      await screen.findByText('No se pudo copiar. Seleccioná el texto y copialo a mano'),
    ).toBeTruthy();
    expect(screen.queryByText('Escrito copiado')).toBeNull();
    // El texto sigue en pantalla para seleccionarlo.
    expect(screen.getByText(/Señor Juez:/)).toBeTruthy();
  });

  it('después de un fallo, volver a copiar con éxito muestra la confirmación', async () => {
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValueOnce(new Error('sin permiso'));
    await openEscrito();

    await user.click(screen.getByRole('button', { name: 'Copiar' }));
    await screen.findByText('No se pudo copiar. Seleccioná el texto y copialo a mano');
    await user.click(screen.getByRole('button', { name: 'Copiar' }));

    expect(await screen.findByText('Escrito copiado')).toBeTruthy();
    expect(screen.queryByText(/No se pudo copiar/)).toBeNull();
    expect(writeText).toHaveBeenCalledTimes(2);
  });

  it('la leyenda del portapapeles está siempre a la vista, antes y después de copiar', async () => {
    const user = userEvent.setup();
    await openEscrito();
    const legend =
      'El escrito copiado queda en este equipo hasta que copies otra cosa o cierres sesión';

    expect(screen.getByText(legend)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Copiar' }));
    await screen.findByText('Escrito copiado');

    expect(screen.getByText(legend)).toBeTruthy();
  });

  it('no guarda nada en el almacenamiento del navegador, ni al mostrar ni al copiar (RF-46)', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const user = userEvent.setup();
    await openEscrito();

    await user.click(screen.getByRole('button', { name: 'Copiar' }));
    await screen.findByText('Escrito copiado');

    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});

describe('PanelEscrito: uso de la sesión (RF-48)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([
    ['recorrerla', () => fireEvent.scroll(window)],
    ['usar el teclado', () => fireEvent.keyDown(document, { key: 'PageDown' })],
    ['hacer clic o tocar', () => fireEvent.pointerDown(document)],
    ['seleccionar texto', () => document.dispatchEvent(new Event('selectionchange'))],
    ['copiar con el teclado', () => fireEvent.copy(document)],
  ])('%s cuenta como uso: pasados 5 minutos consulta la sesión', async (_case, use) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
    const modelos = await openEscrito();

    act(() => use());
    expect(modelos.keepSessionAlive).not.toHaveBeenCalled();

    vi.setSystemTime(Date.now() + 5 * MINUTE);
    act(() => use());
    await vi.waitFor(() => expect(modelos.keepSessionAlive).toHaveBeenCalledTimes(1));

    // Como mucho una consulta cada 5 minutos, por más que se siga usando.
    vi.setSystemTime(Date.now() + 4 * MINUTE);
    act(() => use());
    act(() => use());
    expect(modelos.keepSessionAlive).toHaveBeenCalledTimes(1);
  });

  it('el botón "Copiar" también cuenta como uso', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
    const user = userEvent.setup();
    const modelos = await openEscrito();

    vi.setSystemTime(Date.now() + 5 * MINUTE);
    await user.click(screen.getByRole('button', { name: 'Copiar' }));

    await vi.waitFor(() => expect(modelos.keepSessionAlive).toHaveBeenCalledTimes(1));
  });

  it('sin uso no consulta la sesión, aunque la pantalla quede abierta', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
    const modelos = await openEscrito();

    vi.setSystemTime(Date.now() + 50 * MINUTE);

    expect(modelos.keepSessionAlive).not.toHaveBeenCalled();
  });

  it('al salir de la pantalla deja de contar el uso', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
    const user = userEvent.setup();
    const modelos = await openEscrito();

    await user.click(screen.getByRole('link', { name: 'Volver a la causa' }));
    await vi.waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Escrito completado' })).toBeNull(),
    );
    modelos.keepSessionAlive.mockClear();
    vi.setSystemTime(Date.now() + 10 * MINUTE);
    act(() => {
      fireEvent.scroll(window);
    });

    expect(modelos.keepSessionAlive).not.toHaveBeenCalled();
  });
});

describe('PanelEscrito: cierre de la sesión (RF-48)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('pasada 1 hora sin pedidos, el escrito deja de mostrarse y la página lleva a ingresar', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
    await openEscrito();
    await act(async () => {});

    await act(() => vi.advanceTimersByTime(59 * MINUTE));
    expect(screen.getByRole('region', { name: 'Escrito completado' })).toBeTruthy();

    await act(() => vi.advanceTimersByTime(MINUTE));

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Escrito completado' })).toBeNull();
    expect(screen.queryByText(/Señor Juez:/)).toBeNull();
    expect(screen.getByText(IDLE_NOTICE)).toBeTruthy();
  });

  it('si la API cerró la sesión, el escrito deja de mostrarse en esa consulta', async () => {
    const listeners = new Set<() => void>();
    await openEscrito(ESCRITO, (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    });
    expect(listeners.size).toBe(1);

    // Un 401 que no se pudo renovar: el cliente HTTP avisa que la sesión se cerró.
    act(() => listeners.forEach((listener) => listener()));

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Escrito completado' })).toBeNull();
    expect(screen.queryByText(/Señor Juez:/)).toBeNull();
  });

  it('al cerrar sesión con "Cerrar sesión", el escrito deja de mostrarse', async () => {
    const user = userEvent.setup();
    await openEscrito();

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect(screen.queryByText(/Señor Juez:/)).toBeNull();
  });
});
