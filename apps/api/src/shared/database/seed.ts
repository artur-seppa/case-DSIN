import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.js';
import { Role } from '../auth/role.js';
import { CreateUserUseCase } from '../../users/application/use-cases/create-user.use-case.js';
import { FindUserByEmailUseCase } from '../../users/application/use-cases/find-user-by-email.use-case.js';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to seed');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const findUserByEmail = app.get(FindUserByEmailUseCase, { strict: false });
    const createUser = app.get(CreateUserUseCase, { strict: false });

    if (await findUserByEmail.execute(email)) {
      console.log(`Admin ${email} already exists, nothing to do`);
      return;
    }

    await createUser.execute({
      name: process.env.ADMIN_NAME ?? 'Leila',
      email,
      password,
      role: Role.ADMIN,
    });
    console.log(`Admin ${email} created`);
  } finally {
    await app.close();
  }
}

await main();
