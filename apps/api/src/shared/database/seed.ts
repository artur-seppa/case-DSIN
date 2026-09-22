import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.js';
import { CreateProfessionalUseCase } from '../../professionals/application/use-cases/create-professional.use-case.js';
import { GetProfessionalUseCase } from '../../professionals/application/use-cases/get-professional.use-case.js';
import { ListProfessionalsUseCase } from '../../professionals/application/use-cases/list-professionals.use-case.js';
import { SetProfessionalServicesUseCase } from '../../professionals/application/use-cases/set-professional-services.use-case.js';
import { SetProfessionalWorkingHoursUseCase } from '../../professionals/application/use-cases/set-professional-working-hours.use-case.js';
import { CreateServiceUseCase } from '../../services/application/use-cases/create-service.use-case.js';
import { ListServicesUseCase } from '../../services/application/use-cases/list-services.use-case.js';
import { CreateUserUseCase } from '../../users/application/use-cases/create-user.use-case.js';
import { FindUserByEmailUseCase } from '../../users/application/use-cases/find-user-by-email.use-case.js';
import { Role } from '../auth/role.js';

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
  } finally {
    await app.close();
  }
}

await main();
