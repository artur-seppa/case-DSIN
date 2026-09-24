import { Injectable, NotFoundException } from '@nestjs/common';
import { Clock } from '../../../shared/time/clock.js';
import { AppointmentHistoryAction } from '../../domain/entities/appointment-history-action.js';
import { AppointmentRepository } from '../../domain/appointment.repository.js';
import { InvalidStatusTransitionException } from '../../domain/exceptions.js';
import { isValidItemTransition, ItemStatus } from '../../domain/rules/item-status.js';
import { assertItemTransitionTiming } from '../../domain/rules/item-transition-timing.js';
import { OutboxEventType } from '../../domain/entities/outbox-event-type.js';
import { finalizeOrThrow } from '../appointment-access.js';
import {
  AppointmentDetailAssembler,
  type AppointmentDetail,
} from '../appointment-detail.assembler.js';
import { SchedulingSettings } from '../ports/scheduling-settings.js';

export interface ChangeItemStatusInput {
  appointmentId: string;
  itemId: string;
  actorId: string;
  targetStatus: ItemStatus;
}

@Injectable()
export class ChangeItemStatusUseCase {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly clock: Clock,
    private readonly settings: SchedulingSettings,
    private readonly assembler: AppointmentDetailAssembler,
  ) {}

  async execute(input: ChangeItemStatusInput): Promise<AppointmentDetail> {
    const aggregate = await this.appointments.findById(input.appointmentId);
    if (!aggregate) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    const item = aggregate.items.find((candidate) => candidate.id === input.itemId);
    if (!item) {
      throw new NotFoundException('Item não encontrado');
    }

    if (!isValidItemTransition(item.status, input.targetStatus)) {
      throw new InvalidStatusTransitionException(
        `Não é possível mudar de ${item.status} para ${input.targetStatus}`,
      );
    }
    assertItemTransitionTiming(
      item.status,
      input.targetStatus,
      item,
      this.clock.now(),
      this.settings.utcOffsetMinutes,
    );

    const updated = await this.appointments.updateItems(
      input.appointmentId,
      [{ itemId: item.id, status: input.targetStatus }],
      [
        {
          itemId: item.id,
          actorId: input.actorId,
          action: AppointmentHistoryAction.ITEM_STATUS_CHANGED,
          changes: { from: item.status, to: input.targetStatus },
        },
      ],
      input.targetStatus === ItemStatus.CONFIRMED
        ? {
            outboxEvent: {
              eventType: OutboxEventType.ITEMS_CONFIRMED,
              payload: { appointmentId: input.appointmentId, itemIds: [item.id] },
            },
          }
        : undefined,
    );
    return finalizeOrThrow(updated, this.assembler);
  }
}
