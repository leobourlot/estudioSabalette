import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sesion } from '../usuarios/sesion.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { normalizeEmail } from '../usuarios/validadores/normalizar.js';
import type { AccessTokenPayload } from './autenticacion.guard.js';
import { ACCESS_TOKEN_TTL_SECONDS, INVALID_SESSION_MESSAGE, sessionTtlMs } from './constantes.js';
import { PasswordsService } from './contrasenas.service.js';
import {
  createSessionSecret,
  formatRefreshToken,
  hashSessionSecret,
  parseRefreshToken,
  sameHash,
} from './tokens.js';

export const INVALID_CREDENTIALS_MESSAGE = 'Email o contraseña incorrectos';
export const WRONG_CURRENT_PASSWORD_MESSAGE = 'La contraseña actual no es correcta';
export const SESSION_CLOSED_FOR_SECURITY_MESSAGE =
  'Por seguridad, cerramos tu sesión. Volvé a ingresar';

const MAX_WRONG_CURRENT_PASSWORD = 5;
const PASSWORD_ATTEMPTS_WINDOW_MS = 15 * 60_000;

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
      select: { id: true, contrasenaHash: true, activo: true, rol: true },
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
      venceEn: new Date(now.getTime() + sessionTtlMs(credentials.rol)),
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
   * vencimiento según el rol. Si se presenta el secreto ya reemplazado, revoca la sesión.
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
        venceEn: new Date(now.getTime() + sessionTtlMs(session.usuario.rol)),
      },
    );
    if (result.affected !== 1) throw new UnauthorizedException(INVALID_SESSION_MESSAGE);

    return {
      accessToken: await this.signAccessToken(session.usuarioId, session.id),
      refreshToken: formatRefreshToken(session.id, secret),
    };
  }

  /**
   * Cierre de sesión (RF-16) con el token de renovación, que sigue disponible aunque el de
   * acceso haya vencido. Solo revoca si el secreto corresponde; si no, no hace nada.
   */
  async logout(refreshToken: unknown): Promise<void> {
    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) return;

    const session = await this.sessions.findOne({ where: { id: parsed.sessionId } });
    if (
      session &&
      session.revocadaEn === null &&
      sameHash(hashSessionSecret(parsed.secret), session.tokenHash)
    ) {
      await this.sessions.update(session.id, { revocadaEn: new Date() });
    }
  }

  /**
   * Cambio de la contraseña propia (RF-36 a RF-39). Cada error de la contraseña actual se
   * cuenta en la sesión; al quinto en 15 minutos se revoca la sesión (RF-38).
   */
  async changePassword(
    userId: number,
    session: Sesion,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const ruleViolation = this.passwords.findRuleViolation(newPassword);
    if (ruleViolation) throw new BadRequestException(ruleViolation);

    const credentials = await this.users.findOne({
      where: { id: userId },
      select: { id: true, contrasenaHash: true },
    });
    if (!credentials) throw new UnauthorizedException(INVALID_SESSION_MESSAGE);

    if (!(await this.passwords.verify(currentPassword, credentials.contrasenaHash))) {
      await this.registerWrongCurrentPassword(session);
    }

    const sameAsCurrent = this.passwords.findRuleViolation(newPassword, currentPassword);
    if (sameAsCurrent) throw new BadRequestException(sameAsCurrent);

    // Condicionado al hash leído: si mientras tanto alguien restableció la contraseña,
    // prevalece el restablecimiento (RF-33) y este cambio no se aplica.
    const result = await this.users.update(
      { id: userId, contrasenaHash: credentials.contrasenaHash },
      { contrasenaHash: await this.passwords.hash(newPassword), debeCambiarContrasena: false },
    );
    if (result.affected !== 1) throw new UnauthorizedException(INVALID_SESSION_MESSAGE);

    await this.sessions.update(session.id, {
      intentosContrasenaFallidos: 0,
      primerIntentoFallidoEn: null,
    });
  }

  private async registerWrongCurrentPassword(session: Sesion): Promise<never> {
    const now = Date.now();
    const windowExpired =
      session.primerIntentoFallidoEn === null ||
      now - session.primerIntentoFallidoEn.getTime() >= PASSWORD_ATTEMPTS_WINDOW_MS;
    const attempts = windowExpired ? 1 : session.intentosContrasenaFallidos + 1;

    if (attempts >= MAX_WRONG_CURRENT_PASSWORD) {
      await this.sessions.update(session.id, { revocadaEn: new Date(now) });
      throw new UnauthorizedException(SESSION_CLOSED_FOR_SECURITY_MESSAGE);
    }

    await this.sessions.update(session.id, {
      intentosContrasenaFallidos: attempts,
      primerIntentoFallidoEn: windowExpired ? new Date(now) : session.primerIntentoFallidoEn,
    });
    throw new BadRequestException(WRONG_CURRENT_PASSWORD_MESSAGE);
  }

  /** Usuario con sus datos de cliente, para responder sus datos propios (RF-35). */
  async findOwnUser(userId: number): Promise<Usuario> {
    const usuario = await this.users.findOne({
      where: { id: userId },
      relations: { cliente: true },
    });
    if (!usuario) throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    return usuario;
  }

  private signAccessToken(userId: number, sessionId: number): Promise<string> {
    const payload: AccessTokenPayload = { sub: userId, sid: sessionId };
    return this.jwt.signAsync(payload, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
  }
}
