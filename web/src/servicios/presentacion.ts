import type { Rol, TipoPersona, UsuarioPropio } from './sesion';

/** Cómo se muestran los datos en pantalla. Funciones puras, sin React (principio 3). */

const ROLE_LABELS: Record<Rol, string> = {
  admin: 'Administrador',
  abogado: 'Abogado',
  cliente: 'Cliente',
};

const PERSON_TYPE_LABELS: Record<TipoPersona, string> = {
  fisica: 'Persona física',
  juridica: 'Persona jurídica',
};

export const roleLabel = (rol: Rol) => ROLE_LABELS[rol];

export const personTypeLabel = (tipo: TipoPersona) => PERSON_TYPE_LABELS[tipo];

/** DNI con separadores de miles: 30123456 → 30.123.456. */
export const formatDni = (dni: string) => dni.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** CUIT con guiones: 30712345671 → 30-71234567-1. */
export const formatCuit = (cuit: string) =>
  `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;

export const fullName = (persona: { nombre: string; apellido: string }) =>
  `${persona.nombre} ${persona.apellido}`;

/** Texto para un dato opcional vacío. */
export const EMPTY_VALUE = '—';

/**
 * Filas etiqueta–valor con los datos de una cuenta, en el orden en que se muestran. Los
 * datos de cliente aparecen solo para clientes; en personas jurídicas, nombre y apellido
 * son los de la persona de contacto.
 */
export function accountRows(usuario: UsuarioPropio): [string, string][] {
  const { cliente } = usuario;
  const isLegalPerson = cliente?.tipoPersona === 'juridica';
  const rows: [string, string][] = [];

  if (cliente) {
    rows.push(['Tipo de persona', personTypeLabel(cliente.tipoPersona)]);
    if (isLegalPerson) {
      rows.push(['Razón social', cliente.razonSocial ?? EMPTY_VALUE]);
      rows.push(['CUIT', cliente.cuit ? formatCuit(cliente.cuit) : EMPTY_VALUE]);
    } else {
      rows.push(['DNI', cliente.dni ? formatDni(cliente.dni) : EMPTY_VALUE]);
    }
  }
  rows.push([isLegalPerson ? 'Nombre del contacto' : 'Nombre', usuario.nombre]);
  rows.push([isLegalPerson ? 'Apellido del contacto' : 'Apellido', usuario.apellido]);
  rows.push(['Email', usuario.email ?? EMPTY_VALUE]);
  rows.push(['Rol', roleLabel(usuario.rol)]);
  if (cliente) {
    rows.push(['Teléfono', cliente.telefono ?? EMPTY_VALUE]);
    rows.push(['Domicilio', cliente.domicilio ?? EMPTY_VALUE]);
  }
  return rows;
}
