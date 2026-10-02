import type { ValidationError } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { formatValidationErrors } from './errores-de-validacion.js';

const error = (
  property: string,
  constraints?: Record<string, string>,
  children: ValidationError[] = [],
): ValidationError => ({ property, constraints, children });

describe('formatValidationErrors', () => {
  it('devuelve los mensajes de cada restricción', () => {
    expect(
      formatValidationErrors([
        error('email', { isString: 'El email es obligatorio' }),
        error('contrasena', { isString: 'La contraseña es obligatoria' }),
      ]),
    ).toEqual(['El email es obligatorio', 'La contraseña es obligatoria']);
  });

  it('traduce el rechazo de campos desconocidos', () => {
    expect(
      formatValidationErrors([
        error('rol', { whitelistValidation: 'property rol should not exist' }),
      ]),
    ).toEqual(['El campo rol no está permitido']);
  });

  it('incluye los errores de objetos anidados, con la ruta del campo desconocido', () => {
    expect(
      formatValidationErrors([
        error('cliente', undefined, [
          error('dni', { isDni: 'El DNI o CUIT no es válido' }),
          error('extra', { whitelistValidation: 'property extra should not exist' }),
        ]),
      ]),
    ).toEqual(['El DNI o CUIT no es válido', 'El campo cliente.extra no está permitido']);
  });
});
