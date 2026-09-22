import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCatalog1790017623673 implements MigrationInterface {
  name = 'CreateCatalog1790017623673';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "services" (
                "id" character(26) NOT NULL,
                "name" character varying(120) NOT NULL,
                "duration_minutes" integer NOT NULL,
                "price_cents" integer NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "ck_services_price" CHECK ("price_cents" >= 0),
                CONSTRAINT "ck_services_duration" CHECK (
                    "duration_minutes" > 0
                    AND "duration_minutes" % 15 = 0
                ),
                CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "professional_working_hours" (
                "id" character(26) NOT NULL,
                "professional_id" character(26) NOT NULL,
                "weekday" smallint NOT NULL,
                "start_time" TIME NOT NULL,
                "end_time" TIME NOT NULL,
                CONSTRAINT "ck_working_hours_interval" CHECK ("end_time" > "start_time"),
                CONSTRAINT "ck_working_hours_weekday" CHECK (
                    "weekday" BETWEEN 1 AND 7
                ),
                CONSTRAINT "PK_04e72f27c472b9160d7a8c584b6" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_706b88a4dc4cee1e9cb7908df2" ON "professional_working_hours" ("professional_id", "weekday")
        `);
    await queryRunner.query(`
            CREATE TABLE "professionals" (
                "id" character(26) NOT NULL,
                "name" character varying(120) NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_d7dc8473b49fcd938def2799387" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "professional_services" (
                "professional_id" character(26) NOT NULL,
                "service_id" character(26) NOT NULL,
                CONSTRAINT "PK_b3073a22d2e21fadf41fa8e2553" PRIMARY KEY ("professional_id", "service_id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_34a4319abc2199d0e68811d182" ON "professional_services" ("professional_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_2fad8b472d2afd9af6c048b715" ON "professional_services" ("service_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "professional_working_hours"
            ADD CONSTRAINT "FK_47bb1ca2414f966638c6bd4a556" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "professional_services"
            ADD CONSTRAINT "FK_34a4319abc2199d0e68811d1824" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "professional_services"
            ADD CONSTRAINT "FK_2fad8b472d2afd9af6c048b715c" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "professional_services" DROP CONSTRAINT "FK_2fad8b472d2afd9af6c048b715c"
        `);
    await queryRunner.query(`
            ALTER TABLE "professional_services" DROP CONSTRAINT "FK_34a4319abc2199d0e68811d1824"
        `);
    await queryRunner.query(`
            ALTER TABLE "professional_working_hours" DROP CONSTRAINT "FK_47bb1ca2414f966638c6bd4a556"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_2fad8b472d2afd9af6c048b715"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_34a4319abc2199d0e68811d182"
        `);
    await queryRunner.query(`
            DROP TABLE "professional_services"
        `);
    await queryRunner.query(`
            DROP TABLE "professionals"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_706b88a4dc4cee1e9cb7908df2"
        `);
    await queryRunner.query(`
            DROP TABLE "professional_working_hours"
        `);
    await queryRunner.query(`
            DROP TABLE "services"
        `);
  }
}
