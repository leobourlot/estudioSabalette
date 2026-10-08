import { vi } from 'vitest';
import type {
  CausaPortalDetalle,
  CausaPortalResumen,
  MovimientoCliente,
  MovimientoClienteDetalle,
  PortalPage,
  PortalService,
} from '../servicios/portal';

/** Causa de prueba como la devuelve la lista del portal. */
export function testCausaPortal(overrides: Partial<CausaPortalResumen> = {}): CausaPortalResumen {
  return {
    id: 7,
    caratula: 'Gómez c/ López s/ daños',
    numeroExpediente: '1234/2024',
    estado: 'en_tramite',
    grupo: 'en_curso',
    fechaUltimoMovimiento: '2026-09-30',
    ...overrides,
  };
}

/** Detalle de causa de prueba, con el cliente como actor y un demandado. */
export function testCausaPortalDetalle(
  overrides: Partial<CausaPortalDetalle> = {},
): CausaPortalDetalle {
  return {
    id: 7,
    caratula: 'Gómez c/ López s/ daños',
    numeroExpediente: '1234/2024',
    juzgado: 'Juzgado Civil Nº 3',
    fuero: 'civil',
    estado: 'en_tramite',
    esIncidente: false,
    expedientePrincipal: null,
    partes: [
      { nombre: 'Ana Gómez', rol: 'actor', esVos: true },
      { nombre: 'Pedro López', rol: 'demandado', esVos: false },
    ],
    responsable: { nombre: 'Luis', apellido: 'Sosa' },
    ...overrides,
  };
}

/** Movimiento de prueba como lo ve el cliente. */
export function testMovimientoCliente(
  overrides: Partial<MovimientoCliente> = {},
): MovimientoCliente {
  return {
    id: 70,
    fecha: '2026-09-30',
    tipo: 'audiencia',
    texto: 'Se fijó audiencia preliminar.',
    anulado: false,
    esFechaFutura: false,
    ...overrides,
  };
}

export function testMovimientoClienteDetalle(
  overrides: Partial<MovimientoClienteDetalle> = {},
): MovimientoClienteDetalle {
  return {
    ...testMovimientoCliente(overrides),
    causa: { id: 7, caratula: 'Gómez c/ López s/ daños' },
    ...overrides,
  };
}

/** Una página del portal con los items indicados. */
export function testPortalPage<T>(items: T[], pagina = 1, haySiguiente = false): PortalPage<T> {
  return { items, pagina, haySiguiente };
}

type Mocked<T> = { [K in keyof T]: ReturnType<typeof vi.fn> } & T;

export type FakePortalService = Mocked<PortalService>;

/** Servicio del portal simulado; por defecto, sin causas ni movimientos. */
export function fakePortalService(overrides: Partial<PortalService> = {}): FakePortalService {
  return {
    listCausas: vi.fn(async (pagina: number) => testPortalPage([], pagina)),
    getCausa: vi.fn(async () => testCausaPortalDetalle()),
    listMovimientos: vi.fn(async (_causaId: string | number, pagina: number) =>
      testPortalPage([], pagina),
    ),
    getMovimiento: vi.fn(async () => testMovimientoClienteDetalle()),
    ...overrides,
  } as FakePortalService;
}
