import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { generateId } from '../../shared/id/generate-id.js';
import { Professional } from './professional.entity.js';

@Entity({ name: 'professional_working_hours' })
@Index(['professionalId', 'weekday'])
@Check('ck_working_hours_weekday', '"weekday" BETWEEN 1 AND 7')
@Check('ck_working_hours_interval', '"end_time" > "start_time"')
export class WorkingHours {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string = generateId();

  @Column({ name: 'professional_id', type: 'char', length: 26 })
  professionalId: string;

  @ManyToOne(() => Professional, (professional) => professional.workingHours, {
    nullable: false,
  })
  @JoinColumn({ name: 'professional_id' })
  professional?: Relation<Professional>;

  @Column({ type: 'smallint' })
  weekday: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;
}
