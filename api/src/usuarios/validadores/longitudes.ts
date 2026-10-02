/** Nombre, apellido, razón social, nombre y apellido de contacto, y domicilio (RF-6). */
export const MAX_TEXT_LENGTH = 55;

/** Teléfono (RF-6). */
export const MAX_PHONE_LENGTH = 15;

/**
 * Cuenta caracteres Unicode (un emoji es uno solo), igual que las columnas varchar de MySQL
 * con utf8mb4. `value.length` contaría algunos emojis como dos.
 */
export function fitsMaxLength(value: string, max: number): boolean {
  return [...value].length <= max;
}

export function isBlank(value: string): boolean {
  return value.trim() === '';
}
