import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DNI de los integrantes del estudio, con el que ingresan (spec 001, RF-2, RF-8). Queda
 * opcional en la base: los clientes guardan el suyo en `clientes`, y los integrantes ya
 * cargados no lo tienen hasta que se les asigne.
 */
export class AgregarDniAIntegrantes1793318400000 implements MigrationInterface {
  name = 'AgregarDniAIntegrantes1793318400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`usuarios\` ADD \`dni\` varchar(8) NULL AFTER \`email\``);
    await queryRunner.query(`CREATE UNIQUE INDEX \`UQ_usuarios_dni\` ON \`usuarios\` (\`dni\`)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`UQ_usuarios_dni\` ON \`usuarios\``);
    await queryRunner.query(`ALTER TABLE \`usuarios\` DROP COLUMN \`dni\``);
  }
}
