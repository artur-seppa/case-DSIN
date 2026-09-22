import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceNameUnique1790081879581 implements MigrationInterface {
  name = 'ServiceNameUnique1790081879581';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "name" TYPE citext`,
    );
    await queryRunner.query(
      `ALTER TABLE "services" ADD CONSTRAINT "uq_services_name" UNIQUE ("name")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "services" DROP CONSTRAINT "uq_services_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "name" TYPE varchar(120)`,
    );
  }
}
