import {
  Check,
  Column,
  Entity,
  Exclusion,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { generateId } from '../../../shared/id/generate-id.js';
import { Professional } from '../../../professionals/domain/professional.entity.js';
import { Service } from '../../../services/domain/service.entity.js';
import { Appointment } from './appointment.entity.js';
import { ItemStatus } from '../rules/item-status.js';

@Entity({ name: 'appointment_items' })
@Check('ck_item_interval', '"ends_at" > "starts_at"')
@Exclusion(
  'ex_professional_no_overlap',
  `USING gist ("professional_id" WITH =, tstzrange("starts_at", "ends_at") WITH &&) WHERE ("status" <> 'CANCELLED')`,
)
@Index(['professionalId', 'startsAt'])
@Index(['status'])
export class AppointmentItem {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string = generateId();

  @Index()
  @Column({ name: 'appointment_id', type: 'char', length: 26 })
  appointmentId: string;

  @ManyToOne(() => Appointment, { nullable: false })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: Relation<Appointment>;

  @Column({ name: 'service_id', type: 'char', length: 26 })
  serviceId: string;

  @ManyToOne(() => Service, { nullable: false })
  @JoinColumn({ name: 'service_id' })
  service?: Relation<Service>;

  @Column({ name: 'professional_id', type: 'char', length: 26 })
  professionalId: string;

  @ManyToOne(() => Professional, { nullable: false })
  @JoinColumn({ name: 'professional_id' })
  professional?: Relation<Professional>;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @Column({ name: 'price_cents', type: 'int' })
  priceCents: number;

  @Column({
    type: 'enum',
    enum: ItemStatus,
    enumName: 'item_status',
    default: ItemStatus.PENDING,
  })
  status: ItemStatus;
}
