import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { generateId } from '../../../shared/id/generate-id.js';
import { User } from '../../../users/domain/user.entity.js';
import { AppointmentHistoryAction } from './appointment-history-action.js';
import { AppointmentItem } from './appointment-item.entity.js';

@Entity({ name: 'appointment_history' })
@Index(['itemId', 'occurredAt'])
export class AppointmentHistoryEntry {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string = generateId();

  @Column({ name: 'item_id', type: 'char', length: 26 })
  itemId: string;

  @ManyToOne(() => AppointmentItem, { nullable: false })
  @JoinColumn({ name: 'item_id' })
  item?: Relation<AppointmentItem>;

  @Column({ name: 'actor_id', type: 'char', length: 26 })
  actorId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'actor_id' })
  actor?: Relation<User>;

  @Column({
    type: 'enum',
    enum: AppointmentHistoryAction,
    enumName: 'appointment_history_action',
  })
  action: AppointmentHistoryAction;

  @Column({ type: 'jsonb' })
  changes: Record<string, unknown>;

  @CreateDateColumn({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;
}
