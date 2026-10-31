import { httpClient, type HttpClient } from './cliente-http';
import type { Rol, TipoPersona, UsuarioPropio } from './sesion';

/**
 * Gestión de cuentas del panel (plan 001, `/api/panel/usuarios`). Una función por endpoint;
 * los errores llegan como ApiError con los mensajes de la API. No importa React.
 */

export interface AuditAuthor {
  id: number;
  nombre: string;
  apellido: string;
}

/** Cuenta con su auditoría, como la devuelve la API (plan 001, `UsuarioDetalle`). Fechas en ISO. */
export interface UsuarioDetalle extends UsuarioPropio {
  activo: boolean;
  ultimoIngreso: string | null;
  creadoEn: string;
  modificadoEn: string | null;
  creadoPor: AuditAuthor | null;
  modificadoPor: AuditAuthor | null;
}

export interface UserPage {
  items: UsuarioDetalle[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface ListUsersQuery {
  pagina?: number;
  buscar?: string;
  rol?: Rol;
  activo?: boolean;
}

export interface CreateUserData {
  rol: Rol;
  /** Obligatorio para los integrantes; opcional para los clientes (spec 001, RF-2, RF-3). */
  email?: string;
  /** Solo integrantes: el de un cliente persona física va en `cliente.dni`. */
  dni?: string;
  nombre: string;
  apellido: string;
  contrasenaTemporal: string;
  cliente?: {
    tipoPersona: TipoPersona;
    dni?: string;
    cuit?: string;
    razonSocial?: string;
    telefono?: string | null;
    domicilio?: string | null;
  };
}

/**
 * Solo los campos que cambian. El DNI de un integrante se puede cambiar; el DNI, el CUIT y
 * el tipo de persona de un cliente, no (RF-7). Un email null lo borra (solo clientes).
 */
export interface UpdateUserData {
  email?: string | null;
  dni?: string;
  nombre?: string;
  apellido?: string;
  rol?: Rol;
  cliente?: {
    razonSocial?: string;
    telefono?: string | null;
    domicilio?: string | null;
  };
}

const BASE = '/panel/usuarios';

function toQueryString(query: ListUsersQuery): string {
  const params = new URLSearchParams();
  if (query.pagina !== undefined) params.set('pagina', String(query.pagina));
  const search = query.buscar?.trim();
  if (search) params.set('buscar', search);
  if (query.rol !== undefined) params.set('rol', query.rol);
  if (query.activo !== undefined) params.set('activo', String(query.activo));
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function createUsersService(http: HttpClient) {
  return {
    listUsers: (query: ListUsersQuery = {}) => http.get<UserPage>(`${BASE}${toQueryString(query)}`),

    getUser: (id: number) => http.get<UsuarioDetalle>(`${BASE}/${id}`),

    createUser: (data: CreateUserData) => http.post<UsuarioDetalle>(BASE, data),

    updateUser: (id: number, changes: UpdateUserData) =>
      http.patch<UsuarioDetalle>(`${BASE}/${id}`, changes),

    deactivateUser: (id: number) => http.post<void>(`${BASE}/${id}/desactivar`),

    reactivateUser: (id: number, contrasenaTemporal: string) =>
      http.post<void>(`${BASE}/${id}/reactivar`, { contrasenaTemporal }),

    resetPassword: (id: number, contrasenaTemporal: string) =>
      http.post<void>(`${BASE}/${id}/restablecer-contrasena`, { contrasenaTemporal }),

    releaseEmail: (id: number) => http.post<void>(`${BASE}/${id}/liberar-email`),

    transferPrincipal: (id: number) => http.post<void>(`${BASE}/${id}/transferir-principal`),
  };
}

export type UsersService = ReturnType<typeof createUsersService>;

export const usersService = createUsersService(httpClient);
