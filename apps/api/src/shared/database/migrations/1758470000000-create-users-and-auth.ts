import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndAuth1758470000000 implements MigrationInterface {
  name = 'CreateUsersAndAuth1758470000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS citext`);
    await queryRunner.query(
      `CREATE TYPE "user_role" AS ENUM ('CLIENT', 'ADMIN')`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            char(26)     NOT NULL,
        "name"          varchar(120) NOT NULL,
        "email"         citext       NOT NULL,
        "phone"         varchar(30),
        "password_hash" text         NOT NULL,
        "role"          "user_role"  NOT NULL DEFAULT 'CLIENT',
        "created_at"    timestamptz  NOT NULL,
        "updated_at"    timestamptz  NOT NULL,
        CONSTRAINT "pk_users" PRIMARY KEY ("id"),
        CONSTRAINT "uq_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id"         char(26)    NOT NULL,
        "user_id"    char(26)    NOT NULL,
        "family_id"  char(26)    NOT NULL,
        "token_hash" char(64)    NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL,
        CONSTRAINT "pk_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "uq_refresh_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "fk_refresh_tokens_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_refresh_tokens_family_id" ON "refresh_tokens" ("family_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "user_role"`);
  }
}
