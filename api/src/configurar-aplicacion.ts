import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { formatValidationErrors } from './configuracion/errores-de-validacion.js';
import { NoDataExceptionFilter } from './configuracion/errores-sin-datos.filter.js';
import type { Environment } from './configuracion/validar-entorno.js';

/** Tamaño máximo del cuerpo JSON de un pedido. */
export const JSON_BODY_LIMIT = '512kb';

/**
 * Configuración HTTP común a main.ts y a los tests e2e, para que los tests ejerciten
 * exactamente la misma aplicación que corre en producción.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Environment, true>>(ConfigService);
  const allowedOrigins = config.get('FRONTEND_ORIGINS', { infer: true });

  app.setGlobalPrefix('api');

  // Cantidad de proxys delante de la API (Traefik en Easypanel), para que request.ip
  // sea la IP real del usuario tomada de X-Forwarded-For.
  app.set('trust proxy', config.get('TRUST_PROXY_HOPS', { infer: true }));

  app.use(cookieParser());

  // El texto de un modelo de escrito tiene hasta 50.000 caracteres, que con letras de varios
  // bytes superan los 100 KB que Express acepta por defecto (plan 006, "Tamaño del cuerpo").
  // El límite es de toda la API: cada DTO sigue limitando sus campos.
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });

  // Ninguna respuesta de la API queda guardada en el navegador, salga bien o mal: así no se
  // pueden volver a ver datos después de cerrar la sesión (plan 004, "Caché del navegador").
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Ante un error inesperado, no registra mensajes, cuerpos ni URLs reales, que pueden llevar
  // los textos de los movimientos (plan 003, RNF de registros).
  app.useGlobalFilters(new NoDataExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new BadRequestException(formatValidationErrors(errors)),
    }),
  );

  // Con una función, a un origen no permitido no se le envía ningún encabezado CORS.
  app.enableCors({
    origin: (origin, callback) =>
      callback(null, origin !== undefined && allowedOrigins.includes(origin)),
    credentials: true,
  });
}
