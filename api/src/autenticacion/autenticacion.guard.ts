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
import { Repository } from 'typeorm';
import { Sesion } from '../usuarios/sesion.entity.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import { ACCESS_TOKEN_COOKIE, INVALID_SESSION_MESSAGE } from './constantes.js';
import { IS_PUBLIC_KEY } from './decoradores.js';

export interface AccessTokenPayload {
  sub: number;
  sid: number;
}

export interface AuthenticatedRequest extends Request {
  usuario?: Usuario;
  sesion?: Sesion;
}

/**
 * Guard global: toda ruta exige sesión salvo las marcadas con @Public() (RF-18).
 * En cada petición verifica el token de acceso y relee de la base la sesión y el usuario,
 * así una sesión revocada, un usuario desactivado o un cambio de rol rigen al instante (RF-14).
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
    const payload = await this.verifyAccessToken(request.cookies?.[ACCESS_TOKEN_COOKIE]);

    const session = await this.sessions.findOne({
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
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    request.usuario = session.usuario;
    request.sesion = session;
    return true;
  }

  private async verifyAccessToken(token: unknown): Promise<AccessTokenPayload> {
    if (typeof token !== 'string' || token === '') {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        algorithms: ['HS256'],
      });
      if (!Number.isInteger(payload.sub) || !Number.isInteger(payload.sid)) {
        throw new Error('Contenido del token inválido');
      }
      return payload;
    } catch {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }
  }
}
