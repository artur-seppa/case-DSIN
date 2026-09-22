import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateId } from '../../shared/id/generate-id.js';

@Entity({ name: 'services' })
@Check(
  'ck_services_duration',
  '"duration_minutes" > 0 AND "duration_minutes" % 15 = 0',
)
@Check('ck_services_price', '"price_cents" >= 0')
export class Service {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string = generateId();

  @Column({ type: 'citext', unique: true })
  name: string;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @Column({ name: 'price_cents', type: 'int' })
  priceCents: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
