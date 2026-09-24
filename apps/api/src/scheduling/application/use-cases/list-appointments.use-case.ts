import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { Role } from '../../../shared/auth/role.js';
import type { Page, PageRequest } from '../../../shared/pagination/page.js';
import { toPage } from '../../../shared/pagination/page.js';
import { localDate, localDayBounds } from '../../../shared/time/utc-offset.js';
import type { AppointmentFilter } from '../../domain/appointment.repository.js';
import { AppointmentRepository } from '../../domain/appointment.repository.js';
import type { ItemStatus } from '../../domain/rules/item-status.js';
import {
  AppointmentDetailAssembler,
  type AppointmentDetail,
} from '../appointment-detail.assembler.js';
import { UserReader } from '../ports/user-reader.js';
import { SchedulingSettings } from '../ports/scheduling-settings.js';

export interface ListAppointmentsFilter {
  from?: string;
  to?: string;
  itemStatuses?: ItemStatus[];
  professionalId?: string;
  serviceId?: string;
  clientId?: string;
  q?: string;
  sort?: 'startsAt' | 'createdAt';
  order?: 'asc' | 'desc';
}

@Injectable()
export class ListAppointmentsUseCase {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly users: UserReader,
    private readonly assembler: AppointmentDetailAssembler,
    private readonly settings: SchedulingSettings,
  ) {}

  async execute(
    filter: ListAppointmentsFilter,
    page: PageRequest,
    actor: AuthenticatedUser,
  ): Promise<Page<AppointmentDetail>> {
    const repoFilter: AppointmentFilter = {
      // from/to are salon-local calendar dates (inclusive range), converted to
      // UTC instants here so the repository stays timezone-agnostic.
      from: filter.from
        ? localDayBounds(localDate(filter.from), this.settings.utcOffsetMinutes).start
        : undefined,
      to: filter.to
        ? localDayBounds(localDate(filter.to), this.settings.utcOffsetMinutes).end
        : undefined,
      itemStatuses: filter.itemStatuses,
      professionalId: filter.professionalId,
      serviceId: filter.serviceId,
      sort: filter.sort,
      order: filter.order,
    };

    if (actor.role === Role.CLIENT) {
      repoFilter.clientId = actor.id;
    } else if (filter.clientId) {
      repoFilter.clientId = filter.clientId;
    } else if (filter.q) {
      const clientIds = await this.users.searchClientIds(filter.q);
      if (clientIds.length === 0) {
        return toPage([], 0, page);
      }
      repoFilter.clientIds = clientIds;
    }

    const { items, total } = await this.appointments.list(repoFilter, page);
    const details = this.assembler.assembleMany(items);
    return toPage(details, total, page);
  }
}
