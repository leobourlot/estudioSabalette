import type { Environment } from '../../src/configuracion/validar-entorno.js';
import { validateEnvironment } from '../../src/configuracion/validar-entorno.js';

/**
 * Carga y valida api/.env.test. Por seguridad, los e2e se niegan a correr si el nombre
 * de la base no contiene "test": borran datos y nunca deben tocar desarrollo ni producción.
 */
export function loadTestEnvironment(): Environment {
  process.loadEnvFile('.env.test');
  const environment = validateEnvironment(process.env);
  if (!/test/i.test(environment.DB_DATABASE)) {
    throw new Error(
      `Los tests e2e solo corren sobre una base cuyo nombre contenga "test" (DB_DATABASE actual: ${environment.DB_DATABASE}).`,
    );
  }
  return environment;
}
