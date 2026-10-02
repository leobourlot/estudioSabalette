import type { ValidationError } from '@nestjs/common';

/**
 * Convierte los errores de class-validator en una lista de mensajes en español. Los DTO
 * definen sus mensajes; el único que genera la librería en inglés es el de campo desconocido.
 */
export function formatValidationErrors(errors: ValidationError[], parentPath = ''): string[] {
  return errors.flatMap((error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own = Object.entries(error.constraints ?? {}).map(([constraint, message]) =>
      constraint === 'whitelistValidation' ? `El campo ${path} no está permitido` : message,
    );
    return [...own, ...formatValidationErrors(error.children ?? [], path)];
  });
}
