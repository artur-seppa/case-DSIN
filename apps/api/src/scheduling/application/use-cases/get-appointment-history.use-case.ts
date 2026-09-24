import { Injectable, NotFoundException } from '@nestjs/common';
import type { AppointmentHistoryAction } from '../../domain/entities/appointment-history-action.js';
import { AppointmentRepository } from '../../domain/appointment.repository.js';
import { UserReader, type ClientSnapshot } from '../ports/user-reader.js';

export interface AppointmentHistoryEntryDetail {
  id: string;
  itemId: string;
  actor: { id: string; name: string };
  action: AppointmentHistoryAction;
  changes: Record<string, unknown>;
  occurredAt: Date;
}

@Injectable()
export class GetAppointmentHistoryUseCase {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly users: UserReader,
  ) {}

  async execute(appointmentId: string): Promise<AppointmentHistoryEntryDetail[]> {
    const aggregate = await this.appointments.findById(appointmentId);
    if (!aggregate) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    const entries = await this.appointments.findHistory(appointmentId);
    const actorIds = [...new Set(entries.map((entry) => entry.actorId))];
    const actors = await Promise.all(actorIds.map((id) => this.users.findClient(id)));
    const actorById = new Map<string, ClientSnapshot>(
      actors.filter((actor): actor is ClientSnapshot => actor !== null).map((actor) => [actor.id, actor]),
    );

    return entries.map((entry) => {
      const actor = actorById.get(entry.actorId);
      return {
        id: entry.id,
        itemId: entry.itemId,
        actor: actor ? { id: actor.id, name: actor.name } : { id: entry.actorId, name: 'Desconhecido' },
        action: entry.action,
        changes: entry.changes,
        occurredAt: entry.occurredAt,
      };
    });
  }
}
