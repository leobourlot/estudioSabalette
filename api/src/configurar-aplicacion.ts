import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { Environment } from './configuracion/validar-entorno.js';

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

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // Con una función, a un origen no permitido no se le envía ningún encabezado CORS.
  app.enableCors({
    origin: (origin, callback) =>
      callback(null, origin !== undefined && allowedOrigins.includes(origin)),
    credentials: true,
  });
}
