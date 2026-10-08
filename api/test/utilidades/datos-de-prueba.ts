import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { PasswordsService } from '../../src/autenticacion/contrasenas.service.js';
import { Causa } from '../../src/causas/causa.entity.js';
import { Colaborador } from '../../src/causas/colaborador.entity.js';
import { Parte } from '../../src/causas/parte.entity.js';
import { toSearchableCaseNumber } from '../../src/causas/validadores/texto-causa.js';
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

let testClientCounter = 0;

/**
 * Crea un cliente persona física con email y DNI únicos, listo para vincularlo a una causa
 * como parte (con `partes: [{ clienteId }]` en createTestCausa). Ingresa con TEST_PASSWORD.
 */
export function createTestClient(
  app: NestExpressApplication,
  data: { nombre?: string; apellido?: string } = {},
): Promise<Usuario> {
  testClientCounter += 1;
  return createTestUser(app, {
    rol: 'cliente',
    email: `cliente.portal${testClientCounter}@correo.com`,
    nombre: data.nombre ?? 'Cliente',
    apellido: data.apellido ?? `Número ${testClientCounter}`,
    cliente: { tipoPersona: 'fisica', dni: String(31000000 + testClientCounter) },
  });
}

type PartyData = Partial<Omit<Parte, 'id' | 'causaId' | 'causa' | 'cliente'>>;

type CausaData = Partial<
  Omit<Causa, 'id' | 'claveExpediente' | 'responsable' | 'partes' | 'colaboradores'>
> & {
  responsableId: number;
  creadoPorId: number;
  /** Partes no cliente por defecto (persona física); con clienteId, parte cliente. */
  partes?: PartyData[];
  colaboradorIds?: number[];
};

/**
 * Crea una causa con sus partes y colaboradores directamente en la base de tests, sin pasar
 * por las reglas del service: sirve para preparar datos, no para probar el alta.
 */
export async function createTestCausa(
  app: NestExpressApplication,
  data: CausaData,
): Promise<Causa> {
  const dataSource = app.get(DataSource);
  const { partes = [{}], colaboradorIds = [], ...causaData } = data;
  const numeroExpediente = causaData.numeroExpediente ?? null;

  const causa = await dataSource.getRepository(Causa).save({
    caratula: 'Pérez, Juan c/ Gómez S.A. s/ daños y perjuicios',
    fuero: 'civil',
    estado: 'en_tramite',
    esIncidente: false,
    activa: true,
    juzgado: null,
    expedientePrincipal: null,
    ...causaData,
    numeroExpediente,
    numeroExpedienteBusqueda: numeroExpediente && toSearchableCaseNumber(numeroExpediente),
  });

  for (const parte of partes) {
    const isClient = parte.clienteId !== undefined && parte.clienteId !== null;
    await dataSource.getRepository(Parte).save({
      causaId: causa.id,
      rol: 'actor',
      vigente: true,
      creadoPorId: data.creadoPorId,
      ...(isClient
        ? { tipoPersona: null, nombre: null, apellido: null }
        : { tipoPersona: 'fisica' as const, nombre: 'Juan', apellido: 'Pérez' }),
      ...parte,
    });
  }

  for (const usuarioId of colaboradorIds) {
    await dataSource.getRepository(Colaborador).save({ causaId: causa.id, usuarioId });
  }
  return causa;
}
