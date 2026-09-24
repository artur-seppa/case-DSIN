import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { Role } from '../../../shared/auth/role.js';
import { Clock } from '../../../shared/time/clock.js';
import { AppointmentHistoryAction } from '../../domain/entities/appointment-history-action.js';
import { AppointmentRepository } from '../../domain/appointment.repository.js';
import { assertClientCanChange } from '../../domain/rules/change-window.policy.js';
import {
  InvalidStatusTransitionException,
  itemsOverlapException,
  professionalDoesNotOfferServiceException,
} from '../../domain/exceptions.js';
import { overlapsAnyActiveItem } from '../../domain/rules/item-collision.js';
import { ItemStatus } from '../../domain/rules/item-status.js';
import { OutboxEventType } from '../../domain/entities/outbox-event-type.js';
import { finalizeOrThrow, loadOwnedAppointment } from '../appointment-access.js';
import {
  AppointmentDetailAssembler,
  type AppointmentDetail,
} from '../appointment-detail.assembler.js';
import { ItemPlacementResolver } from '../item-placement-resolver.js';
import { ProfessionalReader } from '../ports/professional-reader.js';
import { SchedulingSettings } from '../ports/scheduling-settings.js';

export interface RepositionItemInput {
  appointmentId: string;
  itemId: string;
  actor: AuthenticatedUser;
  startsAt: Date;
  professionalId?: string;
}

@Injectable()
export class RepositionItemUseCase {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly placement: ItemPlacementResolver,
    private readonly professionals: ProfessionalReader,
    private readonly assembler: AppointmentDetailAssembler,
    private readonly clock: Clock,
    private readonly settings: SchedulingSettings,
  ) {}

  async execute(input: RepositionItemInput): Promise<AppointmentDetail> {
    const aggregate = await loadOwnedAppointment(this.appointments, input.appointmentId, input.actor);

    const item = aggregate.items.find((candidate) => candidate.id === input.itemId);
    if (!item) {
      throw new NotFoundException('Item não encontrado');
    }
    if (item.status !== ItemStatus.PENDING && item.status !== ItemStatus.CONFIRMED) {
      throw new InvalidStatusTransitionException(
        'Só é possível reposicionar um item aguardando confirmação ou confirmado',
      );
    }

    assertClientCanChange(
      input.actor.role,
      aggregate.items,
      this.clock.now(),
      this.settings.changeWindowHours,
    );

    const professionalId = input.professionalId ?? item.professionalId;
    if (professionalId !== item.professionalId) {
      const offersService = await this.professionals.offersService(professionalId, item.serviceId);
      if (!offersService) {
        throw professionalDoesNotOfferServiceException();
      }
    }
    const durationMinutes = (item.endsAt.getTime() - item.startsAt.getTime()) / 60_000;

    const chosenPlacement = await this.placement.resolve({
      professionalId,
      durationMinutes,
      startsAt: input.startsAt,
      excludeItemIds: [item.id],
    });

    const siblings = aggregate.items.filter((candidate) => candidate.id !== item.id);
    if (overlapsAnyActiveItem(chosenPlacement, siblings)) {
      throw itemsOverlapException();
    }

    const revertsToPending = input.actor.role === Role.CLIENT && item.status === ItemStatus.CONFIRMED;

    const updated = await this.appointments.updateItems(
      input.appointmentId,
      [
        {
          itemId: item.id,
          professionalId,
          startsAt: chosenPlacement.startsAt,
          endsAt: chosenPlacement.endsAt,
          ...(revertsToPending ? { status: ItemStatus.PENDING } : {}),
        },
      ],
      [
        {
          itemId: item.id,
          actorId: input.actor.id,
          action: AppointmentHistoryAction.ITEM_REPOSITIONED,
          changes: {
            professionalId,
            startsAt: chosenPlacement.startsAt.toISOString(),
            revertedToPending: revertsToPending,
          },
        },
      ],
      {
        resetReminder: true,
        outboxEvent: {
          eventType: OutboxEventType.ITEM_REPOSITIONED,
          payload: { appointmentId: input.appointmentId, itemId: item.id },
        },
      },
    );
    return finalizeOrThrow(updated, this.assembler);
  }
}
