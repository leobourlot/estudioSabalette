import type { EstadoCausa, Fuero, RolProcesal } from './causas';
import { httpClient, type HttpClient } from './cliente-http';
import type { TipoMovimiento } from './movimientos';

/**
 * Portal del cliente: llamadas a /api/portal/causas (plan 004, "Contrato de la API"). Solo
 * consultas: el cliente no carga ni modifica nada (RF-2). No importa React (principio 3).
 */

export type GrupoCausa = 'en_curso' | 'archivadas_y_finalizadas';

/** Una causa de la lista. `fechaUltimoMovimiento` es AAAA-MM-DD, o null (RF-8, RF-9). */
export interface CausaPortalResumen {
  id: number;
  caratula: string;
  numeroExpediente: string | null;
  estado: EstadoCausa;
  grupo: GrupoCausa;
  fechaUltimoMovimiento: string | null;
}

/** Una parte vigente: nombre o razón social, rol y si es el cliente que consulta (RF-14). */
export interface PartePortal {
  nombre: string;
  rol: RolProcesal;
  esVos: boolean;
}

export interface CausaPortalDetalle {
  id: number;
  caratula: string;
  numeroExpediente: string | null;
  juzgado: string | null;
  fuero: Fuero;
  estado: EstadoCausa;
  esIncidente: boolean;
  expedientePrincipal: string | null;
  /** Ya ordenadas por rol y nombre. */
  partes: PartePortal[];
  /** null si la cuenta del responsable está desactivada (RF-16). */
  responsable: { nombre: string; apellido: string } | null;
}

/** Un movimiento que el cliente puede ver. `texto` es el texto visible para el cliente (RF-21). */
export interface MovimientoCliente {
  id: number;
  fecha: string;
  tipo: TipoMovimiento;
  texto: string;
  anulado: boolean;
  esFechaFutura: boolean;
}

export interface MovimientoClienteDetalle extends MovimientoCliente {
  causa: { id: number; caratula: string };
}

/** Una página sin totales: solo si hay una siguiente (RF-24). */
export interface PortalPage<T> {
  items: T[];
  pagina: number;
  haySiguiente: boolean;
}

const BASE = '/portal/causas';

/**
 * Los ids llegan tal como están en la dirección. Se envían codificados y sin validar: la API
 * responde el mismo 404 para uno mal formado que para uno inexistente (RF-28, RF-29).
 */
const segment = (id: string | number) => encodeURIComponent(String(id));

export function createPortalService(http: HttpClient) {
  return {
    listCausas: (pagina: number) =>
      http.get<PortalPage<CausaPortalResumen>>(`${BASE}?pagina=${pagina}`),

    getCausa: (causaId: string | number) =>
      http.get<CausaPortalDetalle>(`${BASE}/${segment(causaId)}`),

    listMovimientos: (causaId: string | number, pagina: number) =>
      http.get<PortalPage<MovimientoCliente>>(
        `${BASE}/${segment(causaId)}/movimientos?pagina=${pagina}`,
      ),

    getMovimiento: (causaId: string | number, movimientoId: string | number) =>
      http.get<MovimientoClienteDetalle>(
        `${BASE}/${segment(causaId)}/movimientos/${segment(movimientoId)}`,
      ),
  };
}

export type PortalService = ReturnType<typeof createPortalService>;

export const portalService = createPortalService(httpClient);
