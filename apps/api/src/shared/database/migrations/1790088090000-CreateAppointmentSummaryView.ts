import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppointmentSummaryView1790088090000 implements MigrationInterface {
  name = 'CreateAppointmentSummaryView1790088090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE VIEW "appointment_summaries" AS
            SELECT
                "appointment_id",
                CASE
                    WHEN COUNT(*) FILTER (WHERE status <> 'CANCELLED') = 0 THEN 'CANCELLED'
                    WHEN COUNT(*) FILTER (WHERE status = 'PENDING') > 0 THEN 'PENDING'
                    WHEN COUNT(*) FILTER (WHERE status NOT IN ('CANCELLED', 'COMPLETED', 'NO_SHOW')) = 0 THEN 'FINISHED'
                    WHEN COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') > 0
                      OR (COUNT(*) FILTER (WHERE status IN ('COMPLETED', 'NO_SHOW')) > 0
                          AND COUNT(*) FILTER (WHERE status = 'CONFIRMED') > 0) THEN 'IN_PROGRESS'
                    ELSE 'CONFIRMED'
                END AS "status",
                COALESCE(SUM("price_cents") FILTER (WHERE status <> 'CANCELLED'), 0)::int AS "total_cents",
                COALESCE(MIN("starts_at") FILTER (WHERE status <> 'CANCELLED'), MIN("starts_at")) AS "starts_at",
                COALESCE(MAX("ends_at") FILTER (WHERE status <> 'CANCELLED'), MAX("ends_at")) AS "ends_at",
                MIN("starts_at") FILTER (WHERE status <> 'CANCELLED') AS "active_starts_at"
            FROM "appointment_items"
            GROUP BY "appointment_id"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP VIEW "appointment_summaries"
        `);
  }
}
