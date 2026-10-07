import type { DataSourceOptions } from 'typeorm';
import type { Environment } from '../configuracion/validar-entorno.js';

export type DatabaseEnvironment = Pick<
  Environment,
  'DB_HOST' | 'DB_PORT' | 'DB_USERNAME' | 'DB_PASSWORD' | 'DB_DATABASE'
>;

/**
 * Opciones de conexión compartidas por la aplicación NestJS y el CLI de migraciones.
 * El esquema solo cambia con migraciones: synchronize y migrationsRun siempre en false.
 */
export function buildDataSourceOptions(environment: DatabaseEnvironment) {
  return {
    type: 'mysql',
    host: environment.DB_HOST,
    port: environment.DB_PORT,
    username: environment.DB_USERNAME,
    password: environment.DB_PASSWORD,
    database: environment.DB_DATABASE,
    charset: 'utf8mb4_unicode_ci',
    timezone: '-03:00',
    // La fecha de un movimiento es un día sin hora: llega como texto AAAA-MM-DD y no como
    // Date a la medianoche del huso, que en otro huso puede mostrarse como el día anterior
    // (plan 003). Las columnas DATETIME no cambian.
    dateStrings: ['DATE'],
    // Sin `logging`: las consultas llevan los textos de los movimientos (RNF de registros).
    synchronize: false,
    migrationsRun: false,
    migrationsTableName: 'migraciones',
  } as const satisfies DataSourceOptions;
}
