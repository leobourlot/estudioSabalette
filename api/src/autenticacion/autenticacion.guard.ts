import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { IsNull, Repository } from 'typeorm';
import { Sesion } from '../usuarios/sesion.entity.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import { ACCESS_TOKEN_COOKIE, INVALID_SESSION_MESSAGE, sessionTtlMs } from './constantes.js';
import { IS_PUBLIC_KEY } from './decoradores.js';
import { findValidSession } from './sesion-valida.js';

export type { AccessTokenPayload } from './sesion-valida.js';

export interface AuthenticatedRequest extends Request {
  usuario?: Usuario;
  sesion?: Sesion;
}

/**
 * Guard global: toda ruta exige sesión salvo las marcadas con @Public() (RF-18).
 * En cada petición verifica el token de acceso y relee de la base la sesión y el usuario,
 * así una sesión revocada, un usuario desactivado o un cambio de rol rigen al instante (RF-14).
 * La validación es la de findValidSession, que comparte con el estado de la sesión del sitio
 * público (spec 007). Cada petición cuenta como uso: corre el vencimiento de la sesión según el
 * rol vigente (spec 001, RF-12; spec 004, RF-4).
 */
@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @InjectRepository(Sesion) private readonly sessions: Repository<Sesion>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = await findValidSession(
      this.sessions,
      this.jwt,
      request.cookies?.[ACCESS_TOKEN_COOKIE],
    );
    if (!session) throw new UnauthorizedException(INVALID_SESSION_MESSAGE);

    // Condicionado a que siga abierta: no revive una sesión cerrada mientras tanto.
    await this.sessions.update(
      { id: session.id, revocadaEn: IsNull() },
      { venceEn: new Date(Date.now() + sessionTtlMs(session.usuario.rol)) },
    );

    request.usuario = session.usuario;
    request.sesion = session;
    return true;
  }
}
