import { MigrationInterface, QueryRunner } from 'typeorm';

/** Abogado patrocinante de una parte no cliente (spec 002, RF-15). */
export class AgregarAbogadoPatrocinanteAPartes1793145297279 implements MigrationInterface {
  name = 'AgregarAbogadoPatrocinanteAPartes1793145297279';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`partes\` ADD \`abogadoPatrocinante\` varchar(110) NULL AFTER \`cuit\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`partes\` DROP COLUMN \`abogadoPatrocinante\``);
  }
}
