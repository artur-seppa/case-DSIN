import { Injectable } from '@nestjs/common';
import { Clock } from '../../shared/time/clock.js';
import type { AppointmentStatus } from '../domain/appointment-status.js';
import type { AppointmentAggregate } from '../domain/appointment.repository.js';
import { canClientChange, changeDeadline } from '../domain/rules/change-window.policy.js';
import { ItemStatus } from '../domain/rules/item-status.js';
import { SchedulingSettings } from './ports/scheduling-settings.js';

export interface AppointmentItemDetail {
  id: string;
  service: { id: string; name: string };
  professional: { id: string; name: string };
  startsAt: Date;
  endsAt: Date;
  priceCents: number;
  status: ItemStatus;
}

export interface AppointmentDetail {
  id: string;
  client: { id: string; name: string; phone: string | null };
  status: AppointmentStatus;
  notes: string | null;
  createdAt: Date;
  startsAt: Date;
  endsAt: Date;
  totalCents: number;
  changeDeadline: Date | null;
  canClientChange: boolean;
  items: AppointmentItemDetail[];
}

@Injectable()
export class AppointmentDetailAssembler {
  constructor(
    private readonly settings: SchedulingSettings,
    private readonly clock: Clock,
  ) {}

  assemble(aggregate: AppointmentAggregate): AppointmentDetail {
    return this.assembleMany([aggregate])[0]!;
  }

  assembleMany(aggregates: AppointmentAggregate[]): AppointmentDetail[] {
    const now = this.clock.now();

    return aggregates.map(({ appointment, items, status, totalCents, startsAt, endsAt, activeStartsAt }) => {
      if (!appointment.client) {
        throw new Error(`Cliente não carregado para a ordem ${appointment.id}`);
      }

      return {
        id: appointment.id,
        client: {
          id: appointment.client.id,
          name: appointment.client.name,
          phone: appointment.client.phone,
        },
        status,
        notes: appointment.notes,
        createdAt: appointment.createdAt,
        startsAt,
        endsAt,
        totalCents,
        changeDeadline: activeStartsAt
          ? changeDeadline(activeStartsAt, this.settings.changeWindowHours)
          : null,
        canClientChange: activeStartsAt
          ? canClientChange(now, activeStartsAt, this.settings.changeWindowHours)
          : false,
        items: items.map((item) => {
          if (!item.service || !item.professional) {
            throw new Error(`Serviço ou profissional não carregado para o item ${item.id}`);
          }
          return {
            id: item.id,
            service: { id: item.service.id, name: item.service.name },
            professional: { id: item.professional.id, name: item.professional.name },
            startsAt: item.startsAt,
            endsAt: item.endsAt,
            priceCents: item.priceCents,
            status: item.status,
          };
        }),
      };
    });
  }
}
