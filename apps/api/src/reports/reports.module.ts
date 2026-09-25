import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { EnvironmentVariables } from '../shared/config/env.validation.js';
import { ProfessionalsModule } from '../professionals/professionals.module.js';
import { SchedulingModule } from '../scheduling/scheduling.module.js';
import { AppointmentItem } from '../scheduling/domain/entities/appointment-item.entity.js';
import { Appointment } from '../scheduling/domain/entities/appointment.entity.js';
import { AppointmentMetricsReader } from './application/ports/appointment-metrics-reader.js';
import { ProfessionalOccupancyReader } from './application/ports/professional-occupancy-reader.js';
import { GetWeeklyReportUseCase } from './application/use-cases/get-weekly-report.use-case.js';
import { AppointmentMetricsReaderAdapter } from './infrastructure/adapters/appointment-metrics-reader.adapter.js';
import { ProfessionalOccupancyReaderAdapter } from './infrastructure/adapters/professional-occupancy-reader.adapter.js';
import { createReportsCacheStore } from './infrastructure/reports-cache-store.js';
import { ReportsController } from './presentation/http/reports.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppointmentItem, Appointment]),
    ProfessionalsModule,
    SchedulingModule,
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        stores: [createReportsCacheStore(config.get('REDIS_URL', { infer: true }))],
      }),
    }),
  ],
  controllers: [ReportsController],
  providers: [
    { provide: AppointmentMetricsReader, useClass: AppointmentMetricsReaderAdapter },
    { provide: ProfessionalOccupancyReader, useClass: ProfessionalOccupancyReaderAdapter },
    GetWeeklyReportUseCase,
  ],
})
export class ReportsModule {}
