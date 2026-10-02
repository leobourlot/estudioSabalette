// Nombres y vidas de las credenciales de sesión (ver plan 001, "Flujo de la sesión").
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

// La sesión vence tras 7 días sin uso: cada renovación corre el vencimiento (RF-12).
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const INVALID_SESSION_MESSAGE = 'Tu sesión no es válida o venció. Volvé a ingresar';
