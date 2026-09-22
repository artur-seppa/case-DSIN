import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfessionalRepository } from '../../domain/professional.repository.js';
import { WorkingHours } from '../../domain/working-hours.entity.js';
import {
  assertValidWorkingWindows,
  sortWorkingHours,
  type WorkingWindow,
} from '../../domain/working-hours.policy.js';
import type { ProfessionalDetail } from './get-professional.use-case.js';

@Injectable()
export class SetProfessionalWorkingHoursUseCase {
  constructor(private readonly professionals: ProfessionalRepository) {}

  async execute(input: {
    professionalId: string;
    windows: WorkingWindow[];
  }): Promise<ProfessionalDetail> {
    const professional = await this.professionals.findById(
      input.professionalId,
    );
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    assertValidWorkingWindows(input.windows);

    const hours = input.windows.map((window) =>
      Object.assign(new WorkingHours(), {
        professionalId: professional.id,
        weekday: window.weekday,
        startTime: window.startTime,
        endTime: window.endTime,
      }),
    );

    const [, serviceIds] = await Promise.all([
      this.professionals.replaceWorkingHours(professional.id, hours),
      this.professionals.findServiceIds(professional.id),
    ]);

    return {
      professional,
      serviceIds,
      workingHours: sortWorkingHours(hours),
    };
  }
}
