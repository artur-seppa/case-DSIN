import type { PageRequest } from '../../shared/pagination/page.js';
import type { AppointmentHistoryAction } from './entities/appointment-history-action.js';
import type { AppointmentHistoryEntry } from './entities/appointment-history.entity.js';
import type { AppointmentItem } from './entities/appointment-item.entity.js';
import type { Appointment } from './entities/appointment.entity.js';
import type { OutboxEventType } from './entities/outbox-event-type.js';
import type { AppointmentStatus } from './appointment-status.js';
import type { ItemStatus } from './rules/item-status.js';

export interface AppointmentAggregate {
  appointment: Appointment;
  items: AppointmentItem[];
  status: AppointmentStatus;
  totalCents: number;
}

export interface ItemUpdate {
  itemId: string;
  status?: ItemStatus;
  professionalId?: string;
  startsAt?: Date;
  endsAt?: Date;
}

export interface HistoryEntryInput {
  itemId: string;
  actorId: string;
  action: AppointmentHistoryAction;
  changes: Record<string, unknown>;
}

export interface OutboxEventInput {
  eventType: OutboxEventType;
  payload: Record<string, unknown>;
}

export interface AppointmentFilter {
  clientId?: string;
  clientIds?: string[];
  from?: Date;
  to?: Date;
  itemStatuses?: ItemStatus[];
  professionalId?: string;
  serviceId?: string;
  sort?: 'startsAt' | 'createdAt';
  order?: 'asc' | 'desc';
}

export abstract class AppointmentRepository {
  abstract create(
    appointment: Appointment,
    items: AppointmentItem[],
    outboxEvent: OutboxEventInput,
  ): Promise<AppointmentAggregate>;

  abstract findById(id: string): Promise<AppointmentAggregate | null>;

  abstract list(
    filter: AppointmentFilter,
    page: PageRequest,
  ): Promise<{ items: AppointmentAggregate[]; total: number }>;

  abstract findHistory(appointmentId: string): Promise<AppointmentHistoryEntry[]>;

  abstract addItem(
    appointmentId: string,
    item: AppointmentItem,
    historyEntry: HistoryEntryInput,
    outboxEvent?: OutboxEventInput,
  ): Promise<AppointmentAggregate | null>;

  abstract updateItems(
    appointmentId: string,
    updates: ItemUpdate[],
    historyEntries: HistoryEntryInput[],
    options?: { outboxEvent?: OutboxEventInput; resetReminder?: boolean },
  ): Promise<AppointmentAggregate | null>;

  abstract findBusyIntervals(
    professionalIds: string[],
    windowStart: Date,
    windowEnd: Date,
  ): Promise<
    { itemId: string; appointmentId: string; professionalId: string; startsAt: Date; endsAt: Date }[]
  >;

  abstract findClientAppointmentDates(
    clientId: string,
    now: Date,
  ): Promise<{ appointmentId: string; startsAt: Date }[]>;
}
