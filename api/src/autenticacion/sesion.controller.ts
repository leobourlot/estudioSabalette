import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { toUsuarioPropio, type UsuarioPropio } from '../usuarios/usuario-propio.js';
import { AuthenticationService } from './autenticacion.service.js';
import { setSessionCookies } from './cookies-de-sesion.js';
import { Public } from './decoradores.js';
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
}
