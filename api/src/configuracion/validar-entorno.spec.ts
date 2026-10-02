import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './validar-entorno.js';

const validEnvironment = {
  DB_HOST: 'localhost',
  DB_USERNAME: 'estudio',
  DB_PASSWORD: 'secreta',
  DB_DATABASE: 'estudio_desarrollo',
  JWT_SECRET: 'x'.repeat(32),
  FRONTEND_ORIGINS: 'https://estudio.com,https://www.estudio.com',
};

function withoutVariable(name: string): Record<string, unknown> {
  const environment: Record<string, unknown> = { ...validEnvironment };
  delete environment[name];
  return environment;
}

describe('validateEnvironment', () => {
  it('devuelve la configuración con los valores por defecto de las variables opcionales', () => {
    expect(validateEnvironment(validEnvironment)).toEqual({
      PORT: 3000,
      DB_HOST: 'localhost',
      DB_PORT: 3306,
      DB_USERNAME: 'estudio',
      DB_PASSWORD: 'secreta',
      DB_DATABASE: 'estudio_desarrollo',
      JWT_SECRET: 'x'.repeat(32),
      TRUST_PROXY_HOPS: 0,
      FRONTEND_ORIGINS: ['https://estudio.com', 'https://www.estudio.com'],
    });
  });

  it('convierte a número las variables numéricas', () => {
    const config = validateEnvironment({
      ...validEnvironment,
      PORT: '8080',
      DB_PORT: '3307',
      TRUST_PROXY_HOPS: '1',
    });

    expect(config.PORT).toBe(8080);
    expect(config.DB_PORT).toBe(3307);
    expect(config.TRUST_PROXY_HOPS).toBe(1);
  });

  it.each([
    'DB_HOST',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'JWT_SECRET',
    'FRONTEND_ORIGINS',
  ])('falla nombrando la variable %s cuando falta', (name) => {
    expect(() => validateEnvironment(withoutVariable(name))).toThrow(`Falta la variable ${name}`);
  });

  it('trata una variable vacía como faltante', () => {
    expect(() => validateEnvironment({ ...validEnvironment, DB_HOST: '  ' })).toThrow(
      'Falta la variable DB_HOST',
    );
  });

  it('exige que JWT_SECRET tenga al menos 32 caracteres', () => {
    expect(() => validateEnvironment({ ...validEnvironment, JWT_SECRET: 'x'.repeat(31) })).toThrow(
      'JWT_SECRET debe tener al menos 32 caracteres',
    );
  });

  it('rechaza puertos fuera de rango o no numéricos', () => {
    expect(() => validateEnvironment({ ...validEnvironment, PORT: '70000' })).toThrow(
      'PORT debe ser un número entero entre 1 y 65535',
    );
    expect(() => validateEnvironment({ ...validEnvironment, DB_PORT: 'abc' })).toThrow(
      'DB_PORT debe ser un número entero entre 1 y 65535',
    );
  });

  it('rechaza una cantidad de saltos de proxy negativa', () => {
    expect(() => validateEnvironment({ ...validEnvironment, TRUST_PROXY_HOPS: '-1' })).toThrow(
      'TRUST_PROXY_HOPS debe ser un número entero mayor o igual a 0',
    );
  });

  it('rechaza orígenes que no son URL http o https sin ruta', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, FRONTEND_ORIGINS: 'https://estudio.com/panel' }),
    ).toThrow('FRONTEND_ORIGINS tiene un origen inválido: https://estudio.com/panel');
    expect(() =>
      validateEnvironment({ ...validEnvironment, FRONTEND_ORIGINS: 'estudio.com' }),
    ).toThrow('FRONTEND_ORIGINS tiene un origen inválido: estudio.com');
  });

  it('informa todos los errores juntos', () => {
    const environment = withoutVariable('DB_HOST');
    environment.JWT_SECRET = 'corto';

    expect(() => validateEnvironment(environment)).toThrow(
      /Falta la variable DB_HOST[\s\S]*JWT_SECRET debe tener al menos 32 caracteres/,
    );
  });
});
