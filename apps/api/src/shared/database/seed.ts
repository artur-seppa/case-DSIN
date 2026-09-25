import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module.js';
import { CreateProfessionalUseCase } from '../../professionals/application/use-cases/create-professional.use-case.js';
import { GetProfessionalUseCase } from '../../professionals/application/use-cases/get-professional.use-case.js';
import { ListProfessionalsUseCase } from '../../professionals/application/use-cases/list-professionals.use-case.js';
import { SetProfessionalServicesUseCase } from '../../professionals/application/use-cases/set-professional-services.use-case.js';
import { SetProfessionalWorkingHoursUseCase } from '../../professionals/application/use-cases/set-professional-working-hours.use-case.js';
import { Professional } from '../../professionals/domain/professional.entity.js';
import { SchedulingSettings } from '../../scheduling/application/ports/scheduling-settings.js';
import { AppointmentHistoryAction } from '../../scheduling/domain/entities/appointment-history-action.js';
import { AppointmentHistoryEntry } from '../../scheduling/domain/entities/appointment-history.entity.js';
import { Appointment } from '../../scheduling/domain/entities/appointment.entity.js';
import { AppointmentItem } from '../../scheduling/domain/entities/appointment-item.entity.js';
import { ItemStatus } from '../../scheduling/domain/rules/item-status.js';
import { CreateServiceUseCase } from '../../services/application/use-cases/create-service.use-case.js';
import { ListServicesUseCase } from '../../services/application/use-cases/list-services.use-case.js';
import { CreateUserUseCase } from '../../users/application/use-cases/create-user.use-case.js';
import { FindUserByEmailUseCase } from '../../users/application/use-cases/find-user-by-email.use-case.js';
import { Role } from '../auth/role.js';
import {
  addDaysToLocalDate,
  localDayBounds,
  localDaysBetween,
  weekdayOfLocalDate,
  zonedPartsOf,
  zonedTimeToInstant,
} from '../time/utc-offset.js';

const FIRST_PAGE = { page: 1, limit: 100 };

const SERVICES = [
  { name: 'Corte feminino', durationMinutes: 60, priceCents: 8000 },
  { name: 'Escova', durationMinutes: 45, priceCents: 6000 },
  { name: 'Coloração', durationMinutes: 120, priceCents: 20000 },
  { name: 'Hidratação', durationMinutes: 60, priceCents: 9000 },
  { name: 'Manicure', durationMinutes: 60, priceCents: 4000 },
  { name: 'Pedicure', durationMinutes: 60, priceCents: 4500 },
];

const BUSINESS_HOURS = [
  { startTime: '09:00', endTime: '12:00' },
  { startTime: '13:00', endTime: '18:00' },
];

const PROFESSIONALS = [
  {
    name: 'Ana Souza',
    services: ['Corte feminino', 'Escova', 'Coloração', 'Hidratação'],
    weekdays: [1, 2, 3, 4, 5],
  },
  {
    name: 'Bruna Lima',
    services: ['Corte feminino', 'Escova', 'Hidratação'],
    weekdays: [2, 3, 4, 5, 6],
  },
  {
    name: 'Carla Mendes',
    services: ['Manicure', 'Pedicure'],
    weekdays: [1, 2, 3, 4, 5, 6],
  },
];

async function seedUser(
  app: INestApplicationContext,
  label: string,
  user: { name: string; email?: string; password?: string; role: Role },
): Promise<void> {
  if (!user.email || !user.password) {
    console.log(`${label}: credentials not set, skipped`);
    return;
  }
  const findUserByEmail = app.get(FindUserByEmailUseCase, { strict: false });
  if (await findUserByEmail.execute(user.email)) {
    console.log(`${label} ${user.email} already exists`);
    return;
  }
  await app.get(CreateUserUseCase, { strict: false }).execute({
    name: user.name,
    email: user.email,
    password: user.password,
    role: user.role,
  });
  console.log(`${label} ${user.email} created`);
}

