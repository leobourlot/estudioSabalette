import { httpClient, type HttpClient } from './cliente-http';
import type { Rol, TipoPersona } from './sesion';
import type { AuditAuthor } from './usuarios';

/**
 * Causas del panel (plan 002, `/api/panel/causas`). Una función por endpoint; los errores
 * llegan como ApiError con los mensajes de la API y, en las preguntas, su `codigo` en
 * `details`. No importa React.
 */

export type Fuero = 'civil' | 'penal' | 'familia' | 'laboral' | 'federal' | 'otro';
export type EstadoCausa = 'en_tramite' | 'paralizada' | 'archivada' | 'finalizada';
export type RolProcesal = 'actor' | 'demandado' | 'tercero' | 'otro';

export interface IntegranteResumen {
  id: number;
  nombre: string;
  apellido: string;
  rol: Rol;
  activo: boolean;
}

export interface ParteDetalle {
  id: number;
  rol: RolProcesal;
  esCliente: boolean;
  clienteId: number | null;
  /** Si la cuenta del cliente está activa; null en una parte no cliente. */
  clienteActivo: boolean | null;
  tipoPersona: TipoPersona;
  nombre: string | null;
  apellido: string | null;
  razonSocial: string | null;
  dni: string | null;
  cuit: string | null;
}

/** Causa como la devuelve el listado. Fechas en ISO. */
export interface CausaResumen {
  id: number;
  caratula: string;
  numeroExpediente: string | null;
  juzgado: string | null;
  fuero: Fuero;
  estado: EstadoCausa;
  esIncidente: boolean;
  expedientePrincipal: string | null;
  activa: boolean;
  responsable: IntegranteResumen;
  creadoEn: string;
  modificadoEn: string | null;
}

export interface CausaDetalle extends CausaResumen {
  colaboradores: IntegranteResumen[];
  partes: ParteDetalle[];
  partesDesvinculadas: ParteDetalle[];
  creadoPor: AuditAuthor | null;
  modificadoPor: AuditAuthor | null;
  desactivadaPor: AuditAuthor | null;
  desactivadaEn: string | null;
  reactivadaPor: AuditAuthor | null;
  reactivadaEn: string | null;
}

export interface CausaReferencia {
  id: number;
  caratula: string;
  numeroExpediente: string | null;
}

/** Parte o colaborador que no se guardó en el alta, con sus motivos (RF-7). */
export interface Rechazo {
  indiceParte?: number;
  colaboradorId?: number;
  mensajes: string[];
}

export interface ResultadoAlta {
  causa: CausaDetalle;
  rechazos: Rechazo[];
  causasComoNoCliente: CausaReferencia[];
}

export interface ResultadoParte {
  causa: CausaDetalle;
  causasComoNoCliente: CausaReferencia[];
}

export interface CausaPage {
  items: CausaResumen[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface ListCausasQuery {
  pagina?: number;
  buscar?: string;
  fuero?: Fuero;
  estado?: EstadoCausa;
  responsableId?: number;
  /** Solo las causas donde quien consulta es responsable o colaborador. */
  mias?: boolean;
  responsableDesactivado?: boolean;
  incluirDesactivadas?: boolean;
}

/** Respuestas a las preguntas de RF-16 y RF-19. */
export interface PartyAnswers {
  confirmarDocumentoDeCliente?: boolean;
  confirmarNombreRepetido?: boolean;
  confirmarNombreDeCliente?: boolean;
}

export interface ClientPartyData extends PartyAnswers {
  rol: RolProcesal;
  clienteId: number;
}

export interface NonClientPartyData extends PartyAnswers {
  rol: RolProcesal;
  tipoPersona: TipoPersona;
  nombre?: string;
  apellido?: string;
  razonSocial?: string;
  dni?: string | null;
  cuit?: string | null;
}

export type NewPartyData = ClientPartyData | NonClientPartyData;

/** Modificación de una parte: solo el rol, los datos de una no cliente, o { rol, clienteId }. */
export type UpdatePartyData = { rol: RolProcesal } | NewPartyData;

export interface CreateCausaData {
  caratula: string;
  numeroExpediente?: string | null;
  juzgado?: string | null;
  fuero: Fuero;
  estado?: EstadoCausa;
  esIncidente?: boolean;
  expedientePrincipal?: string | null;
  responsableId: number;
  colaboradorIds?: number[];
  partes: NewPartyData[];
  confirmarExpedienteRepetido?: boolean;
}

/** Solo los campos que cambian; null borra un opcional. */
export interface UpdateCausaData {
  caratula?: string;
  numeroExpediente?: string | null;
  juzgado?: string | null;
  fuero?: Fuero;
  estado?: EstadoCausa;
  esIncidente?: boolean;
  expedientePrincipal?: string | null;
  confirmarExpedienteRepetido?: boolean;
}

export interface LawyersData {
  responsableId: number;
  colaboradorIds: number[];
}

const BASE = '/panel/causas';

/** Las casillas desmarcadas y los textos vacíos no se envían: no filtran. */
function toQueryString(query: ListCausasQuery): string {
  const params = new URLSearchParams();
  if (query.pagina !== undefined) params.set('pagina', String(query.pagina));
  const search = query.buscar?.trim();
  if (search) params.set('buscar', search);
  if (query.fuero !== undefined) params.set('fuero', query.fuero);
  if (query.estado !== undefined) params.set('estado', query.estado);
  if (query.responsableId !== undefined) params.set('responsableId', String(query.responsableId));
  if (query.mias) params.set('mias', 'true');
  if (query.responsableDesactivado) params.set('responsableDesactivado', 'true');
  if (query.incluirDesactivadas) params.set('incluirDesactivadas', 'true');
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function createCausasService(http: HttpClient) {
  return {
    listCausas: (query: ListCausasQuery = {}) =>
      http.get<CausaPage>(`${BASE}${toQueryString(query)}`),

    listMembers: () => http.get<IntegranteResumen[]>(`${BASE}/integrantes`),

    getCausa: (id: number) => http.get<CausaDetalle>(`${BASE}/${id}`),

    createCausa: (data: CreateCausaData) => http.post<ResultadoAlta>(BASE, data),

    updateCausa: (id: number, changes: UpdateCausaData) =>
      http.patch<CausaDetalle>(`${BASE}/${id}`, changes),

    updateLawyers: (id: number, data: LawyersData) =>
      http.put<CausaDetalle>(`${BASE}/${id}/abogados`, data),

    addParty: (id: number, parte: NewPartyData) =>
      http.post<ResultadoParte>(`${BASE}/${id}/partes`, parte),

    updateParty: (id: number, parteId: number, data: UpdatePartyData) =>
      http.put<ResultadoParte>(`${BASE}/${id}/partes/${parteId}`, data),

    unlinkParty: (id: number, parteId: number) =>
      http.post<CausaDetalle>(`${BASE}/${id}/partes/${parteId}/desvincular`),

    relinkParty: (id: number, parteId: number) =>
      http.post<ResultadoParte>(`${BASE}/${id}/partes/${parteId}/revincular`),

    deactivateCausa: (id: number) => http.post<void>(`${BASE}/${id}/desactivar`),

    reactivateCausa: (id: number, confirmarExpedienteRepetido?: boolean) =>
      http.post<void>(
        `${BASE}/${id}/reactivar`,
        confirmarExpedienteRepetido ? { confirmarExpedienteRepetido } : {},
      ),
  };
}

export type CausasService = ReturnType<typeof createCausasService>;

export const causasService = createCausasService(httpClient);
