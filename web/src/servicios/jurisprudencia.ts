import type { Fuero } from './causas';
import { httpClient, type HttpClient } from './cliente-http';
import type { AutorResumen } from './movimientos';

/**
 * Jurisprudencia del estudio (plan 005, `/api/panel/jurisprudencia`). Una función por
 * endpoint; los errores llegan como ApiError con los mensajes de la API. Solo la usa el
 * panel: ningún archivo del portal la importa (RF-36). No importa React.
 */

export interface PalabraClave {
  id: number;
  texto: string;
}

/** Sugerencia con la cantidad de fallos activos que usan la palabra (RF-13). */
export interface PalabraClaveSugerencia extends PalabraClave {
  cantidad: number;
}

/** Las sugerencias son para cargar un fallo (RF-13) o para el filtro del listado (RF-25). */
export type DestinoSugerencias = 'carga' | 'filtro';

/** Fila del listado. `fecha` es AAAA-MM-DD. El sumario llega completo (RF-22). */
export interface FalloResumen {
  id: number;
  caratula: string;
  tribunal: string;
  fuero: Fuero;
  fecha: string;
  numero: string | null;
  sumario: string;
  /** En orden alfabético. */
  palabrasClave: PalabraClave[];
  activo: boolean;
}

/** Ficha de un fallo (RF-19). Las fechas de registro son ISO. */
export interface FalloDetalle extends FalloResumen {
  enlace: string | null;
  creadoPor: AutorResumen;
  creadoEn: string;
  modificadoPor: AutorResumen | null;
  modificadoEn: string | null;
}

/** El fallo con el que coincide otro, en la pregunta FALLO_REPETIDO (RF-18). */
export interface FalloReferencia {
  id: number;
  caratula: string;
  tribunal: string;
  fecha: string;
  numero: string | null;
}

/** Página del listado, sin totales (RF-21). */
export interface FalloPage {
  items: FalloResumen[];
  pagina: number;
  haySiguiente: boolean;
  /** Si existe algún fallo que pueda aparecer sin buscador ni filtros (RF-27). */
  hayFallos: boolean;
}

export interface ListFallosQuery {
  pagina?: number;
  buscar?: string;
  /** Ids de palabras del catálogo: solo los fallos que tienen todas (RF-25). */
  palabrasClave?: number[];
  fuero?: Fuero;
  /** AAAA-MM-DD, inclusive. */
  desde?: string;
  hasta?: string;
  incluirDesactivados?: boolean;
}

export interface CreateFalloData {
  caratula: string;
  tribunal: string;
  fuero: Fuero;
  fecha: string;
  numero?: string | null;
  sumario: string;
  palabrasClave: string[];
  enlace?: string | null;
  /** Respuesta a la pregunta FALLO_REPETIDO (RF-18). */
  confirmarRepetido?: boolean;
}

/** Solo los datos que cambian; null borra el número o el enlace. */
export interface UpdateFalloData {
  caratula?: string;
  tribunal?: string;
  fuero?: Fuero;
  fecha?: string;
  numero?: string | null;
  sumario?: string;
  /** Reemplaza la lista completa. */
  palabrasClave?: string[];
  enlace?: string | null;
  confirmarRepetido?: boolean;
}

const BASE = '/panel/jurisprudencia';

/** Los textos vacíos, la lista vacía y la casilla desmarcada no se envían: no filtran. */
function toQueryString(query: ListFallosQuery): string {
  const params = new URLSearchParams();
  if (query.pagina !== undefined) params.set('pagina', String(query.pagina));
  const search = query.buscar?.trim();
  if (search) params.set('buscar', search);
  if (query.palabrasClave && query.palabrasClave.length > 0) {
    params.set('palabrasClave', query.palabrasClave.join(','));
  }
  if (query.fuero !== undefined) params.set('fuero', query.fuero);
  if (query.desde) params.set('desde', query.desde);
  if (query.hasta) params.set('hasta', query.hasta);
  if (query.incluirDesactivados) params.set('incluirDesactivados', 'true');
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function createJurisprudenciaService(http: HttpClient) {
  return {
    listRulings: (query: ListFallosQuery = {}) =>
      http.get<FalloPage>(`${BASE}${toQueryString(query)}`),

    /** Sin destino, las sugerencias son para la carga. */
    suggestKeywords: (buscar: string, para: DestinoSugerencias = 'carga') => {
      const params = new URLSearchParams({ buscar });
      if (para !== 'carga') params.set('para', para);
      return http.get<PalabraClaveSugerencia[]>(`${BASE}/palabras-clave?${params.toString()}`);
    },

    getRuling: (id: number) => http.get<FalloDetalle>(`${BASE}/${id}`),

    createRuling: (data: CreateFalloData) => http.post<FalloDetalle>(BASE, data),

    updateRuling: (id: number, changes: UpdateFalloData) =>
      http.patch<FalloDetalle>(`${BASE}/${id}`, changes),

    deactivateRuling: (id: number) => http.post<FalloDetalle>(`${BASE}/${id}/desactivar`),

    /** Con `confirmarRepetido`, responde la pregunta FALLO_REPETIDO (RF-31). */
    reactivateRuling: (id: number, confirmarRepetido = false) =>
      http.post<FalloDetalle>(
        `${BASE}/${id}/reactivar`,
        confirmarRepetido ? { confirmarRepetido: true } : undefined,
      ),
  };
}

export type JurisprudenciaService = ReturnType<typeof createJurisprudenciaService>;

export const jurisprudenciaService = createJurisprudenciaService(httpClient);