async function seedServices(
  app: INestApplicationContext,
): Promise<Map<string, string>> {
  const existing = await app
    .get(ListServicesUseCase, { strict: false })
    .execute({ includeInactive: true }, FIRST_PAGE);
  const ids = new Map(
    existing.items.map((service) => [service.name, service.id]),
  );
  const createService = app.get(CreateServiceUseCase, { strict: false });

  for (const data of SERVICES) {
    if (!ids.has(data.name)) {
      ids.set(data.name, (await createService.execute(data)).id);
      console.log(`Service ${data.name} created`);
    }
  }
  return ids;
}

async function seedProfessionals(
  app: INestApplicationContext,
  serviceIds: Map<string, string>,
): Promise<void> {
  const existing = await app
    .get(ListProfessionalsUseCase, { strict: false })
    .execute({ includeInactive: true }, FIRST_PAGE);
  const idsByName = new Map(
    existing.items.map((professional) => [professional.name, professional.id]),
  );
  const createProfessional = app.get(CreateProfessionalUseCase, {
    strict: false,
  });
  const getProfessional = app.get(GetProfessionalUseCase, { strict: false });
  const setServices = app.get(SetProfessionalServicesUseCase, {
    strict: false,
  });
  const setWorkingHours = app.get(SetProfessionalWorkingHoursUseCase, {
    strict: false,
  });

  for (const data of PROFESSIONALS) {
    let professionalId = idsByName.get(data.name);
    if (!professionalId) {
      professionalId = (await createProfessional.execute({ name: data.name }))
        .id;
      console.log(`Professional ${data.name} created`);
    }

    const current = await getProfessional.execute({
      professionalId,
      includeInactive: true,
    });
    if (current.serviceIds.length === 0) {
      await setServices.execute({
        professionalId,
        serviceIds: data.services.map((name) => serviceIds.get(name)!),
      });
      console.log(`Professional ${data.name}: services set`);
    }
    if (current.workingHours.length === 0) {
      await setWorkingHours.execute({
        professionalId,
        windows: data.weekdays.flatMap((weekday) =>
          BUSINESS_HOURS.map((hours) => ({ weekday, ...hours })),
        ),
      });
      console.log(`Professional ${data.name}: working hours set`);
    }
  }
}

type DayPlanEntry = {
  status: ItemStatus;
  hour: number;
  professionalName: string;
  serviceName: string;
};

// Past/today: the full lifecycle, one item per status.
const PAST_DAY_PLAN: DayPlanEntry[] = [
  { status: ItemStatus.COMPLETED, hour: 9, professionalName: 'Ana Souza', serviceName: 'Hidratação' },
  { status: ItemStatus.CANCELLED, hour: 10, professionalName: 'Bruna Lima', serviceName: 'Corte feminino' },
  { status: ItemStatus.NO_SHOW, hour: 11, professionalName: 'Carla Mendes', serviceName: 'Pedicure' },
  { status: ItemStatus.CONFIRMED, hour: 14, professionalName: 'Bruna Lima', serviceName: 'Escova' },
  { status: ItemStatus.IN_PROGRESS, hour: 15, professionalName: 'Carla Mendes', serviceName: 'Manicure' },
  { status: ItemStatus.PENDING, hour: 16, professionalName: 'Ana Souza', serviceName: 'Corte feminino' },
];

// Future days: only statuses that make sense ahead of time.
const FUTURE_DAY_PLAN: DayPlanEntry[] = [
  { status: ItemStatus.PENDING, hour: 10, professionalName: 'Carla Mendes', serviceName: 'Manicure' },
  { status: ItemStatus.CONFIRMED, hour: 15, professionalName: 'Ana Souza', serviceName: 'Escova' },
];

