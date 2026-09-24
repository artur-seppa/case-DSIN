import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { generateId } from '../../../shared/id/generate-id.js';
import { OutboxEventType } from './outbox-event-type.js';

@Entity({ name: 'outbox_events' })
@Index(['occurredAt'], { where: '"published_at" IS NULL' })
export class OutboxEvent {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string = generateId();

  @Column({ name: 'aggregate_type', type: 'varchar', length: 40 })
  aggregateType: string;

  @Column({ name: 'aggregate_id', type: 'char', length: 26 })
  aggregateId: string;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: OutboxEventType,
    enumName: 'outbox_event_type',
  })
  eventType: OutboxEventType;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @CreateDateColumn({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;
}
