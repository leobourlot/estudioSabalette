const CUIT_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** DNI ya normalizado: 7 u 8 dígitos (RF-6). */
export function isValidDni(value: string): boolean {
  return /^\d{7,8}$/.test(value);
}

/**
 * CUIT ya normalizado: 11 dígitos con dígito verificador válido (RF-6).
 * El verificador es 11 menos la suma ponderada módulo 11; si da 11 vale 0 y si da 10
 * no hay verificador posible para esos 10 dígitos.
 */
export function isValidCuit(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;

  const digits = [...value].map(Number);
  const sum = CUIT_WEIGHTS.reduce((total, weight, index) => total + weight * digits[index], 0);
  const remainder = 11 - (sum % 11);
  if (remainder === 10) return false;

  const checkDigit = remainder === 11 ? 0 : remainder;
  return checkDigit === digits[10];
}
