import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { isExclusionViolation } from '../../../shared/database/exclusion-violation.js';
import { offsetOf, type PageRequest } from '../../../shared/pagination/page.js';
import {
  AppointmentRepository,
  type AppointmentAggregate,
  type AppointmentFilter,
  type HistoryEntryInput,
  type ItemUpdate,
  type OutboxEventInput,
} from '../../domain/appointment.repository.js';
import { AppointmentHistoryEntry } from '../../domain/entities/appointment-history.entity.js';
import { AppointmentItem } from '../../domain/entities/appointment-item.entity.js';
import { Appointment } from '../../domain/entities/appointment.entity.js';
import { SlotTakenException } from '../../domain/exceptions.js';
import { OutboxEvent } from '../../domain/entities/outbox-event.entity.js';
import { AppointmentStatus } from '../../domain/appointment-status.js';

const STATUS_CASE_SQL = `CASE
    WHEN COUNT(*) FILTER (WHERE status <> 'CANCELLED') = 0 THEN 'CANCELLED'
    WHEN COUNT(*) FILTER (WHERE status = 'PENDING') > 0 THEN 'PENDING'
    WHEN COUNT(*) FILTER (WHERE status NOT IN ('CANCELLED', 'COMPLETED', 'NO_SHOW')) = 0 THEN 'FINISHED'
    WHEN COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') > 0
      OR (COUNT(*) FILTER (WHERE status IN ('COMPLETED', 'NO_SHOW')) > 0
          AND COUNT(*) FILTER (WHERE status = 'CONFIRMED') > 0) THEN 'IN_PROGRESS'
    ELSE 'CONFIRMED'
  END`;
const TOTAL_CENTS_SQL = `COALESCE(SUM(price_cents) FILTER (WHERE status <> 'CANCELLED'), 0)::int`;

interface AppointmentSummary {
  status: AppointmentStatus;
  totalCents: number;
}

@Injectable()
export class TypeOrmAppointmentRepository extends AppointmentRepository {
  constructor(
    @InjectRepository(Appointment)
    private readonly repository: Repository<Appointment>,
  ) {
    super();
  }

  async create(
    appointment: Appointment,
    items: AppointmentItem[],
    outboxEvent: OutboxEventInput,
  ): Promise<AppointmentAggregate> {
    try {
      await this.repository.manager.transaction(async (manager) => {
        await manager.insert(Appointment, appointment);
        await manager.insert(AppointmentItem, items);
        await manager.insert(
          OutboxEvent,
          buildOutboxEvent(appointment.id, outboxEvent) as never,
        );
      });
    } catch (error) {
      if (isExclusionViolation(error)) {
        throw new SlotTakenException();
      }
      throw error;
    }
    return (await this.findById(appointment.id))!;
  }

  async findById(id: string): Promise<AppointmentAggregate | null> {
    const appointment = await this.repository.findOne({
      where: { id },
      relations: { client: true },
    });
    if (!appointment) {
      return null;
    }
    return this.loadAggregate(this.repository.manager, appointment);
  }

