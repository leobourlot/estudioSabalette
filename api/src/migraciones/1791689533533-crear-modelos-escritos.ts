import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearModelosEscritos1791689533533 implements MigrationInterface {
  name = 'CrearModelosEscritos1791689533533';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`modelos_escritos\` (\`id\` int NOT NULL AUTO_INCREMENT, \`titulo\` varchar(150) NOT NULL, \`tipo\` enum ('demanda', 'contestacion_demanda', 'escrito_tramite', 'recurso', 'oficio', 'cedula', 'otro') NOT NULL, \`fuero\` enum ('civil', 'penal', 'familia', 'laboral', 'federal', 'otro') NOT NULL DEFAULT 'otro', \`descripcion\` varchar(500) NULL, \`texto\` mediumtext NOT NULL, \`activo\` tinyint NOT NULL DEFAULT 1, \`creadoPorId\` int NOT NULL, \`creadoEn\` datetime(6) NOT NULL, \`modificadoPorId\` int NULL, \`modificadoEn\` datetime(6) NULL, INDEX \`IDX_modelos_escritos_listado\` (\`activo\`, \`titulo\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await queryRunner.query(
      `ALTER TABLE \`modelos_escritos\` ADD CONSTRAINT \`FK_a32a6dc82cf4463f348514b549c\` FOREIGN KEY (\`creadoPorId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`modelos_escritos\` ADD CONSTRAINT \`FK_e327e455ed59c9bb8891c2cb826\` FOREIGN KEY (\`modificadoPorId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`modelos_escritos\` DROP FOREIGN KEY \`FK_e327e455ed59c9bb8891c2cb826\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`modelos_escritos\` DROP FOREIGN KEY \`FK_a32a6dc82cf4463f348514b549c\``,
    );
    await queryRunner.query(`DROP TABLE \`modelos_escritos\``);
  }
}
