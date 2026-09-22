import { Injectable, NotFoundException } from '@nestjs/common';
import { FindServicesByIdsUseCase } from '../../../services/application/use-cases/find-services-by-ids.use-case.js';
import { ServicesNotFoundException } from '../../domain/exceptions.js';
import { ProfessionalRepository } from '../../domain/professional.repository.js';
import { sortWorkingHours } from '../../domain/working-hours.policy.js';
import type { ProfessionalDetail } from './get-professional.use-case.js';

@Injectable()
export class SetProfessionalServicesUseCase {
  constructor(
    private readonly professionals: ProfessionalRepository,
    private readonly findServices: FindServicesByIdsUseCase,
  ) {}

  async execute(input: {
    professionalId: string;
    serviceIds: string[];
  }): Promise<ProfessionalDetail> {
    const professional = await this.professionals.findById(
      input.professionalId,
    );
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    const serviceIds = [...new Set(input.serviceIds)];
    if (serviceIds.length > 0) {
      const services = await this.findServices.execute(serviceIds);
      const found = new Set(services.map((s) => s.id));

      const missing = serviceIds.filter((id) => !found.has(id));
      if (missing.length > 0) {
        throw new ServicesNotFoundException(missing);
      }
    }

    const [, workingHours] = await Promise.all([
      this.professionals.replaceServices(professional.id, serviceIds),
      this.professionals.findWorkingHours(professional.id),
    ]);

    return {
      professional,
      serviceIds: serviceIds.sort(),
      workingHours: sortWorkingHours(workingHours),
    };
  }
}
