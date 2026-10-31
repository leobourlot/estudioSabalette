import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Usuario } from '../../src/usuarios/usuario.entity.js';
import { TEST_PASSWORD } from './datos-de-prueba.js';

// Cada ingreso de prueba usa su propia IP para no chocar con el límite de intentos.
let ipCounter = 0;
export const nextTestIp = () => `198.51.100.${(++ipCounter % 250) + 1}`;

export function setCookieHeaders(response: request.Response): string[] {
  const header = response.headers['set-cookie'];
  return Array.isArray(header) ? header : header ? [header] : [];
}

/** Valor de una cookie enviada por la API, o undefined si no la envió. */
export function cookieValue(response: request.Response, name: string): string | undefined {
  const cookie = setCookieHeaders(response).find((value) => value.startsWith(`${name}=`));
  return cookie?.slice(name.length + 1).split(';')[0];
}

/** True si la API borró la cookie (valor vacío y vencimiento en el pasado). */
export function cookieWasCleared(response: request.Response, name: string): boolean {
  const cookie = setCookieHeaders(response).find((value) => value.startsWith(`${name}=`));
  return (
    cookie !== undefined &&
    cookie.startsWith(`${name}=;`) &&
    /Expires=Thu, 01 Jan 1970/.test(cookie)
  );
}

export interface TestSession {
  accessToken: string;
  refreshToken: string;
}

/** DNI o CUIT con el que ingresa una cuenta de prueba (spec 001, RF-8). */
export function loginDocument(usuario: Usuario): string {
  const document = usuario.dni ?? usuario.cliente?.dni ?? usuario.cliente?.cuit;
  if (!document) throw new Error(`La cuenta de prueba ${usuario.id} no tiene DNI ni CUIT`);
  return document;
}

/** Ingresa con un DNI o CUIT y TEST_PASSWORD, y devuelve los tokens de las cookies. */
export async function loginWithDocument(
  app: NestExpressApplication,
  documento: string,
): Promise<TestSession> {
  const response = await request(app.getHttpServer())
    .post('/api/sesion/ingresar')
    .set('X-Forwarded-For', nextTestIp())
    .send({ documento, contrasena: TEST_PASSWORD })
    .expect(200);
  return {
    accessToken: cookieValue(response, 'access_token')!,
    refreshToken: cookieValue(response, 'refresh_token')!,
  };
}

/**
 * Ingresa como la cuenta de prueba que tiene ese email, con su DNI o CUIT y TEST_PASSWORD.
 * Los tests identifican sus cuentas por email porque es único y fácil de leer.
 */
export async function loginAs(app: NestExpressApplication, email: string): Promise<TestSession> {
  const usuario = await app
    .get(DataSource)
    .getRepository(Usuario)
    .findOne({ where: { email }, relations: { cliente: true } });
  if (!usuario) throw new Error(`No hay ninguna cuenta de prueba con el email ${email}`);
  return loginWithDocument(app, loginDocument(usuario));
}
