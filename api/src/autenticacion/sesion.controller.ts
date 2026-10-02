import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { toUsuarioPropio, type UsuarioPropio } from '../usuarios/usuario-propio.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import { AuthenticationService } from './autenticacion.service.js';
import { REFRESH_TOKEN_COOKIE } from './constantes.js';
import { clearSessionCookies, setSessionCookies } from './cookies-de-sesion.js';
import { AllowPendingPasswordChange, CurrentUser, Public } from './decoradores.js';
import { LoginDto } from './dto/ingresar.dto.js';
import { LoginAttemptLimiter } from './limitador-intentos.service.js';

export const TOO_MANY_ATTEMPTS_MESSAGE = 'Demasiados intentos. Probá de nuevo en unos minutos';

@Controller('sesion')
export class SessionController {
  constructor(
    private readonly authentication: AuthenticationService,
    private readonly limiter: LoginAttemptLimiter,
  ) {}

  /** Ingreso con email y contraseña (RF-8 a RF-10). */
  @Public()
  @Post('ingresar')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UsuarioPropio> {
    // request.ip ya es la IP real del usuario gracias a `trust proxy` (configureApp).
    if (!this.limiter.consumeAttempt(request.ip ?? '', body.email)) {
      throw new HttpException(TOO_MANY_ATTEMPTS_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }

    const result = await this.authentication.login(body.email, body.contrasena);
    setSessionCookies(response, result);
    return toUsuarioPropio(result.usuario);
  }

  /**
   * Renovación con la cookie de renovación (RF-12, RF-15). Es pública porque se usa justo
   * cuando el token de acceso venció. Si falla, borra las cookies.
   */
  @Public()
  @Post('renovar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    try {
      const tokens = await this.authentication.refresh(request.cookies?.[REFRESH_TOKEN_COOKIE]);
      setSessionCookies(response, tokens);
    } catch (error) {
      if (error instanceof UnauthorizedException) clearSessionCookies(response);
      throw error;
    }
  }

  /**
   * Cierre de sesión (RF-16). Es pública para que funcione aunque el token de acceso haya
   * vencido: identifica la sesión por la cookie de renovación. Siempre borra las cookies.
   */
  @Public()
  @Post('cerrar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authentication.logout(request.cookies?.[REFRESH_TOKEN_COOKIE]);
    clearSessionCookies(response);
  }

  /** Datos propios del usuario (RF-35), también con el cambio de contraseña pendiente (RF-11). */
  @AllowPendingPasswordChange()
  @Get('usuario')
  async ownUser(@CurrentUser() user: Usuario): Promise<UsuarioPropio> {
    return toUsuarioPropio(await this.authentication.findOwnUser(user.id));
  }
}
