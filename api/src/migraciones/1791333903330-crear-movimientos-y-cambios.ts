import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearMovimientosYCambios1791333903330 implements MigrationInterface {
  name = 'CrearMovimientosYCambios1791333903330';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`movimientos\` (\`id\` int NOT NULL AUTO_INCREMENT, \`causaId\` int NOT NULL, \`fecha\` date NOT NULL, \`tipo\` enum ('escrito_presentado', 'providencia', 'resolucion', 'sentencia', 'notificacion', 'audiencia', 'pericia', 'oficio', 'otro') NOT NULL, \`descripcion\` varchar(2000) NOT NULL, \`textoCliente\` varchar(2000) NULL, \`visible\` tinyint NOT NULL DEFAULT 0, \`anulado\` tinyint NOT NULL DEFAULT 0, \`creadoPorId\` int NOT NULL, \`creadoEn\` datetime(6) NOT NULL, \`modificadoPorId\` int NULL, \`modificadoEn\` datetime(6) NULL, INDEX \`IDX_movimientos_historial\` (\`causaId\`, \`fecha\`, \`creadoEn\`, \`id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await queryRunner.query(
      `CREATE TABLE \`movimiento_cambios\` (\`id\` int NOT NULL AUTO_INCREMENT, \`movimientoId\` int NOT NULL, \`accion\` enum ('carga', 'modificacion', 'anulacion', 'restauracion') NOT NULL, \`usuarioId\` int NOT NULL, \`fechaHora\` datetime(6) NOT NULL, \`cambios\` json NOT NULL, INDEX \`IDX_movimiento_cambios_movimiento\` (\`movimientoId\`, \`id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await queryRunner.query(
      `ALTER TABLE \`movimientos\` ADD CONSTRAINT \`FK_4215ac244274c562b0a8ee5a120\` FOREIGN KEY (\`causaId\`) REFERENCES \`causas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`movimientos\` ADD CONSTRAINT \`FK_fc76c3114d6e1513a930f1e30b9\` FOREIGN KEY (\`creadoPorId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`movimientos\` ADD CONSTRAINT \`FK_4e1751350a460d4d28ade306a32\` FOREIGN KEY (\`modificadoPorId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`movimiento_cambios\` ADD CONSTRAINT \`FK_228b47937bba0ca280ede3970de\` FOREIGN KEY (\`movimientoId\`) REFERENCES \`movimientos\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`movimiento_cambios\` ADD CONSTRAINT \`FK_04a0298eb6d645b530d6c6e9dcf\` FOREIGN KEY (\`usuarioId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`movimiento_cambios\` DROP FOREIGN KEY \`FK_04a0298eb6d645b530d6c6e9dcf\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`movimiento_cambios\` DROP FOREIGN KEY \`FK_228b47937bba0ca280ede3970de\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`movimientos\` DROP FOREIGN KEY \`FK_4e1751350a460d4d28ade306a32\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`movimientos\` DROP FOREIGN KEY \`FK_fc76c3114d6e1513a930f1e30b9\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`movimientos\` DROP FOREIGN KEY \`FK_4215ac244274c562b0a8ee5a120\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_movimiento_cambios_movimiento\` ON \`movimiento_cambios\``,
    );
    await queryRunner.query(`DROP TABLE \`movimiento_cambios\``);
    await queryRunner.query(`DROP INDEX \`IDX_movimientos_historial\` ON \`movimientos\``);
    await queryRunner.query(`DROP TABLE \`movimientos\``);
  }
}