  async list(
    filter: AppointmentFilter,
    page: PageRequest,
  ): Promise<{ items: AppointmentAggregate[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.client', 'client')
      .orderBy(`appointment.${filter.sort ?? 'createdAt'}`, filter.order === 'asc' ? 'ASC' : 'DESC')
      .addOrderBy('appointment.id', 'ASC')
      .skip(offsetOf(page))
      .take(page.limit);

    if (filter.clientId) {
      qb.andWhere('appointment.clientId = :clientId', { clientId: filter.clientId });
    }
    if (filter.clientIds) {
      qb.andWhere('appointment.clientId IN (:...clientIds)', { clientIds: filter.clientIds });
    }

    const itemConditions: string[] = [];
    const itemParams: Record<string, unknown> = {};
    if (filter.professionalId) {
      itemConditions.push('item.professional_id = :professionalId');
      itemParams.professionalId = filter.professionalId;
    }
    if (filter.serviceId) {
      itemConditions.push('item.service_id = :serviceId');
      itemParams.serviceId = filter.serviceId;
    }
    if (filter.itemStatuses && filter.itemStatuses.length > 0) {
      itemConditions.push('item.status IN (:...itemStatuses)');
      itemParams.itemStatuses = filter.itemStatuses;
    }
    // filter.from/to are already UTC instants converted from the salon-local
    // calendar dates by the caller (ListAppointmentsUseCase) — this layer stays
    // timezone-agnostic, same as every other query here.
    if (filter.from) {
      itemConditions.push('item.starts_at >= :from');
      itemParams.from = filter.from;
    }
    if (filter.to) {
      itemConditions.push('item.starts_at < :to');
      itemParams.to = filter.to;
    }
    if (itemConditions.length > 0) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM appointment_items item WHERE item.appointment_id = appointment.id AND ${itemConditions.join(' AND ')})`,
        itemParams,
      );
    }

    const [appointments, total] = await qb.getManyAndCount();
    const appointmentIds = appointments.map((appointment) => appointment.id);
    const [itemsByAppointment, summaries] = await Promise.all([
      Promise.all(
        appointments.map((appointment) => this.itemsOf(this.repository.manager, appointment.id)),
      ),
      this.statusesAndTotalsOf(this.repository.manager, appointmentIds),
    ]);
    return {
      items: appointments.map((appointment, index) => {
        const summary = summaries.get(appointment.id);
        if (!summary) {
          throw new Error(`Nenhum item encontrado para a ordem ${appointment.id}`);
        }
        return { appointment, items: itemsByAppointment[index]!, ...summary };
      }),
      total,
    };
  }

  async findHistory(appointmentId: string): Promise<AppointmentHistoryEntry[]> {
    return this.repository.manager
      .createQueryBuilder(AppointmentHistoryEntry, 'history')
      .innerJoin(AppointmentItem, 'item', 'item.id = history.item_id')
      .where('item.appointment_id = :appointmentId', { appointmentId })
      .orderBy('history.occurredAt', 'ASC')
      .getMany();
  }

  async addItem(
    appointmentId: string,
    item: AppointmentItem,
    historyEntry: HistoryEntryInput,
    outboxEvent?: OutboxEventInput,
  ): Promise<AppointmentAggregate | null> {
    try {
      return await this.repository.manager.transaction(async (manager) => {
        const appointment = await this.lockAppointment(manager, appointmentId);
        if (!appointment) {
          return null;
        }
        await manager.insert(AppointmentItem, item);
        await manager.insert(
          AppointmentHistoryEntry,
          buildHistoryEntry(historyEntry) as never,
        );
        if (outboxEvent) {
          await manager.insert(OutboxEvent, buildOutboxEvent(appointmentId, outboxEvent) as never);
        }
        return this.loadAggregate(manager, appointment);
      });
    } catch (error) {
      if (isExclusionViolation(error)) {
        throw new SlotTakenException();
      }
      throw error;
    }
  }

  async updateItems(
    appointmentId: string,
    updates: ItemUpdate[],
    historyEntries: HistoryEntryInput[],
    options?: { outboxEvent?: OutboxEventInput; resetReminder?: boolean },
  ): Promise<AppointmentAggregate | null> {
    try {
      return await this.repository.manager.transaction(async (manager) => {
        const appointment = await this.lockAppointment(manager, appointmentId);
        if (!appointment) {
          return null;
        }
        for (const update of updates) {
          const { itemId, ...changes } = update;
          await manager.update(AppointmentItem, { id: itemId }, changes);
        }

        await manager.insert(
          AppointmentHistoryEntry,
          historyEntries.map(buildHistoryEntry) as never,
        );

        if (options?.outboxEvent) {
          await manager.insert(
            OutboxEvent,
            buildOutboxEvent(appointmentId, options.outboxEvent) as never,
          );
        }
        if (options?.resetReminder) {
          await manager.update(Appointment, { id: appointmentId }, { reminderSentAt: null });
          appointment.reminderSentAt = null;
        }
        return this.loadAggregate(manager, appointment);
      });
    } catch (error) {
      if (isExclusionViolation(error)) {
        throw new SlotTakenException();
      }
      throw error;
    }
  }

  async findBusyIntervals(
    professionalIds: string[],
    windowStart: Date,
    windowEnd: Date,
  ): Promise<
    { itemId: string; appointmentId: string; professionalId: string; startsAt: Date; endsAt: Date }[]
  > {
    if (professionalIds.length === 0) {
      return [];
    }
    const items = await this.repository.manager
      .createQueryBuilder(AppointmentItem, 'item')
      .where('item.professional_id IN (:...professionalIds)', { professionalIds })
      .andWhere('item.status <> :cancelled', { cancelled: 'CANCELLED' })
      .andWhere('item.starts_at < :windowEnd AND item.ends_at > :windowStart', {
        windowStart,
        windowEnd,
      })
      .getMany();
    return items.map((item) => ({
      itemId: item.id,
      appointmentId: item.appointmentId,
      professionalId: item.professionalId,
      startsAt: item.startsAt,
      endsAt: item.endsAt,
    }));
  }

  async findClientAppointmentDates(
    clientId: string,
    now: Date,
  ): Promise<{ appointmentId: string; startsAt: Date }[]> {
    const rows: { appointment_id: string; starts_at: Date }[] = await this.repository.manager.query(
      `SELECT DISTINCT ai.appointment_id, ai.starts_at
       FROM appointment_items ai
       INNER JOIN appointments a ON a.id = ai.appointment_id
       WHERE a.client_id = $1
         AND ai.status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
         AND ai.starts_at >= $2`,
      [clientId, now],
    );
    return rows.map((row) => ({
      appointmentId: row.appointment_id,
      startsAt: row.starts_at,
    }));
  }

  private async loadAggregate(
    manager: EntityManager,
    appointment: Appointment,
  ): Promise<AppointmentAggregate> {
    const [items, summary] = await Promise.all([
      this.itemsOf(manager, appointment.id),
      this.statusAndTotalOf(manager, appointment.id),
    ]);
    return { appointment, items, ...summary };
  }

  private async itemsOf(manager: EntityManager, appointmentId: string): Promise<AppointmentItem[]> {
    return manager.find(AppointmentItem, {
      where: { appointmentId },
      order: { startsAt: 'ASC' },
      relations: { service: true, professional: true },
    });
  }

  private async statusAndTotalOf(
    manager: EntityManager,
    appointmentId: string,
  ): Promise<AppointmentSummary> {
    const rows: { status: AppointmentStatus; total_cents: number }[] = await manager.query(
      `SELECT ${STATUS_CASE_SQL} AS status, ${TOTAL_CENTS_SQL} AS total_cents
       FROM appointment_items
       WHERE appointment_id = $1`,
      [appointmentId],
    );
    return { status: rows[0]!.status, totalCents: rows[0]!.total_cents };
  }

  private async statusesAndTotalsOf(
    manager: EntityManager,
    appointmentIds: string[],
  ): Promise<Map<string, AppointmentSummary>> {
    if (appointmentIds.length === 0) {
      return new Map();
    }
    const rows: { appointment_id: string; status: AppointmentStatus; total_cents: number }[] =
      await manager.query(
        `SELECT appointment_id, ${STATUS_CASE_SQL} AS status, ${TOTAL_CENTS_SQL} AS total_cents
         FROM appointment_items
         WHERE appointment_id = ANY($1)
         GROUP BY appointment_id`,
        [appointmentIds],
      );
    return new Map(
      rows.map((row) => [row.appointment_id, { status: row.status, totalCents: row.total_cents }]),
    );
  }

  private lockAppointment(manager: EntityManager, id: string): Promise<Appointment | null> {
    return manager.findOne(Appointment, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
      relations: { client: true },
    });
  }
}

function buildOutboxEvent(aggregateId: string, input: OutboxEventInput): OutboxEvent {
  return Object.assign(new OutboxEvent(), {
    aggregateType: 'APPOINTMENT',
    aggregateId,
    eventType: input.eventType,
    payload: input.payload,
    publishedAt: null,
  });
}

function buildHistoryEntry(input: HistoryEntryInput): AppointmentHistoryEntry {
  return Object.assign(new AppointmentHistoryEntry(), input);
}
