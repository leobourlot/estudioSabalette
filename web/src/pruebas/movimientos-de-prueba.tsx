import { vi } from 'vitest';
import type {
  MovimientoDetalle,
  MovimientoPage,
  MovimientoResumen,
  MovimientosService,
} from '../servicios/movimientos';

/** Movimiento de prueba como lo devuelve el historial. */
export function testMovimientoResumen(
  overrides: Partial<MovimientoResumen> = {},
): MovimientoResumen {
  return {
    id: 12,
    fecha: '2024-03-01',
    tipo: 'providencia',
    descripcion: 'Se fija audiencia preliminar.',
    visible: false,
    tieneTextoCliente: false,
    anulado: false,
    esFechaFutura: false,
    creadoPor: { id: 1, nombre: 'Luis', apellido: 'Sosa', activo: true },
    creadoEn: '2026-10-01T15:00:00.000Z',
    ...overrides,
  };
}

/** Movimiento de prueba como lo devuelve la consulta, con su cambio de carga. */
export function testMovimientoDetalle(
  overrides: Partial<MovimientoDetalle> = {},
): MovimientoDetalle {
  const resumen = testMovimientoResumen(overrides);
  return {
    ...resumen,
    causaId: 7,
    causaActiva: true,
    textoCliente: null,
    textoVisible: resumen.descripcion,
    origenTextoVisible: 'descripcion',
    modificadoPor: null,
    modificadoEn: null,
    cambios: [
      {
        id: 1,
        accion: 'carga',
        usuario: resumen.creadoPor,
        fechaHora: resumen.creadoEn,
        cambios: [{ campo: 'fecha', anterior: null, nuevo: resumen.fecha }],
      },
    ],
    ...overrides,
  };
}

export const movementPage = (
  items: MovimientoResumen[],
  total = items.length,
  pagina = 1,
): MovimientoPage => ({ items, total, pagina, porPagina: 20 });

type Mocked<T> = { [K in keyof T]: ReturnType<typeof vi.fn> } & T;

export type FakeMovimientosService = Mocked<MovimientosService>;

/** Servicio de movimientos simulado; por defecto, sin movimientos. */
export function fakeMovimientosService(
  overrides: Partial<MovimientosService> = {},
): FakeMovimientosService {
  return {
    listMovements: vi.fn().mockResolvedValue(movementPage([])),
    getMovement: vi.fn(async (causaId: number, id: number) =>
      testMovimientoDetalle({ causaId, id }),
    ),
    createMovement: vi.fn(),
    updateMovement: vi.fn(),
    annulMovement: vi.fn(),
    restoreMovement: vi.fn(),
    ...overrides,
  } as FakeMovimientosService;
}
