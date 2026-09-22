import { Injectable, NotFoundException } from '@nestjs/common';
import type { Professional } from '../../domain/professional.entity.js';
import { ProfessionalRepository } from '../../domain/professional.repository.js';

export interface UpdateProfessionalInput {
  name?: string;
  active?: boolean;
}

@Injectable()
export class UpdateProfessionalUseCase {
  constructor(private readonly professionals: ProfessionalRepository) {}

  async execute(
    professionalId: string,
    input: UpdateProfessionalInput,
  ): Promise<Professional> {
    const professional = await this.professionals.update(professionalId, input);
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }
    return professional;
  }
}
