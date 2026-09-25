import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './shared/config/env.validation.js';
import { DatabaseModule } from './shared/database/database.module.js';
import { ProfessionalsModule } from './professionals/professionals.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { SchedulingModule } from './scheduling/scheduling.module.js';
import { ServicesModule } from './services/services.module.js';
import { SharedModule } from './shared/shared.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    SharedModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    ServicesModule,
    ProfessionalsModule,
    SchedulingModule,
    ReportsModule,
  ],
})
export class AppModule {}
