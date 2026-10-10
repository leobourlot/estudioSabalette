import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ProveedorServicios } from '../componentes/ProveedorServicios';
import { ProveedorSesion } from '../componentes/ProveedorSesion';
import { RutasAplicacion } from '../RutasAplicacion';
import type {
  FalloDetalle,
  FalloPage,
  FalloResumen,
  JurisprudenciaService,
  PalabraClaveSugerencia,
} from '../servicios/jurisprudencia';
import type { SessionService } from '../servicios/sesion';
import { fakeSessionService, fakeUsersService } from './aplicacion-de-prueba';
import { fakePortalService } from './portal-de-prueba';

/** Fallo de prueba como lo devuelve el listado. */
export function testFalloResumen(overrides: Partial<FalloResumen> = {}): FalloResumen {
  return {
    id: 5,
    caratula: 'Pérez c/ López s/ daños',
    tribunal: 'CNCiv., Sala A',
    fuero: 'civil',
    fecha: '2019-05-03',
    numero: '1234/2018',
    sumario: 'La responsabilidad del dueño de la cosa es objetiva.',
    palabrasClave: [
      { id: 2, texto: 'accidente de tránsito' },
      { id: 1, texto: 'daño moral' },
    ],
    activo: true,
    ...overrides,
  };
}

/** Fallo de prueba como lo devuelve la consulta. */
export function testFalloDetalle(overrides: Partial<FalloDetalle> = {}): FalloDetalle {
  return {
    ...testFalloResumen(overrides),
    enlace: 'https://www.csjn.gov.ar/fallos/1234',
    creadoPor: { id: 1, nombre: 'Luis', apellido: 'Sosa', activo: true },
    creadoEn: '2026-10-01T15:00:00.000Z',
    modificadoPor: null,
    modificadoEn: null,
    ...overrides,
  };
}

export const falloPage = (
  items: FalloResumen[],
  options: Partial<Omit<FalloPage, 'items'>> = {},
): FalloPage => ({ items, pagina: 1, haySiguiente: false, hayFallos: true, ...options });

export const testSuggestion = (
  id: number,
  texto: string,
  cantidad = 1,
): PalabraClaveSugerencia => ({ id, texto, cantidad });

type Mocked<T> = { [K in keyof T]: ReturnType<typeof vi.fn> } & T;

export type FakeJurisprudenciaService = Mocked<JurisprudenciaService>;

/** Servicio de jurisprudencia simulado; por defecto, sin fallos ni sugerencias. */
export function fakeJurisprudenciaService(
  overrides: Partial<JurisprudenciaService> = {},
): FakeJurisprudenciaService {
  return {
    listRulings: vi.fn().mockResolvedValue(falloPage([], { hayFallos: false })),
    suggestKeywords: vi.fn().mockResolvedValue([]),
    getRuling: vi.fn(async (id: number) => testFalloDetalle({ id })),
    createRuling: vi.fn(),
    updateRuling: vi.fn(),
    deactivateRuling: vi.fn(),
    reactivateRuling: vi.fn(),
    keepSessionAlive: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as FakeJurisprudenciaService;
}

/**
 * Renderiza la aplicación completa en `path` con el servicio de jurisprudencia simulado, para
 * probar las rutas y las páginas de la spec 005 con su navegación.
 */
export function renderRulingsApp(
  path: string,
  session: SessionService = fakeSessionService(),
  jurisprudencia: JurisprudenciaService = fakeJurisprudenciaService(),
) {
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <ProveedorServicios
        services={{ users: fakeUsersService(), portal: fakePortalService(), jurisprudencia }}
      >
        <ProveedorSesion service={session}>
          <RutasAplicacion />
        </ProveedorSesion>
      </ProveedorServicios>
    </MemoryRouter>,
  );
  return { ...result, session, jurisprudencia };
}