async function seedWeekAppointments(
  app: INestApplicationContext,
  serviceIds: Map<string, string>,
): Promise<void> {
  if (!process.env.CLIENT_EMAIL) {
    console.log('Week appointments: CLIENT_EMAIL not set, skipped');
    return;
  }
  const client = await app
    .get(FindUserByEmailUseCase, { strict: false })
    .execute(process.env.CLIENT_EMAIL);
  if (!client) {
    console.log('Week appointments: client not found, skipped');
    return;
  }
  const admin = process.env.ADMIN_EMAIL
    ? await app.get(FindUserByEmailUseCase, { strict: false }).execute(process.env.ADMIN_EMAIL)
    : null;

  const dataSource = app.get(DataSource);
  const settings = app.get(SchedulingSettings, { strict: false });
  const todayLocal = zonedPartsOf(new Date(), settings.utcOffsetMinutes);
  const monday = addDaysToLocalDate(todayLocal, -(weekdayOfLocalDate(todayLocal) - 1));

  const professionalIdByName = new Map(
    (await dataSource.getRepository(Professional).find()).map((professional) => [
      professional.name,
      professional.id,
    ]),
  );
  const appointmentRepo = dataSource.getRepository(Appointment);
  const itemRepo = dataSource.getRepository(AppointmentItem);
  const historyRepo = dataSource.getRepository(AppointmentHistoryEntry);

  let totalSeeded = 0;
  for (let offset = 0; offset < 7; offset++) {
    const dayLocal = addDaysToLocalDate(monday, offset);
    const { start: dayStart, end: dayEnd } = localDayBounds(dayLocal, settings.utcOffsetMinutes);
    const daysFromToday = localDaysBetween(todayLocal, dayLocal);

    const alreadySeeded = await itemRepo
      .createQueryBuilder('item')
      .where('item.starts_at >= :start AND item.starts_at < :end', { start: dayStart, end: dayEnd })
      .getCount();
    if (alreadySeeded > 0) {
      continue;
    }

    const plan = daysFromToday > 0 ? FUTURE_DAY_PLAN : PAST_DAY_PLAN;
    for (const entry of plan) {
      const service = SERVICES.find((candidate) => candidate.name === entry.serviceName)!;
      const startsAt = zonedTimeToInstant({ ...dayLocal, hour: entry.hour, minute: 0 }, settings.utcOffsetMinutes);
      const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

      const appointment = await appointmentRepo.save(
        appointmentRepo.create({ clientId: client.id, notes: null }),
      );
      const item = await itemRepo.save(
        itemRepo.create({
          appointmentId: appointment.id,
          serviceId: serviceIds.get(entry.serviceName)!,
          professionalId: professionalIdByName.get(entry.professionalName)!,
          startsAt,
          endsAt,
          priceCents: service.priceCents,
          status: entry.status,
        }),
      );

      await historyRepo.save(
        historyRepo.create({
          itemId: item.id,
          actorId: client.id,
          action: AppointmentHistoryAction.ITEM_ADDED,
          changes: {},
          occurredAt: new Date(startsAt.getTime() - 60 * 60_000),
        }),
      );
      if (entry.status !== ItemStatus.PENDING && admin) {
        await historyRepo.save(
          historyRepo.create({
            itemId: item.id,
            actorId: admin.id,
            action: AppointmentHistoryAction.ITEM_STATUS_CHANGED,
            changes: { from: ItemStatus.PENDING, to: entry.status },
            occurredAt: new Date(startsAt.getTime() - 30 * 60_000),
          }),
        );
      }
      totalSeeded++;
    }
  }

  console.log(`Week appointments: seeded ${totalSeeded} items across the current week`);
}

async function main() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to seed');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    await seedUser(app, 'Admin', {
      name: process.env.ADMIN_NAME ?? 'Leila',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: Role.ADMIN,
    });
    await seedUser(app, 'Client', {
      name: process.env.CLIENT_NAME ?? 'Maria Cliente',
      email: process.env.CLIENT_EMAIL,
      password: process.env.CLIENT_PASSWORD,
      role: Role.CLIENT,
    });
    const serviceIds = await seedServices(app);
    await seedProfessionals(app, serviceIds);
    await seedWeekAppointments(app, serviceIds);
  } finally {
    await app.close();
  }
}

await main();
