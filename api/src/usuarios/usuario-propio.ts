import type { TipoPersona } from './cliente.entity.js';
import type { Rol, Usuario } from './usuario.entity.js';

/** Respuesta con los datos propios del usuario (plan 001, `UsuarioPropio`). */
export interface UsuarioPropio {
  id: number;
  rol: Rol;
  esPrincipal: boolean;
  email: string | null;
  nombre: string;
  apellido: string;
  debeCambiarContrasena: boolean;
  cliente: {
    tipoPersona: TipoPersona;
    dni: string | null;
    cuit: string | null;
    razonSocial: string | null;
    telefono: string | null;
    domicilio: string | null;
  } | null;
}

/**
 * Arma la respuesta campo por campo, nunca a partir de la entidad completa, para que
 * ningún dato interno (como el hash de la contraseña) llegue al cliente (RF-40).
 */
export function toUsuarioPropio(usuario: Usuario): UsuarioPropio {
  const { cliente } = usuario;
  return {
    id: usuario.id,
    rol: usuario.rol,
    esPrincipal: usuario.esPrincipal,
    email: usuario.email,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    debeCambiarContrasena: usuario.debeCambiarContrasena,
    cliente: cliente
      ? {
          tipoPersona: cliente.tipoPersona,
          dni: cliente.dni,
          cuit: cliente.cuit,
          razonSocial: cliente.razonSocial,
          telefono: cliente.telefono,
          domicilio: cliente.domicilio,
        }
      : null,
  };
}
