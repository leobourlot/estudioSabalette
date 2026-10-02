/** Email sin espacios al inicio o al final y en minúsculas (RF-5). */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * DNI o CUIT sin puntos, guiones ni espacios (RF-5). Cualquier otro carácter se conserva
 * para que la validación lo rechace en lugar de aceptarlo en silencio.
 */
export function normalizeDocumentNumber(value: string): string {
  return value.replace(/[.\-\s]/g, '');
}
