import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Environment } from '../configuracion/validar-entorno.js';
import { Cliente } from '../usuarios/cliente.entity.js';
import { Sesion } from '../usuarios/sesion.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { AuthenticationGuard } from './autenticacion.guard.js';
import { PendingPasswordChangeGuard } from './cambio-pendiente.guard.js';
import { ACCESS_TOKEN_TTL_SECONDS } from './constantes.js';
import { PasswordsService } from './contrasenas.service.js';
import { LoginAttemptLimiter } from './limitador-intentos.service.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, Cliente, Sesion]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_TTL_SECONDS },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  providers: [
    PasswordsService,
    LoginAttemptLimiter,
    // Guards globales, en este orden: sesión (RF-18), cambio de contraseña pendiente (RF-11)
    // y rol (RF-19). Nest los ejecuta en el orden en que se registran.
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: PendingPasswordChangeGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [PasswordsService],
})
export class AuthenticationModule {}
