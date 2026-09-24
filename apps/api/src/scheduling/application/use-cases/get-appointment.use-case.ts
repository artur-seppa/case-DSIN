import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { AppointmentRepository } from '../../domain/appointment.repository.js';
import { loadOwnedAppointment } from '../appointment-access.js';
import {
  AppointmentDetailAssembler,
  type AppointmentDetail,
} from '../appointment-detail.assembler.js';

@Injectable()
export class GetAppointmentUseCase {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly assembler: AppointmentDetailAssembler,
  ) {}

  async execute(appointmentId: string, actor: AuthenticatedUser): Promise<AppointmentDetail> {
    const aggregate = await loadOwnedAppointment(this.appointments, appointmentId, actor);
    return this.assembler.assemble(aggregate);
  }
}
