import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateServiceUseCase } from './application/use-cases/create-service.use-case.js';
import { FindServicesByIdsUseCase } from './application/use-cases/find-services-by-ids.use-case.js';
import { ListServicesUseCase } from './application/use-cases/list-services.use-case.js';
import { UpdateServiceUseCase } from './application/use-cases/update-service.use-case.js';
import { Service } from './domain/service.entity.js';
import { ServiceRepository } from './domain/service.repository.js';
import { TypeOrmServiceRepository } from './infrastructure/persistence/typeorm-service.repository.js';
import { ServicesController } from './presentation/http/services.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Service])],
  controllers: [ServicesController],
  providers: [
    { provide: ServiceRepository, useClass: TypeOrmServiceRepository },
    CreateServiceUseCase,
    UpdateServiceUseCase,
    ListServicesUseCase,
    FindServicesByIdsUseCase,
  ],
  exports: [FindServicesByIdsUseCase],
})
export class ServicesModule {}
