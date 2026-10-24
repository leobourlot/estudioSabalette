/**
 * Textos aprobados de la pantalla de ingreso (spec 008, anexo, T-1 a T-3). Son fijos: cambiarlos
 * exige actualizar primero la spec, y el test los compara con su anexo.
 */
export const TEXTOS_INGRESO = {
  /** T-1, en el panel de la marca. */
  titulo: 'Seguí tu caso desde donde estés.',
  /** T-2, debajo de "Ingresar". */
  indicacion: 'Usá el email y la contraseña que te dio el estudio.',
  /** T-3, debajo del botón "Ingresar". */
  olvido: '¿Olvidaste tu contraseña? Comunicate con el estudio y te la restablecemos.',
} as const;
