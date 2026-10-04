import { MigrationInterface, QueryRunner } from 'typeorm';

// Expresión de la columna generada claveExpediente; debe ser idéntica a la de causa.entity.ts.
const CASE_KEY_EXPRESSION =
  "CASE WHEN `activa` = 1 AND `esIncidente` = 0 AND `numeroExpediente` IS NOT NULL AND `juzgado` IS NOT NULL THEN CONCAT(`fuero`, '|', `juzgado`, '|', `numeroExpediente`) END";

export class CrearCausasPartesYColaboradores1791156117399 implements MigrationInterface {
  name = 'CrearCausasPartesYColaboradores1791156117399';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`causa_colaboradores\` (\`causaId\` int NOT NULL, \`usuarioId\` int NOT NULL, PRIMARY KEY (\`causaId\`, \`usuarioId\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await queryRunner.query(
      `CREATE TABLE \`partes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`causaId\` int NOT NULL, \`rol\` enum ('actor', 'demandado', 'tercero', 'otro') NOT NULL, \`clienteId\` int NULL, \`tipoPersona\` enum ('fisica', 'juridica') NULL, \`nombre\` varchar(55) NULL, \`apellido\` varchar(55) NULL, \`razonSocial\` varchar(55) NULL, \`dni\` varchar(8) NULL, \`cuit\` char(11) NULL, \`vigente\` tinyint NOT NULL DEFAULT 1, \`creadoPorId\` int NOT NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`modificadoPorId\` int NULL, \`modificadoEn\` datetime NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await queryRunner.query(
      `CREATE TABLE \`causas\` (\`id\` int NOT NULL AUTO_INCREMENT, \`caratula\` varchar(255) NOT NULL, \`numeroExpediente\` varchar(50) NULL, \`numeroExpedienteBusqueda\` varchar(50) NULL, \`juzgado\` varchar(150) NULL, \`fuero\` enum ('civil', 'penal', 'familia', 'laboral', 'federal', 'otro') NOT NULL, \`estado\` enum ('en_tramite', 'paralizada', 'archivada', 'finalizada') NOT NULL DEFAULT 'en_tramite', \`esIncidente\` tinyint NOT NULL DEFAULT 0, \`expedientePrincipal\` varchar(50) NULL, \`activa\` tinyint NOT NULL DEFAULT 1, \`claveExpediente\` varchar(210) AS (${CASE_KEY_EXPRESSION}) STORED NULL, \`responsableId\` int NOT NULL, \`creadoPorId\` int NOT NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`modificadoPorId\` int NULL, \`modificadoEn\` datetime NULL, \`desactivadaPorId\` int NULL, \`desactivadaEn\` datetime NULL, \`reactivadaPorId\` int NULL, \`reactivadaEn\` datetime NULL, UNIQUE INDEX \`UQ_causas_expediente_activo\` (\`claveExpediente\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    // TypeORM compara la expresión de las columnas generadas con la que guarda en
    // typeorm_metadata. Se usa la base actual (desarrollo, tests o producción), no un nombre fijo.
    const database = await queryRunner.getCurrentDatabase();
    await queryRunner.query(
      `INSERT INTO \`typeorm_metadata\`(\`database\`, \`schema\`, \`table\`, \`type\`, \`name\`, \`value\`) VALUES (DEFAULT, ?, ?, ?, ?, ?)`,
      [database, 'causas', 'GENERATED_COLUMN', 'claveExpediente', CASE_KEY_EXPRESSION],
    );
    await queryRunner.query(
      `ALTER TABLE \`causa_colaboradores\` ADD CONSTRAINT \`FK_40b7c79d25ac4e577b4af150f89\` FOREIGN KEY (\`causaId\`) REFERENCES \`causas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`causa_colaboradores\` ADD CONSTRAINT \`FK_844b0a5df116eaaf2288ae70e8e\` FOREIGN KEY (\`usuarioId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`partes\` ADD CONSTRAINT \`FK_e6d34eaf938e75049808e639afc\` FOREIGN KEY (\`causaId\`) REFERENCES \`causas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`partes\` ADD CONSTRAINT \`FK_8fbb69a99545c8ebec610c337dd\` FOREIGN KEY (\`clienteId\`) REFERENCES \`clientes\`(\`usuarioId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`partes\` ADD CONSTRAINT \`FK_7e2dc268bfef183a96e2fb7ae23\` FOREIGN KEY (\`creadoPorId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`partes\` ADD CONSTRAINT \`FK_6d1a2b781e2c591403a7467ae30\` FOREIGN KEY (\`modificadoPorId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`causas\` ADD CONSTRAINT \`FK_a8f20709f0ca488eabaab086a7c\` FOREIGN KEY (\`responsableId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`causas\` ADD CONSTRAINT \`FK_ae06c09cba3c6a51d9f519e003b\` FOREIGN KEY (\`creadoPorId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`causas\` ADD CONSTRAINT \`FK_021103332cf8af66ad14455a644\` FOREIGN KEY (\`modificadoPorId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`causas\` ADD CONSTRAINT \`FK_89ba65ebdc34364d8af4dc5adcd\` FOREIGN KEY (\`desactivadaPorId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`causas\` ADD CONSTRAINT \`FK_a4031b6a129d49bf0ba121e9cc3\` FOREIGN KEY (\`reactivadaPorId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`causas\` DROP FOREIGN KEY \`FK_a4031b6a129d49bf0ba121e9cc3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`causas\` DROP FOREIGN KEY \`FK_89ba65ebdc34364d8af4dc5adcd\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`causas\` DROP FOREIGN KEY \`FK_021103332cf8af66ad14455a644\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`causas\` DROP FOREIGN KEY \`FK_ae06c09cba3c6a51d9f519e003b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`causas\` DROP FOREIGN KEY \`FK_a8f20709f0ca488eabaab086a7c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`partes\` DROP FOREIGN KEY \`FK_6d1a2b781e2c591403a7467ae30\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`partes\` DROP FOREIGN KEY \`FK_7e2dc268bfef183a96e2fb7ae23\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`partes\` DROP FOREIGN KEY \`FK_8fbb69a99545c8ebec610c337dd\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`partes\` DROP FOREIGN KEY \`FK_e6d34eaf938e75049808e639afc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`causa_colaboradores\` DROP FOREIGN KEY \`FK_844b0a5df116eaaf2288ae70e8e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`causa_colaboradores\` DROP FOREIGN KEY \`FK_40b7c79d25ac4e577b4af150f89\``,
    );
    const database = await queryRunner.getCurrentDatabase();
    await queryRunner.query(
      `DELETE FROM \`typeorm_metadata\` WHERE \`type\` = ? AND \`name\` = ? AND \`schema\` = ? AND \`table\` = ?`,
      ['GENERATED_COLUMN', 'claveExpediente', database, 'causas'],
    );
    await queryRunner.query(`DROP INDEX \`UQ_causas_expediente_activo\` ON \`causas\``);
    await queryRunner.query(`DROP TABLE \`causas\``);
    await queryRunner.query(`DROP TABLE \`partes\``);
    await queryRunner.query(`DROP TABLE \`causa_colaboradores\``);
  }
}
