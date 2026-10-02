import { DataSource } from 'typeorm';
import { validateEnvironment } from '../configuracion/validar-entorno.js';
import { buildDataSourceOptions } from './opciones-base-de-datos.js';

// Solo lo usa el CLI de TypeORM (scripts migration:*), sobre el código compilado en dist/.
// Las rutas son relativas a api/, que es donde pnpm ejecuta los scripts.
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
try {
  process.loadEnvFile(envFile);
} catch (error) {
  // Sin archivo (por ejemplo en Easypanel), las variables vienen del entorno del servicio.
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

export default new DataSource({
  ...buildDataSourceOptions(validateEnvironment(process.env)),
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migraciones/*.js'],
});
