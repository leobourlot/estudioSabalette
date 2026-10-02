import { DataSource } from 'typeorm';
import { validateEnvironment } from '../configuracion/validar-entorno.js';
import { ENTITIES, MIGRATIONS } from './esquema.js';
import { buildDataSourceOptions } from './opciones-base-de-datos.js';

// Solo lo usa el CLI de TypeORM (scripts migration:*), sobre el código compilado en dist/.
// El archivo .env se busca en api/, que es donde pnpm ejecuta los scripts.
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
try {
  process.loadEnvFile(envFile);
} catch (error) {
  // Sin archivo (por ejemplo en Easypanel), las variables vienen del entorno del servicio.
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

export default new DataSource({
  ...buildDataSourceOptions(validateEnvironment(process.env)),
  entities: ENTITIES,
  migrations: MIGRATIONS,
});
