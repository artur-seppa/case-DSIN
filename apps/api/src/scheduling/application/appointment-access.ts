import { NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../shared/auth/authenticated-user.js';
import { AppointmentRepository, type AppointmentAggregate } from '../domain/appointment.repository.js';
import { forbidsAccess } from '../domain/ownership.js';
import { AppointmentDetailAssembler, type AppointmentDetail } from './appointment-detail.assembler.js';

export async function loadOwnedAppointment(
  appointments: AppointmentRepository,
  appointmentId: string,
  actor: AuthenticatedUser,
): Promise<AppointmentAggregate> {
  const aggregate = await appointments.findById(appointmentId);
  if (!aggregate || forbidsAccess(actor, aggregate.appointment.clientId)) {
    throw new NotFoundException('Agendamento não encontrado');
  }
  return aggregate;
}

export function finalizeOrThrow(
  updated: AppointmentAggregate | null,
  assembler: AppointmentDetailAssembler,
): AppointmentDetail {
  if (!updated) {
    throw new NotFoundException('Agendamento não encontrado');
  }
  return assembler.assemble(updated);
}
