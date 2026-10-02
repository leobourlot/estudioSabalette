import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearUsuariosClientesYSesiones1790969709009 implements MigrationInterface {
  name = 'CrearUsuariosClientesYSesiones1790969709009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`usuarios\` (\`id\` int NOT NULL AUTO_INCREMENT, \`rol\` enum ('admin', 'abogado', 'cliente') NOT NULL, \`esPrincipal\` tinyint NOT NULL DEFAULT 0, \`email\` varchar(254) NULL, \`nombre\` varchar(55) NOT NULL, \`apellido\` varchar(55) NOT NULL, \`contrasenaHash\` varchar(255) NOT NULL, \`debeCambiarContrasena\` tinyint NOT NULL DEFAULT 1, \`activo\` tinyint NOT NULL DEFAULT 1, \`ultimoIngreso\` datetime NULL, \`creadoPorId\` int NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`modificadoPorId\` int NULL, \`modificadoEn\` datetime NULL, UNIQUE INDEX \`UQ_usuarios_email\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clientes\` (\`usuarioId\` int NOT NULL, \`tipoPersona\` enum ('fisica', 'juridica') NOT NULL, \`dni\` varchar(8) NULL, \`cuit\` char(11) NULL, \`razonSocial\` varchar(55) NULL, \`telefono\` varchar(15) NULL, \`domicilio\` varchar(55) NULL, UNIQUE INDEX \`UQ_clientes_dni\` (\`dni\`), UNIQUE INDEX \`UQ_clientes_cuit\` (\`cuit\`), PRIMARY KEY (\`usuarioId\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await queryRunner.query(
      `CREATE TABLE \`sesiones\` (\`id\` int NOT NULL AUTO_INCREMENT, \`usuarioId\` int NOT NULL, \`tokenHash\` char(64) NOT NULL, \`tokenAnteriorHash\` char(64) NULL, \`creadaEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`venceEn\` datetime NOT NULL, \`revocadaEn\` datetime NULL, \`intentosContrasenaFallidos\` int NOT NULL DEFAULT '0', \`primerIntentoFallidoEn\` datetime NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await queryRunner.query(
      `ALTER TABLE \`usuarios\` ADD CONSTRAINT \`FK_137bffcf9ceca286db5d548642a\` FOREIGN KEY (\`creadoPorId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`usuarios\` ADD CONSTRAINT \`FK_7b76f27bf46e574ae16ece613f5\` FOREIGN KEY (\`modificadoPorId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clientes\` ADD CONSTRAINT \`FK_cd3ac1304e69f6efe85ac90fe0b\` FOREIGN KEY (\`usuarioId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`sesiones\` ADD CONSTRAINT \`FK_1e2e12e2ffd791298d701f2ae55\` FOREIGN KEY (\`usuarioId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`sesiones\` DROP FOREIGN KEY \`FK_1e2e12e2ffd791298d701f2ae55\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clientes\` DROP FOREIGN KEY \`FK_cd3ac1304e69f6efe85ac90fe0b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`usuarios\` DROP FOREIGN KEY \`FK_7b76f27bf46e574ae16ece613f5\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`usuarios\` DROP FOREIGN KEY \`FK_137bffcf9ceca286db5d548642a\``,
    );
    await queryRunner.query(`DROP TABLE \`sesiones\``);
    await queryRunner.query(`DROP INDEX \`UQ_clientes_cuit\` ON \`clientes\``);
    await queryRunner.query(`DROP INDEX \`UQ_clientes_dni\` ON \`clientes\``);
    await queryRunner.query(`DROP TABLE \`clientes\``);
    await queryRunner.query(`DROP INDEX \`UQ_usuarios_email\` ON \`usuarios\``);
    await queryRunner.query(`DROP TABLE \`usuarios\``);
  }
}
