import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { ProveedorServicios } from '../componentes/ProveedorServicios';
import { PanelCausaDetalle } from '../paginas/PanelCausaDetalle';
import { PanelCausaNueva } from '../paginas/PanelCausaNueva';
import { PanelCausas } from '../paginas/PanelCausas';
import type {
  CausaDetalle,
  CausaPage,
  CausaResumen,
  CausasService,
  IntegranteResumen,
  ParteDetalle,
} from '../servicios/causas';
import type { UsersService } from '../servicios/usuarios';
import { fakeUsersService } from './aplicacion-de-prueba';

/** Datos y servicios simulados para las páginas de causas (spec 002). */

export function testMember(overrides: Partial<IntegranteResumen> = {}): IntegranteResumen {
  return { id: 1, nombre: 'Juan', apellido: 'Álvarez', rol: 'abogado', activo: true, ...overrides };
}

export function testParte(overrides: Partial<ParteDetalle> = {}): ParteDetalle {
  return {
    id: 1,
    rol: 'actor',
    esCliente: false,
    clienteId: null,
    clienteActivo: null,
    tipoPersona: 'fisica',
    nombre: 'Pedro',
    apellido: 'López',
    razonSocial: null,
    dni: null,
    cuit: null,
    ...overrides,
  };
}

export function testCausa(overrides: Partial<CausaResumen> = {}): CausaResumen {
  return {
    id: 7,
    caratula: 'Pérez, Juan c/ Gómez S.A. s/ daños',
    numeroExpediente: '1234/2024',
    juzgado: 'Juzgado Civil N° 3',
    fuero: 'civil',
    estado: 'en_tramite',
    esIncidente: false,
    expedientePrincipal: null,
    activa: true,
    responsable: testMember(),
    creadoEn: '2026-10-01T13:00:00.000Z',
    modificadoEn: null,
    ...overrides,
  };
}

export function testCausaDetalle(overrides: Partial<CausaDetalle> = {}): CausaDetalle {
  return {
    ...testCausa(),
    colaboradores: [],
    partes: [testParte()],
    partesDesvinculadas: [],
    creadoPor: { id: 1, nombre: 'Juan', apellido: 'Álvarez' },
    modificadoPor: null,
    desactivadaPor: null,
    desactivadaEn: null,
    reactivadaPor: null,
    reactivadaEn: null,
    ...overrides,
  };
}

export const causaPage = (items: CausaResumen[], total = items.length, pagina = 1): CausaPage => ({
  items,
  total,
  pagina,
  porPagina: 20,
});

type Mocked<T> = { [K in keyof T]: ReturnType<typeof vi.fn> } & T;

export type FakeCausasService = Mocked<CausasService>;

/** Servicio de causas simulado; por defecto, sin causas y con un solo integrante. */
export function fakeCausasService(overrides: Partial<CausasService> = {}): FakeCausasService {
  return {
    listCausas: vi.fn().mockResolvedValue(causaPage([])),
    listMembers: vi.fn().mockResolvedValue([testMember()]),
    getCausa: vi.fn(async (id: number) => testCausaDetalle({ id })),
    createCausa: vi.fn(),
    updateCausa: vi.fn(),
    updateLawyers: vi.fn(),
    addParty: vi.fn(),
    updateParty: vi.fn(),
    unlinkParty: vi.fn(),
    relinkParty: vi.fn(),
    deactivateCausa: vi.fn().mockResolvedValue(undefined),
    reactivateCausa: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as FakeCausasService;
}

/** Muestra la ruta actual, para verificar navegaciones. */
function CurrentPath() {
  const location = useLocation();
  return <output data-testid="ruta-actual">{location.pathname}</output>;
}

/**
 * Renderiza las páginas de causas en `path`, con servicios simulados. El acceso por rol ya
 * se prueba en RutasCausas.test.tsx; acá se prueban las páginas.
 */
export function renderCausaPages(
  path: string,
  causas: CausasService = fakeCausasService(),
  users: UsersService = fakeUsersService(),
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ProveedorServicios services={{ causas, users }}>
        <Routes>
          <Route path="/panel/causas" element={<PanelCausas />} />
          <Route path="/panel/causas/nueva" element={<PanelCausaNueva />} />
          <Route path="/panel/causas/:id" element={<PanelCausaDetalle />} />
        </Routes>
        <CurrentPath />
      </ProveedorServicios>
    </MemoryRouter>,
  );
}

export const currentPath = (container: HTMLElement) =>
  container.ownerDocument.querySelector('[data-testid="ruta-actual"]')?.textContent;
