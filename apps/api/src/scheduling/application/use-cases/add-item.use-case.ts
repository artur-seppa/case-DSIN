import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { Clock } from '../../../shared/time/clock.js';
import { AppointmentItem } from '../../domain/entities/appointment-item.entity.js';
import { AppointmentHistoryAction } from '../../domain/entities/appointment-history-action.js';
import { AppointmentRepository } from '../../domain/appointment.repository.js';
import { assertClientCanChange } from '../../domain/rules/change-window.policy.js';
import { itemsOverlapException } from '../../domain/exceptions.js';
import { ItemStatus } from '../../domain/rules/item-status.js';
import { overlapsAnyActiveItem } from '../../domain/rules/item-collision.js';
import { OutboxEventType } from '../../domain/entities/outbox-event-type.js';
import { finalizeOrThrow, loadOwnedAppointment } from '../appointment-access.js';
import {
  AppointmentDetailAssembler,
  type AppointmentDetail,
} from '../appointment-detail.assembler.js';
import { ItemPlacementResolver } from '../item-placement-resolver.js';
import { SchedulingSettings } from '../ports/scheduling-settings.js';
import { ResolveAppointmentItemsUseCase } from './resolve-appointment-items.use-case.js';

export interface AddItemInput {
  appointmentId: string;
  actor: AuthenticatedUser;
  serviceId: string;
  professionalId: string;
  startsAt: Date;
}

@Injectable()
export class AddItemUseCase {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly resolveItems: ResolveAppointmentItemsUseCase,
    private readonly placement: ItemPlacementResolver,
    private readonly assembler: AppointmentDetailAssembler,
    private readonly clock: Clock,
    private readonly settings: SchedulingSettings,
  ) {}

  async execute(input: AddItemInput): Promise<AppointmentDetail> {
    const aggregate = await loadOwnedAppointment(this.appointments, input.appointmentId, input.actor);

    assertClientCanChange(
      input.actor.role,
      aggregate.items,
      this.clock.now(),
      this.settings.changeWindowHours,
    );

    const [resolvedItem] = await this.resolveItems.execute([
      { serviceId: input.serviceId, professionalId: input.professionalId },
    ]);

    const activeSiblingIds = aggregate.items
      .filter((item) => item.status !== ItemStatus.CANCELLED)
      .map((item) => item.id);

    const chosenPlacement = await this.placement.resolve({
      professionalId: resolvedItem!.professionalId,
      durationMinutes: resolvedItem!.durationMinutes,
      startsAt: input.startsAt,
      excludeItemIds: activeSiblingIds,
    });

    if (overlapsAnyActiveItem(chosenPlacement, aggregate.items)) {
      throw itemsOverlapException();
    }

    const item = Object.assign(new AppointmentItem(), {
      appointmentId: input.appointmentId,
      serviceId: resolvedItem!.serviceId,
      professionalId: resolvedItem!.professionalId,
      startsAt: chosenPlacement.startsAt,
      endsAt: chosenPlacement.endsAt,
      priceCents: resolvedItem!.priceCents,
      status: ItemStatus.PENDING,
    });

    const updated = await this.appointments.addItem(
      input.appointmentId,
      item,
      {
        itemId: item.id,
        actorId: input.actor.id,
        action: AppointmentHistoryAction.ITEM_ADDED,
        changes: {
          serviceId: item.serviceId,
          professionalId: item.professionalId,
          startsAt: item.startsAt.toISOString(),
        },
      },
      {
        eventType: OutboxEventType.ITEM_ADDED,
        payload: { appointmentId: input.appointmentId, itemId: item.id },
      },
    );
    return finalizeOrThrow(updated, this.assembler);
  }
}
