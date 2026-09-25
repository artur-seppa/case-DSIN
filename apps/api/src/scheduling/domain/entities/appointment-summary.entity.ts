import { ViewColumn, ViewEntity } from 'typeorm';
import { AppointmentStatus } from '../appointment-status.js';

@ViewEntity({ name: 'appointment_summaries', synchronize: false })
export class AppointmentSummaryView {
  @ViewColumn({ name: 'appointment_id' })
  appointmentId: string;

  @ViewColumn()
  status: AppointmentStatus;

  @ViewColumn({ name: 'total_cents' })
  totalCents: number;

  @ViewColumn({ name: 'starts_at' })
  startsAt: Date;

  @ViewColumn({ name: 'ends_at' })
  endsAt: Date;

  @ViewColumn({ name: 'active_starts_at' })
  activeStartsAt: Date | null;
}
