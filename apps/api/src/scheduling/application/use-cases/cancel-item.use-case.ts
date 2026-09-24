import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { Clock } from '../../../shared/time/clock.js';
import { AppointmentHistoryAction } from '../../domain/entities/appointment-history-action.js';
import { AppointmentRepository } from '../../domain/appointment.repository.js';
import { assertClientCanChange } from '../../domain/rules/change-window.policy.js';
import { InvalidStatusTransitionException } from '../../domain/exceptions.js';
import { isValidItemTransition, ItemStatus } from '../../domain/rules/item-status.js';
import { OutboxEventType } from '../../domain/entities/outbox-event-type.js';
import { finalizeOrThrow, loadOwnedAppointment } from '../appointment-access.js';
import {
  AppointmentDetailAssembler,
  type AppointmentDetail,
} from '../appointment-detail.assembler.js';
import { SchedulingSettings } from '../ports/scheduling-settings.js';

export interface CancelItemInput {
  appointmentId: string;
  itemId: string;
  actor: AuthenticatedUser;
  reason?: string | null;
}

@Injectable()
export class CancelItemUseCase {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly clock: Clock,
    private readonly settings: SchedulingSettings,
    private readonly assembler: AppointmentDetailAssembler,
  ) {}

  async execute(input: CancelItemInput): Promise<AppointmentDetail> {
    const aggregate = await loadOwnedAppointment(this.appointments, input.appointmentId, input.actor);

    const item = aggregate.items.find((candidate) => candidate.id === input.itemId);
    if (!item) {
      throw new NotFoundException('Item não encontrado');
    }
    if (!isValidItemTransition(item.status, ItemStatus.CANCELLED)) {
      throw new InvalidStatusTransitionException('Este item não pode mais ser cancelado');
    }

    assertClientCanChange(
      input.actor.role,
      aggregate.items,
      this.clock.now(),
      this.settings.changeWindowHours,
    );

    const updated = await this.appointments.updateItems(
      input.appointmentId,
      [{ itemId: item.id, status: ItemStatus.CANCELLED }],
      [
        {
          itemId: item.id,
          actorId: input.actor.id,
          action: AppointmentHistoryAction.ITEM_STATUS_CHANGED,
          changes: { from: item.status, to: ItemStatus.CANCELLED, reason: input.reason ?? null },
        },
      ],
      {
        outboxEvent: {
          eventType: OutboxEventType.ITEMS_CANCELLED,
          payload: { appointmentId: input.appointmentId, itemIds: [item.id], reason: input.reason ?? null },
        },
      },
    );
    return finalizeOrThrow(updated, this.assembler);
  }
}
