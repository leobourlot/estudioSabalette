import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export const UNEXPECTED_ERROR_MESSAGE = 'Ocurrió un error inesperado';

/** Error HTTP de Express o de body-parser (por ejemplo, un JSON mal formado). */
interface ExpressHttpError {
  statusCode: number;
  message: string;
}

const isExpressHttpError = (exception: unknown): exception is ExpressHttpError =>
  exception instanceof Error &&
  typeof (exception as Partial<ExpressHttpError>).statusCode === 'number' &&
  (exception as Error & ExpressHttpError).statusCode < 500;

/** Código de MySQL de un QueryFailedError (en driverError) o de un error del driver. */
function errorCode(exception: unknown): string | null {
  const candidate = exception as { code?: unknown; driverError?: { code?: unknown } } | null;
  const code = candidate?.driverError?.code ?? candidate?.code;
  return typeof code === 'string' ? code : null;
}

/**
 * Filtro global de errores (plan 003, "Errores y registros del servidor"). Las
 * HttpException se responden igual que con el filtro de NestJS. Ante cualquier otro error
 * responde un 500 genérico y registra solo el método, el patrón de la ruta, la clase y el
 * código del error: nunca el mensaje, la pila, el cuerpo, la URL real ni el query string,
 * que pueden llevar los textos de los movimientos.
 */
@Catch()
export class NoDataExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errores');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response
        .status(status)
        .json(typeof body === 'string' ? { statusCode: status, message: body } : body);
      return;
    }

    if (isExpressHttpError(exception)) {
      response
        .status(exception.statusCode)
        .json({ statusCode: exception.statusCode, message: exception.message });
      return;
    }

    const request = http.getRequest<Request>();
    const route = (request.route as { path?: unknown } | undefined)?.path;
    const name = exception instanceof Error ? exception.constructor.name : typeof exception;
    const code = errorCode(exception);
    this.logger.error(
      `Error inesperado en ${request.method} ${typeof route === 'string' ? route : '(ruta sin resolver)'}: ${name}${code ? ` ${code}` : ''}`,
    );
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: UNEXPECTED_ERROR_MESSAGE });
  }
}
