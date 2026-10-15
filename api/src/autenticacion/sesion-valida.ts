import type { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import type { Sesion } from '../usuarios/sesion.entity.js';

/** Contenido del token de acceso: el usuario y su sesión. */
export interface AccessTokenPayload {
  sub: number;
  sid: number;
}

/**
 * La sesión del token de acceso, con su usuario, si es válida; si no, null (plan 007, "Contrato
 * de la API"). Válida es: token firmado y vigente, sesión existente, no revocada ni vencida, del
 * mismo usuario del token y con la cuenta activa. Solo lee: no extiende ni renueva nada. La usan
 * el guard de autenticación, que después extiende la sesión (spec 001, RF-12 a RF-14), y el
 * estado de la sesión del sitio público, que no la extiende (spec 007, RF-31).
 */
export async function findValidSession(
  sessions: Pick<Repository<Sesion>, 'findOne'>,
  jwt: JwtService,
  token: unknown,
): Promise<Sesion | null> {
  const payload = await verifyAccessToken(jwt, token);
  if (!payload) return null;

  const session = await sessions.findOne({
    where: { id: payload.sid },
    relations: { usuario: true },
  });
  if (
    !session ||
    session.revocadaEn !== null ||
    session.venceEn.getTime() <= Date.now() ||
    session.usuarioId !== payload.sub ||
    !session.usuario?.activo
  ) {
    return null;
  }
  return session;
}

async function verifyAccessToken(
  jwt: JwtService,
  token: unknown,
): Promise<AccessTokenPayload | null> {
  if (typeof token !== 'string' || token === '') return null;
  try {
    const payload = await jwt.verifyAsync<AccessTokenPayload>(token, { algorithms: ['HS256'] });
    if (!Number.isInteger(payload.sub) || !Number.isInteger(payload.sid)) return null;
    return payload;
  } catch {
    return null;
  }
}
