import { createHash, randomBytes } from 'node:crypto';

/** Secreto aleatorio de 32 bytes para el token de renovación. */
export function createSessionSecret(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * SHA-256 del secreto, que es lo único que se guarda en la base. Alcanza con SHA-256
 * porque el secreto es aleatorio y largo, no una contraseña elegida por una persona.
 */
export function hashSessionSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

/** Token de renovación: `<id de sesión>.<secreto>`. */
export function formatRefreshToken(sessionId: number, secret: string): string {
  return `${sessionId}.${secret}`;
}
