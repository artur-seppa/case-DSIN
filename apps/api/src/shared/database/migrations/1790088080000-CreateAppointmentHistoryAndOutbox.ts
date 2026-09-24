import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppointmentHistoryAndOutbox1790088080000
  implements MigrationInterface
{
  name = 'CreateAppointmentHistoryAndOutbox1790088080000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."appointment_history_action" AS ENUM(
                'ITEM_ADDED',
                'ITEM_REPOSITIONED',
                'ITEM_STATUS_CHANGED'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "appointment_history" (
                "id" character(26) NOT NULL,
                "item_id" character(26) NOT NULL,
                "actor_id" character(26) NOT NULL,
                "action" "public"."appointment_history_action" NOT NULL,
                "changes" jsonb NOT NULL,
                "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_appointment_history_id" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_appointment_history_item_id_occurred_at" ON "appointment_history" ("item_id", "occurred_at")
        `);
    await queryRunner.query(`
            ALTER TABLE "appointment_history"
            ADD CONSTRAINT "FK_appointment_history_item_id" FOREIGN KEY ("item_id") REFERENCES "appointment_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "appointment_history"
            ADD CONSTRAINT "FK_appointment_history_actor_id" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            CREATE TYPE "public"."outbox_event_type" AS ENUM(
                'APPOINTMENT_CREATED',
                'ITEMS_CONFIRMED',
                'ITEM_ADDED',
                'ITEM_REPOSITIONED',
                'ITEMS_CANCELLED',
                'REMINDER_DUE'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "outbox_events" (
                "id" character(26) NOT NULL,
                "aggregate_type" character varying(40) NOT NULL,
                "aggregate_id" character(26) NOT NULL,
                "event_type" "public"."outbox_event_type" NOT NULL,
                "payload" jsonb NOT NULL,
                "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "published_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_outbox_events_id" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_outbox_events_occurred_at_unpublished" ON "outbox_events" ("occurred_at")
            WHERE ("published_at" IS NULL)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."IDX_outbox_events_occurred_at_unpublished"
        `);
    await queryRunner.query(`
            DROP TABLE "outbox_events"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."outbox_event_type"
        `);
    await queryRunner.query(`
            ALTER TABLE "appointment_history" DROP CONSTRAINT "FK_appointment_history_actor_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "appointment_history" DROP CONSTRAINT "FK_appointment_history_item_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_appointment_history_item_id_occurred_at"
        `);
    await queryRunner.query(`
            DROP TABLE "appointment_history"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."appointment_history_action"
        `);
  }
}
