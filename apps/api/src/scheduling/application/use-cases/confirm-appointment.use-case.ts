import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentHistoryAction } from '../../domain/entities/appointment-history-action.js';
import { AppointmentRepository } from '../../domain/appointment.repository.js';
import { ItemStatus } from '../../domain/rules/item-status.js';
import { OutboxEventType } from '../../domain/entities/outbox-event-type.js';
import { finalizeOrThrow } from '../appointment-access.js';
import {
  AppointmentDetailAssembler,
  type AppointmentDetail,
} from '../appointment-detail.assembler.js';

@Injectable()
export class ConfirmAppointmentUseCase {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly assembler: AppointmentDetailAssembler,
  ) {}

  async execute(appointmentId: string, actorId: string): Promise<AppointmentDetail> {
    const aggregate = await this.appointments.findById(appointmentId);
    if (!aggregate) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    const pendingItems = aggregate.items.filter((item) => item.status === ItemStatus.PENDING);
    if (pendingItems.length === 0) {
      return this.assembler.assemble(aggregate);
    }

    const updated = await this.appointments.updateItems(
      appointmentId,
      pendingItems.map((item) => ({ itemId: item.id, status: ItemStatus.CONFIRMED })),
      pendingItems.map((item) => ({
        itemId: item.id,
        actorId,
        action: AppointmentHistoryAction.ITEM_STATUS_CHANGED,
        changes: { from: ItemStatus.PENDING, to: ItemStatus.CONFIRMED },
      })),
      {
        outboxEvent: {
          eventType: OutboxEventType.ITEMS_CONFIRMED,
          payload: { appointmentId, itemIds: pendingItems.map((item) => item.id) },
        },
      },
    );
    return finalizeOrThrow(updated, this.assembler);
  }
}
