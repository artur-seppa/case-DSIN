import { Injectable } from '@nestjs/common';
import { Professional } from '../../domain/professional.entity.js';
import { ProfessionalRepository } from '../../domain/professional.repository.js';

@Injectable()
export class CreateProfessionalUseCase {
  constructor(private readonly professionals: ProfessionalRepository) {}

  async execute(input: { name: string }): Promise<Professional> {
    const professional = Object.assign(new Professional(), {
      name: input.name,
      active: true,
    });

    await this.professionals.insert(professional);
    return professional;
  }
}
