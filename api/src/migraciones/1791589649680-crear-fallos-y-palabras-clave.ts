import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearFallosYPalabrasClave1791589649680 implements MigrationInterface {
  name = 'CrearFallosYPalabrasClave1791589649680';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`fallos\` (\`id\` int NOT NULL AUTO_INCREMENT, \`caratula\` varchar(255) NOT NULL, \`tribunal\` varchar(150) NOT NULL, \`fuero\` enum ('civil', 'penal', 'familia', 'laboral', 'federal', 'otro') NOT NULL, \`fecha\` date NOT NULL, \`numero\` varchar(50) NULL, \`numeroBusqueda\` varchar(50) NULL, \`sumario\` varchar(5000) NOT NULL, \`enlace\` varchar(500) NULL, \`activo\` tinyint NOT NULL DEFAULT 1, \`creadoPorId\` int NOT NULL, \`creadoEn\` datetime(6) NOT NULL, \`modificadoPorId\` int NULL, \`modificadoEn\` datetime(6) NULL, INDEX \`IDX_fallos_listado\` (\`activo\`, \`fecha\`, \`creadoEn\`, \`id\`), INDEX \`IDX_fallos_repetido\` (\`tribunal\`, \`numero\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await queryRunner.query(
      `CREATE TABLE \`palabras_clave\` (\`id\` int NOT NULL AUTO_INCREMENT, \`texto\` varchar(50) NOT NULL, \`clave\` varchar(50) COLLATE "utf8mb4_bin" NOT NULL, \`creadoEn\` datetime(6) NOT NULL, UNIQUE INDEX \`UQ_palabras_clave_clave\` (\`clave\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await queryRunner.query(
      `CREATE TABLE \`fallo_palabras_clave\` (\`falloId\` int NOT NULL, \`palabraClaveId\` int NOT NULL, INDEX \`IDX_fallo_palabras_clave_palabra\` (\`palabraClaveId\`, \`falloId\`), PRIMARY KEY (\`falloId\`, \`palabraClaveId\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await queryRunner.query(
      `ALTER TABLE \`fallos\` ADD CONSTRAINT \`FK_5a94a9a4fa210c85a3a1cd286d8\` FOREIGN KEY (\`creadoPorId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`fallos\` ADD CONSTRAINT \`FK_f12fa3fdb1a369364de748188d1\` FOREIGN KEY (\`modificadoPorId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`fallo_palabras_clave\` ADD CONSTRAINT \`FK_47cbc59110af7de8b7dcdf14646\` FOREIGN KEY (\`falloId\`) REFERENCES \`fallos\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`fallo_palabras_clave\` ADD CONSTRAINT \`FK_f4b979dffbb3f3e07f4ec3946f7\` FOREIGN KEY (\`palabraClaveId\`) REFERENCES \`palabras_clave\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`fallo_palabras_clave\` DROP FOREIGN KEY \`FK_f4b979dffbb3f3e07f4ec3946f7\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`fallo_palabras_clave\` DROP FOREIGN KEY \`FK_47cbc59110af7de8b7dcdf14646\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`fallos\` DROP FOREIGN KEY \`FK_f12fa3fdb1a369364de748188d1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`fallos\` DROP FOREIGN KEY \`FK_5a94a9a4fa210c85a3a1cd286d8\``,
    );
    await queryRunner.query(`DROP TABLE \`fallo_palabras_clave\``);
    await queryRunner.query(`DROP TABLE \`palabras_clave\``);
    await queryRunner.query(`DROP TABLE \`fallos\``);
  }
}
