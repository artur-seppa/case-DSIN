import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesModule } from '../services/services.module.js';
import { CreateProfessionalUseCase } from './application/use-cases/create-professional.use-case.js';
import { GetProfessionalUseCase } from './application/use-cases/get-professional.use-case.js';
import { ListProfessionalsUseCase } from './application/use-cases/list-professionals.use-case.js';
import { SetProfessionalServicesUseCase } from './application/use-cases/set-professional-services.use-case.js';
import { SetProfessionalWorkingHoursUseCase } from './application/use-cases/set-professional-working-hours.use-case.js';
import { UpdateProfessionalUseCase } from './application/use-cases/update-professional.use-case.js';
import { Professional } from './domain/professional.entity.js';
import { ProfessionalService } from './domain/professional-service.entity.js';
import { ProfessionalRepository } from './domain/professional.repository.js';
import { WorkingHours } from './domain/working-hours.entity.js';
import { TypeOrmProfessionalRepository } from './infrastructure/persistence/typeorm-professional.repository.js';
import { ProfessionalsController } from './presentation/http/professionals.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Professional, ProfessionalService, WorkingHours]),
    ServicesModule,
  ],
  controllers: [ProfessionalsController],
  providers: [
    {
      provide: ProfessionalRepository,
      useClass: TypeOrmProfessionalRepository,
    },
    CreateProfessionalUseCase,
    UpdateProfessionalUseCase,
    ListProfessionalsUseCase,
    GetProfessionalUseCase,
    SetProfessionalServicesUseCase,
    SetProfessionalWorkingHoursUseCase,
  ],
})
export class ProfessionalsModule {}
