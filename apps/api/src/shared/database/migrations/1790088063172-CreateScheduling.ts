import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScheduling1790088063172 implements MigrationInterface {
  name = 'CreateScheduling1790088063172';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "appointments" (
                "id" character(26) NOT NULL,
                "client_id" character(26) NOT NULL,
                "notes" text,
                "reminder_sent_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."item_status" AS ENUM(
                'PENDING',
                'CONFIRMED',
                'IN_PROGRESS',
                'COMPLETED',
                'CANCELLED',
                'NO_SHOW'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "appointment_items" (
                "id" character(26) NOT NULL,
                "appointment_id" character(26) NOT NULL,
                "service_id" character(26) NOT NULL,
                "professional_id" character(26) NOT NULL,
                "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "price_cents" integer NOT NULL,
                "status" "public"."item_status" NOT NULL DEFAULT 'PENDING',
                CONSTRAINT "ck_item_interval" CHECK ("ends_at" > "starts_at"),
                CONSTRAINT "ex_professional_no_overlap" EXCLUDE USING gist (
                    "professional_id" WITH =,
                    tstzrange("starts_at", "ends_at") WITH &&
                )
                WHERE ("status" <> 'CANCELLED'),
                    CONSTRAINT "PK_8356b5f1a1b0aa992c28b155d9e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_49e5e43f12dfe28e7308ae676b" ON "appointment_items" ("appointment_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_7b9ee36c8ce141545f14b5c3f2" ON "appointment_items" ("status")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_2aaa2e6ed7760d2ba0248c3895" ON "appointment_items" ("professional_id", "starts_at")
        `);
    await queryRunner.query(`
            ALTER TABLE "appointments"
            ADD CONSTRAINT "FK_ccc5bbce58ad6bc96faa428b1e4" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "appointment_items"
            ADD CONSTRAINT "FK_49e5e43f12dfe28e7308ae676ba" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "appointment_items"
            ADD CONSTRAINT "FK_c5fee4f34f7f89bc0b5ce4ba464" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "appointment_items"
            ADD CONSTRAINT "FK_985989e9218f9a71653436c1f42" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "appointment_items" DROP CONSTRAINT "FK_985989e9218f9a71653436c1f42"
        `);
    await queryRunner.query(`
            ALTER TABLE "appointment_items" DROP CONSTRAINT "FK_c5fee4f34f7f89bc0b5ce4ba464"
        `);
    await queryRunner.query(`
            ALTER TABLE "appointment_items" DROP CONSTRAINT "FK_49e5e43f12dfe28e7308ae676ba"
        `);
    await queryRunner.query(`
            ALTER TABLE "appointments" DROP CONSTRAINT "FK_ccc5bbce58ad6bc96faa428b1e4"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_2aaa2e6ed7760d2ba0248c3895"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_7b9ee36c8ce141545f14b5c3f2"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_49e5e43f12dfe28e7308ae676b"
        `);
    await queryRunner.query(`
            DROP TABLE "appointment_items"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."item_status"
        `);
    await queryRunner.query(`
            DROP TABLE "appointments"
        `);
  }
}
