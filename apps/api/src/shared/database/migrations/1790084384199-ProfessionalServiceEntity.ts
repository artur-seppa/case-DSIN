import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfessionalServiceEntity1790084384199 implements MigrationInterface {
  name = 'ProfessionalServiceEntity1790084384199';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."IDX_34a4319abc2199d0e68811d182"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE INDEX "IDX_34a4319abc2199d0e68811d182" ON "professional_services" USING btree ("professional_id")
        `);
  }
}
