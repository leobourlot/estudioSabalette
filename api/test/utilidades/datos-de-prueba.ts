import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { PasswordsService } from '../../src/autenticacion/contrasenas.service.js';
import { Cliente } from '../../src/usuarios/cliente.entity.js';
import { Usuario } from '../../src/usuarios/usuario.entity.js';

export const TEST_PASSWORD = 'clave del estudio 2026';

let cachedHash: Promise<string> | undefined;

/** Hash de TEST_PASSWORD, calculado una sola vez por archivo de tests (bcrypt es lento a propósito). */
export function testPasswordHash(): Promise<string> {
  cachedHash ??= new PasswordsService().hash(TEST_PASSWORD);
  return cachedHash;
}

type UserData = Partial<Omit<Usuario, 'cliente'>> & {
  cliente?: Partial<Omit<Cliente, 'usuarioId' | 'usuario'>>;
};

/** Crea un usuario (y su cliente, si se indica) directamente en la base de tests. */
export async function createTestUser(
  app: NestExpressApplication,
  data: UserData = {},
): Promise<Usuario> {
  const dataSource = app.get(DataSource);
  const { cliente, ...userData } = data;

  const usuario = await dataSource.getRepository(Usuario).save({
    rol: 'abogado',
    esPrincipal: false,
    email: 'juan@estudio.com',
    nombre: 'Juan',
    apellido: 'Pérez',
    contrasenaHash: await testPasswordHash(),
    debeCambiarContrasena: false,
    activo: true,
    ...userData,
  });

  if (cliente) {
    await dataSource.getRepository(Cliente).save({
      usuarioId: usuario.id,
      tipoPersona: 'fisica',
      ...cliente,
    });
  }
  return usuario;
}
