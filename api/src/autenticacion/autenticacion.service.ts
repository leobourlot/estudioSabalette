import { randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sesion } from '../usuarios/sesion.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { normalizeEmail } from '../usuarios/validadores/normalizar.js';
import type { AccessTokenPayload } from './autenticacion.guard.js';
import { ACCESS_TOKEN_TTL_SECONDS, INVALID_SESSION_MESSAGE, SESSION_TTL_MS } from './constantes.js';
import { PasswordsService } from './contrasenas.service.js';
import {
  createSessionSecret,
  formatRefreshToken,
  hashSessionSecret,
  parseRefreshToken,
  sameHash,
} from './tokens.js';

export const INVALID_CREDENTIALS_MESSAGE = 'Email o contraseña incorrectos';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends SessionTokens {
  usuario: Usuario;
}

@Injectable()
export class AuthenticationService {
  // Hash de una contraseña al azar, para comparar contra algo cuando el email no existe y
  // que la respuesta tarde lo mismo exista o no la cuenta.
  private readonly dummyHash: Promise<string>;

  constructor(
    @InjectRepository(Usuario) private readonly users: Repository<Usuario>,
    @InjectRepository(Sesion) private readonly sessions: Repository<Sesion>,
    private readonly passwords: PasswordsService,
    private readonly jwt: JwtService,
  ) {
    this.dummyHash = this.passwords.hash(randomBytes(16).toString('hex'));
  }

  /**
   * Ingreso con email y contraseña (RF-8, RF-9). Ante cualquier falla responde el mismo
   * mensaje, sin indicar qué dato falló. El límite de intentos (RF-10) lo aplica el controlador.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = normalizeEmail(email);

    const credentials = await this.users.findOne({
      where: { email: normalizedEmail },
      select: { id: true, contrasenaHash: true, activo: true },
    });
    const passwordMatches = await this.passwords.verify(
      password,
      credentials?.contrasenaHash ?? (await this.dummyHash),
    );
    if (!credentials || !passwordMatches || !credentials.activo) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const now = new Date();
    // Sesión única (RF-13): borrar las anteriores las cierra y además limpia las viejas.
    await this.sessions.delete({ usuarioId: credentials.id });

    const secret = createSessionSecret();
    const session = await this.sessions.save({
      usuarioId: credentials.id,
      tokenHash: hashSessionSecret(secret),
      venceEn: new Date(now.getTime() + SESSION_TTL_MS),
    });
    await this.users.update(credentials.id, { ultimoIngreso: now });

    const usuario = await this.users.findOne({
      where: { id: credentials.id },
      relations: { cliente: true },
    });
    if (!usuario) throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    return {
      usuario,
      accessToken: await this.signAccessToken(credentials.id, session.id),
      refreshToken: formatRefreshToken(session.id, secret),
    };
  }

  /**
   * Renovación con el token de renovación (RF-12, RF-15): rota el secreto y corre el
   * vencimiento a 7 días. Si se presenta el secreto ya reemplazado, revoca la sesión.
   */
  async refresh(refreshToken: unknown): Promise<SessionTokens> {
    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) throw new UnauthorizedException(INVALID_SESSION_MESSAGE);

    const session = await this.sessions.findOne({
      where: { id: parsed.sessionId },
      relations: { usuario: true },
    });
    const now = new Date();
    if (!session || session.revocadaEn !== null || session.venceEn.getTime() <= now.getTime()) {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    const presentedHash = hashSessionSecret(parsed.secret);
    if (sameHash(presentedHash, session.tokenAnteriorHash)) {
      // Reúso de un secreto ya rotado: la credencial pudo ser robada.
      await this.sessions.update(session.id, { revocadaEn: now });
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }
    if (!sameHash(presentedHash, session.tokenHash) || !session.usuario?.activo) {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    const secret = createSessionSecret();
    // Condicionado al hash leído: si otra petición rotó primero, esta no pisa su secreto.
    const result = await this.sessions.update(
      { id: session.id, tokenHash: session.tokenHash },
      {
        tokenAnteriorHash: session.tokenHash,
        tokenHash: hashSessionSecret(secret),
        venceEn: new Date(now.getTime() + SESSION_TTL_MS),
      },
    );
    if (result.affected !== 1) throw new UnauthorizedException(INVALID_SESSION_MESSAGE);

    return {
      accessToken: await this.signAccessToken(session.usuarioId, session.id),
      refreshToken: formatRefreshToken(session.id, secret),
    };
  }

  private signAccessToken(userId: number, sessionId: number): Promise<string> {
    const payload: AccessTokenPayload = { sub: userId, sid: sessionId };
    return this.jwt.signAsync(payload, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
  }
}
