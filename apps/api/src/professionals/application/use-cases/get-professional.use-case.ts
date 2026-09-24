import { Injectable, NotFoundException } from '@nestjs/common';
import type { Professional } from '../../domain/professional.entity.js';
import { ProfessionalRepository } from '../../domain/professional.repository.js';
import type { WorkingHours } from '../../domain/working-hours.entity.js';

export interface ProfessionalDetail {
  professional: Professional;
  serviceIds: string[];
  workingHours: WorkingHours[];
}

@Injectable()
export class GetProfessionalUseCase {
  constructor(private readonly professionals: ProfessionalRepository) {}

  async execute(input: {
    professionalId: string;
    includeInactive: boolean;
  }): Promise<ProfessionalDetail> {
    const professional = await this.professionals.findById(
      input.professionalId,
    );
    if (!professional || (!professional.active && !input.includeInactive)) {
      throw new NotFoundException('Profissional não encontrado');
    }

    const [serviceIds, workingHours] = await Promise.all([
      this.professionals.findServiceIds(professional.id),
      this.professionals.findWorkingHours(professional.id),
    ]);

    return {
      professional,
      serviceIds,
      workingHours,
    };
  }
}
