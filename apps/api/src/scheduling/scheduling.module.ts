import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessionalsModule } from '../professionals/professionals.module.js';
import { ServicesModule } from '../services/services.module.js';
import { UsersModule } from '../users/users.module.js';
import { AppointmentDetailAssembler } from './application/appointment-detail.assembler.js';
import { ItemPlacementResolver } from './application/item-placement-resolver.js';
import { ProfessionalReader } from './application/ports/professional-reader.js';
import { SchedulingSettings } from './application/ports/scheduling-settings.js';
import { ServiceReader } from './application/ports/service-reader.js';
import { UserReader } from './application/ports/user-reader.js';
import { AddItemUseCase } from './application/use-cases/add-item.use-case.js';
import { CancelAppointmentUseCase } from './application/use-cases/cancel-appointment.use-case.js';
import { CancelItemUseCase } from './application/use-cases/cancel-item.use-case.js';
import { ChangeItemStatusUseCase } from './application/use-cases/change-item-status.use-case.js';
import { ConfirmAppointmentUseCase } from './application/use-cases/confirm-appointment.use-case.js';
import { CreateAppointmentUseCase } from './application/use-cases/create-appointment.use-case.js';
import { GetAppointmentHistoryUseCase } from './application/use-cases/get-appointment-history.use-case.js';
import { GetAppointmentUseCase } from './application/use-cases/get-appointment.use-case.js';
import { GetAvailabilityUseCase } from './application/use-cases/get-availability.use-case.js';
import { GetConfigUseCase } from './application/use-cases/get-config.use-case.js';
import { ListAppointmentsUseCase } from './application/use-cases/list-appointments.use-case.js';
import { RepositionItemUseCase } from './application/use-cases/reposition-item.use-case.js';
import { ResolveAppointmentItemsUseCase } from './application/use-cases/resolve-appointment-items.use-case.js';
import { AppointmentHistoryEntry } from './domain/entities/appointment-history.entity.js';
import { AppointmentItem } from './domain/entities/appointment-item.entity.js';
import { Appointment } from './domain/entities/appointment.entity.js';
import { AppointmentSummaryView } from './domain/entities/appointment-summary.entity.js';
import { AppointmentRepository } from './domain/appointment.repository.js';
import { OutboxEvent } from './domain/entities/outbox-event.entity.js';
import { ConfigSchedulingSettings } from './infrastructure/config/config-scheduling-settings.js';
import { ProfessionalReaderAdapter } from './infrastructure/adapters/professional-reader.adapter.js';
import { ServiceReaderAdapter } from './infrastructure/adapters/service-reader.adapter.js';
import { UserReaderAdapter } from './infrastructure/adapters/user-reader.adapter.js';
import { TypeOrmAppointmentRepository } from './infrastructure/persistence/typeorm-appointment.repository.js';
import { AppointmentsController } from './presentation/http/appointments.controller.js';
import { AvailabilityController } from './presentation/http/availability.controller.js';
import { ConfigController } from './presentation/http/config.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      AppointmentItem,
      AppointmentHistoryEntry,
      OutboxEvent,
      AppointmentSummaryView,
    ]),
    ProfessionalsModule,
    ServicesModule,
    UsersModule,
  ],
  controllers: [AppointmentsController, AvailabilityController, ConfigController],
  providers: [
    { provide: AppointmentRepository, useClass: TypeOrmAppointmentRepository },
    { provide: ProfessionalReader, useClass: ProfessionalReaderAdapter },
    { provide: ServiceReader, useClass: ServiceReaderAdapter },
    { provide: UserReader, useClass: UserReaderAdapter },
    { provide: SchedulingSettings, useClass: ConfigSchedulingSettings },
    AppointmentDetailAssembler,
    ItemPlacementResolver,
    ResolveAppointmentItemsUseCase,
    GetAvailabilityUseCase,
    CreateAppointmentUseCase,
    GetAppointmentUseCase,
    ListAppointmentsUseCase,
    GetAppointmentHistoryUseCase,
    AddItemUseCase,
    RepositionItemUseCase,
    ConfirmAppointmentUseCase,
    CancelAppointmentUseCase,
    ChangeItemStatusUseCase,
    CancelItemUseCase,
    GetConfigUseCase,
  ],
  exports: [SchedulingSettings],
})
export class SchedulingModule {}
