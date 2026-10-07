import { BadRequestException, ConflictException, HttpException, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NoDataExceptionFilter, UNEXPECTED_ERROR_MESSAGE } from './errores-sin-datos.filter.js';

const SECRET = 'Texto reservado del movimiento';

interface FakeRequest {
  method: string;
  originalUrl: string;
  route?: { path: string };
}

function hostFor(request: FakeRequest) {
  const response = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

const MOVEMENT_REQUEST: FakeRequest = {
  method: 'PATCH',
  originalUrl: `/api/panel/causas/3/movimientos/7?buscar=${encodeURIComponent(SECRET)}`,
  route: { path: '/api/panel/causas/:causaId/movimientos/:movimientoId' },
};

describe('NoDataExceptionFilter (RNF de registros)', () => {
  const filter = new NoDataExceptionFilter();
  let logged: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logged.mockRestore();
  });

  it('responde una HttpException con su estado y su cuerpo, como el filtro de NestJS', () => {
    const { host, response } = hostFor(MOVEMENT_REQUEST);
    const exception = new BadRequestException(['Indicá la fecha del movimiento']);

    filter.catch(exception, host);

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(exception.getResponse());
    expect(logged).not.toHaveBeenCalled();
  });

  it('responde una HttpException con un texto como { statusCode, message }', () => {
    const { host, response } = hostFor(MOVEMENT_REQUEST);

    filter.catch(new HttpException('Demasiados intentos', 429), host);

    expect(response.statusCode).toBe(429);
    expect(response.body).toEqual({ statusCode: 429, message: 'Demasiados intentos' });
  });

  it('mantiene el cuerpo de una ConflictException', () => {
    const { host, response } = hostFor(MOVEMENT_REQUEST);
    const exception = new ConflictException('El movimiento ya está anulado');

    filter.catch(exception, host);

    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual(exception.getResponse());
  });

  it('responde un error HTTP de Express (por ejemplo, JSON mal formado) con su estado, sin registrarlo', () => {
    const { host, response } = hostFor(MOVEMENT_REQUEST);
    const parseError = Object.assign(new SyntaxError('Unexpected token in JSON'), {
      statusCode: 400,
      status: 400,
    });

    filter.catch(parseError, host);

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ statusCode: 400, message: 'Unexpected token in JSON' });
    expect(logged).not.toHaveBeenCalled();
  });

  it('ante un error inesperado responde 500 genérico y registra solo método, patrón de ruta, clase y código', () => {
    const { host, response } = hostFor(MOVEMENT_REQUEST);
    const exception = new QueryFailedError('UPDATE movimientos SET descripcion = ?', [SECRET], {
      code: 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD',
      message: `Incorrect string value: '${SECRET}' for column 'descripcion'`,
    } as unknown as Error);

    filter.catch(exception, host);

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ statusCode: 500, message: UNEXPECTED_ERROR_MESSAGE });
    expect(logged).toHaveBeenCalledTimes(1);
    const line = logged.mock.calls[0].map(String).join(' ');
    expect(line).toContain('PATCH /api/panel/causas/:causaId/movimientos/:movimientoId');
    expect(line).toContain('QueryFailedError');
    expect(line).toContain('ER_TRUNCATED_WRONG_VALUE_FOR_FIELD');
    expect(line).not.toContain(SECRET);
    expect(line).not.toContain(encodeURIComponent(SECRET));
    expect(line).not.toContain('/causas/3/');
    expect(line).not.toContain('buscar');
  });

  it('sin ruta resuelta, no registra la URL real', () => {
    const { host, response } = hostFor({ method: 'GET', originalUrl: `/api/x?q=${SECRET}` });

    filter.catch(new Error(SECRET), host);

    expect(response.statusCode).toBe(500);
    const line = logged.mock.calls[0].map(String).join(' ');
    expect(line).toContain('GET (ruta sin resolver)');
    expect(line).toContain('Error');
    expect(line).not.toContain(SECRET);
  });

  it('el mensaje genérico está en español', () => {
    expect(UNEXPECTED_ERROR_MESSAGE).toBe('Ocurrió un error inesperado');
  });
});
