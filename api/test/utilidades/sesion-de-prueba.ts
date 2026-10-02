import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
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

/** Ingresa con TEST_PASSWORD y devuelve los tokens de las cookies. */
export async function loginAs(app: NestExpressApplication, email: string): Promise<TestSession> {
  const response = await request(app.getHttpServer())
    .post('/api/sesion/ingresar')
    .set('X-Forwarded-For', nextTestIp())
    .send({ email, contrasena: TEST_PASSWORD })
    .expect(200);
  return {
    accessToken: cookieValue(response, 'access_token')!,
    refreshToken: cookieValue(response, 'refresh_token')!,
  };
}
