export interface Environment {
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  JWT_SECRET: string;
  TRUST_PROXY_HOPS: number;
  FRONTEND_ORIGINS: string[];
}

const MIN_JWT_SECRET_LENGTH = 32;

type RawEnvironment = Record<string, unknown>;

function readText(raw: RawEnvironment, name: string): string | undefined {
  const value = raw[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function readRequired(raw: RawEnvironment, name: string, errors: string[]): string {
  const value = readText(raw, name);
  if (value === undefined) {
    errors.push(`Falta la variable ${name}`);
    return '';
  }
  return value;
}

function readPort(raw: RawEnvironment, name: string, fallback: number, errors: string[]): number {
  const value = readText(raw, name);
  if (value === undefined) return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push(`${name} debe ser un número entero entre 1 y 65535`);
  }
  return port;
}

function readProxyHops(raw: RawEnvironment, errors: string[]): number {
  const value = readText(raw, 'TRUST_PROXY_HOPS');
  if (value === undefined) return 0;
  const hops = Number(value);
  if (!Number.isInteger(hops) || hops < 0) {
    errors.push('TRUST_PROXY_HOPS debe ser un número entero mayor o igual a 0');
  }
  return hops;
}

function isOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value;
  } catch {
    return false;
  }
}

function readOrigins(raw: RawEnvironment, errors: string[]): string[] {
  const value = readRequired(raw, 'FRONTEND_ORIGINS', errors);
  if (value === '') return [];
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');
  for (const origin of origins) {
    if (!isOrigin(origin)) {
      errors.push(`FRONTEND_ORIGINS tiene un origen inválido: ${origin}`);
    }
  }
  return origins;
}

/**
 * Valida las variables de entorno al arrancar la API.
 * Si algo falta o es inválido, lanza un error que lista todos los problemas y la API no arranca.
 */
export function validateEnvironment(raw: RawEnvironment): Environment {
  const errors: string[] = [];

  const environment: Environment = {
    PORT: readPort(raw, 'PORT', 3000, errors),
    DB_HOST: readRequired(raw, 'DB_HOST', errors),
    DB_PORT: readPort(raw, 'DB_PORT', 3306, errors),
    DB_USERNAME: readRequired(raw, 'DB_USERNAME', errors),
    DB_PASSWORD: readRequired(raw, 'DB_PASSWORD', errors),
    DB_DATABASE: readRequired(raw, 'DB_DATABASE', errors),
    JWT_SECRET: readRequired(raw, 'JWT_SECRET', errors),
    TRUST_PROXY_HOPS: readProxyHops(raw, errors),
    FRONTEND_ORIGINS: readOrigins(raw, errors),
  };

  if (environment.JWT_SECRET !== '' && environment.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(`JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres`);
  }

  if (errors.length > 0) {
    throw new Error(`Configuración inválida:\n- ${errors.join('\n- ')}`);
  }

  return environment;
}
