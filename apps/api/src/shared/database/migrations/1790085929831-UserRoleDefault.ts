import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserRoleDefault1790085929831 implements MigrationInterface {
  name = 'UserRoleDefault1790085929831';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CLIENT'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
  }
}
