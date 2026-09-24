import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { generateId } from '../../../shared/id/generate-id.js';
import { User } from '../../../users/domain/user.entity.js';

@Entity({ name: 'appointments' })
export class Appointment {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string = generateId();

  @Column({ name: 'client_id', type: 'char', length: 26 })
  clientId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'client_id' })
  client?: Relation<User>;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'reminder_sent_at', type: 'timestamptz', nullable: true })
  reminderSentAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
