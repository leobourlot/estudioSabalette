import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { ProveedorServicios } from '../componentes/ProveedorServicios';
import { ProveedorSesion } from '../componentes/ProveedorSesion';
import { RutasAplicacion } from '../RutasAplicacion';
import type { CausasService } from '../servicios/causas';
import type {
  EscritoCompletado,
  ModeloDetalle,
  ModeloPage,
  ModeloResumen,
  ModelosService,
} from '../servicios/modelos-escritos';
import type { SessionService } from '../servicios/sesion';
import { fakeSessionService, fakeUsersService, testUser } from './aplicacion-de-prueba';
import { fakeCausasService } from './causas-de-prueba';
import { fakeMovimientosService } from './movimientos-de-prueba';
import { fakePortalService } from './portal-de-prueba';

/** Datos y servicios simulados para las páginas de modelos de escritos (spec 006). */

/** Modelo de prueba como lo devuelve el listado. */
export function testModeloResumen(overrides: Partial<ModeloResumen> = {}): ModeloResumen {
  return {
    id: 8,
    titulo: 'Oficio al Registro de la Propiedad',
    tipo: 'oficio',
    fuero: 'civil',
    descripcion: 'Para pedir un informe de dominio',
    activo: true,
    ...overrides,
  };
}

/** Modelo de prueba como lo devuelve la consulta. */
export function testModeloDetalle(overrides: Partial<ModeloDetalle> = {}): ModeloDetalle {
  return {
    ...testModeloResumen(overrides),
    texto: 'Señor Director:\n\nEn los autos "#CARATULA#", Expte. Nº #NUMERO_EXPEDIENTE#.',
    variables: ['CARATULA', 'NUMERO_EXPEDIENTE'],
    creadoPor: { id: 1, nombre: 'Luis', apellido: 'Sosa', activo: true },
    creadoEn: '2026-10-01T15:00:00.000Z',
    modificadoPor: null,
    modificadoEn: null,
    ...overrides,
  };
}

export const modeloPage = (
  items: ModeloResumen[],
  options: Partial<Omit<ModeloPage, 'items'>> = {},
): ModeloPage => ({ items, pagina: 1, haySiguiente: false, hayModelos: true, ...options });

/** Escrito completado de prueba, sin faltantes ni avisos. */
export function testEscrito(overrides: Partial<EscritoCompletado> = {}): EscritoCompletado {
  return {
    causa: { id: 5, caratula: 'Gómez, Luis c/ Acme S.A. s/ daños' },
    modelo: { id: 8, titulo: 'Oficio al Registro de la Propiedad' },
    texto:
      'Señor Director:\n\nEn los autos "Gómez, Luis c/ Acme S.A. s/ daños", Expte. Nº 1234/2026.',
    faltantes: [],
    clientesDesactivados: [],
    responsableDesactivado: false,
    ...overrides,
  };
}

type Mocked<T> = { [K in keyof T]: ReturnType<typeof vi.fn> } & T;

export type FakeModelosService = Mocked<ModelosService>;

/** Servicio de modelos simulado; por defecto, sin modelos. */
export function fakeModelosService(overrides: Partial<ModelosService> = {}): FakeModelosService {
  return {
    listModels: vi.fn().mockResolvedValue(modeloPage([], { hayModelos: false })),
    getModel: vi.fn(async (id: number) => testModeloDetalle({ id })),
    createModel: vi.fn(),
    updateModel: vi.fn(),
    deactivateModel: vi.fn(),
    reactivateModel: vi.fn(),
    completeModel: vi.fn(async (causaId: number, modeloId: number) =>
      testEscrito({
        causa: { id: causaId, caratula: 'Gómez, Luis c/ Acme S.A. s/ daños' },
        modelo: { id: modeloId, titulo: 'Oficio al Registro de la Propiedad' },
      }),
    ),
    keepSessionAlive: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as FakeModelosService;
}

/** Sesión simulada de un abogado, para entrar directo a las páginas del panel. */
export const lawyerSession = () =>
  fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(testUser('abogado')) });

/**
 * Deja a la vista de los tests la ruta actual y su estado de navegación, para verificar
 * navegaciones. Van ocultos, para que no cuenten como contenido ni como avisos de la página.
 */
function CurrentLocation() {
  const location = useLocation();
  return (
    <>
      <span hidden data-testid="ruta-actual">
        {location.pathname}
      </span>
      <span hidden data-testid="estado-actual">
        {JSON.stringify(location.state)}
      </span>
    </>
  );
}

export const currentPath = () =>
  document.querySelector('[data-testid="ruta-actual"]')?.textContent ?? null;

export const currentLocationState = (): unknown =>
  JSON.parse(document.querySelector('[data-testid="estado-actual"]')?.textContent ?? 'null');

interface RenderModelsOptions {
  session?: SessionService;
  modelos?: ModelosService;
  causas?: CausasService;
  /** Estado de navegación con el que se llega a `path`. */
  state?: unknown;
}

/**
 * Renderiza la aplicación completa en `path` con los servicios simulados, para probar las
 * rutas y las páginas de la spec 006 con su navegación.
 */
export function renderModelsApp(path: string, options: RenderModelsOptions = {}) {
  const session = options.session ?? fakeSessionService();
  const modelos = options.modelos ?? fakeModelosService();
  const causas = options.causas ?? fakeCausasService();
  const result = render(
    <MemoryRouter initialEntries={[{ pathname: path, state: options.state ?? null }]}>
      <ProveedorServicios
        services={{
          users: fakeUsersService(),
          portal: fakePortalService(),
          movimientos: fakeMovimientosService(),
          causas,
          modelos,
        }}
      >
        <ProveedorSesion service={session}>
          <RutasAplicacion />
        </ProveedorSesion>
        <CurrentLocation />
      </ProveedorServicios>
    </MemoryRouter>,
  );
  return { ...result, session, modelos, causas };
}
