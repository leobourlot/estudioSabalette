import type { Fuero } from './causas';
import { httpClient, type HttpClient } from './cliente-http';
import type { AutorResumen } from './movimientos';

/**
 * Modelos de escritos (plan 006, `/api/panel/modelos-escritos` y el escrito completado de una
 * causa). Una función por endpoint; los errores llegan como ApiError con los mensajes de la
 * API. Solo la usa el panel: ningún archivo del portal la importa (RF-52). No importa React.
 */

export type TipoEscrito =
  'demanda' | 'contestacion_demanda' | 'escrito_tramite' | 'recurso' | 'oficio' | 'cedula' | 'otro';

/** Fila del listado (RF-19). No lleva el texto del modelo. */
export interface ModeloResumen {
  id: number;
  titulo: string;
  tipo: TipoEscrito;
  /** "otro" si el modelo no es de un fuero específico (RF-1). */
  fuero: Fuero;
  descripcion: string | null;
  activo: boolean;
}

/** Ficha de un modelo (RF-16). Las fechas de registro son ISO. */
export interface ModeloDetalle extends ModeloResumen {
  /** Con las marcas de variable sin reemplazar, en la forma del catálogo. */
  texto: string;
  /** Variables del catálogo que usa el texto, sin repetir y en orden. */
  variables: string[];
  creadoPor: AutorResumen;
  creadoEn: string;
  modificadoPor: AutorResumen | null;
  modificadoEn: string | null;
}

/** Un modelo con el que coincide el título de otro, en la pregunta MODELO_REPETIDO (RF-15). */
export interface ModeloReferencia {
  id: number;
  titulo: string;
  tipo: TipoEscrito;
  fuero: Fuero;
}

/** Página del listado, sin totales (RF-18). */
export interface ModeloPage {
  items: ModeloResumen[];
  pagina: number;
  haySiguiente: boolean;
  /** Si existe algún modelo que pueda aparecer sin buscador ni filtros (RF-23). */
  hayModelos: boolean;
}

export interface ListModelosQuery {
  pagina?: number;
  buscar?: string;
  tipo?: TipoEscrito;
  /** Con un fuero, también llegan los modelos de fuero "otro" (RF-22). */
  fuero?: Fuero;
  incluirDesactivados?: boolean;
}

export interface CreateModeloData {
  titulo: string;
  tipo: TipoEscrito;
  /** Sin fuero, el modelo queda como "otro". */
  fuero?: Fuero;
  descripcion?: string | null;
  texto: string;
  /** Respuesta a la pregunta MODELO_REPETIDO (RF-15). */
  confirmarRepetido?: boolean;
}

/** Solo los datos que cambian; null borra la descripción. */
export interface UpdateModeloData {
  titulo?: string;
  tipo?: TipoEscrito;
  fuero?: Fuero;
  descripcion?: string | null;
  texto?: string;
  confirmarRepetido?: boolean;
}

/**
 * Un modelo completado con los datos de una causa (RF-31 a RF-40). El servidor lo arma en cada
 * pedido y no envía otros datos de la causa, de sus partes ni de las cuentas (RF-33).
 */
export interface EscritoCompletado {
  causa: { id: number; caratula: string };
  modelo: { id: number; titulo: string };
  texto: string;
  /** Datos que le faltan a la causa, ya redactados: "juzgado", "DNI de Luis Gómez" (RF-39). */
  faltantes: string[];
  /** Nombres de los clientes con la cuenta desactivada, si el modelo usa sus datos (RF-40). */
  clientesDesactivados: string[];
  responsableDesactivado: boolean;
}

const BASE = '/panel/modelos-escritos';

/** La búsqueda vacía y la casilla desmarcada no se envían: no filtran. */
function toQueryString(query: ListModelosQuery): string {
  const params = new URLSearchParams();
  if (query.pagina !== undefined) params.set('pagina', String(query.pagina));
  const search = query.buscar?.trim();
  if (search) params.set('buscar', search);
  if (query.tipo !== undefined) params.set('tipo', query.tipo);
  if (query.fuero !== undefined) params.set('fuero', query.fuero);
  if (query.incluirDesactivados) params.set('incluirDesactivados', 'true');
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function createModelosService(http: HttpClient) {
  return {
    listModels: (query: ListModelosQuery = {}) =>
      http.get<ModeloPage>(`${BASE}${toQueryString(query)}`),

    getModel: (id: number) => http.get<ModeloDetalle>(`${BASE}/${id}`),

    createModel: (data: CreateModeloData) => http.post<ModeloDetalle>(BASE, data),

    updateModel: (id: number, changes: UpdateModeloData) =>
      http.patch<ModeloDetalle>(`${BASE}/${id}`, changes),

    deactivateModel: (id: number) => http.post<ModeloDetalle>(`${BASE}/${id}/desactivar`),

    /** Con `confirmarRepetido`, responde la pregunta MODELO_REPETIDO (RF-27). */
    reactivateModel: (id: number, confirmarRepetido = false) =>
      http.post<ModeloDetalle>(
        `${BASE}/${id}/reactivar`,
        confirmarRepetido ? { confirmarRepetido: true } : undefined,
      ),

    /** Un modelo solo se completa desde una causa (RF-30). Cada pedido lo arma de nuevo. */
    completeModel: (causaId: number, modeloId: number) =>
      http.get<EscritoCompletado>(`/panel/causas/${causaId}/escritos/${modeloId}`),

    /**
     * Consulta liviana (el usuario de la sesión) que el servidor cuenta como uso: mantiene la
     * sesión mientras se escribe un modelo (RF-17) o se usa la pantalla de un escrito (RF-48).
     * La dispara createSessionKeepAlive, como mucho una vez cada 5 minutos.
     */
    keepSessionAlive: () => http.get<unknown>('/sesion/usuario'),
  };
}

export type ModelosService = ReturnType<typeof createModelosService>;

export const modelosService = createModelosService(httpClient);
