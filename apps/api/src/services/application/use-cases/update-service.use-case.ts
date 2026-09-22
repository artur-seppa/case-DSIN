import { Injectable, NotFoundException } from '@nestjs/common';
import type { Service } from '../../domain/service.entity.js';
import { ServiceRepository } from '../../domain/service.repository.js';

export interface UpdateServiceInput {
  name?: string;
  durationMinutes?: number;
  priceCents?: number;
  active?: boolean;
}

@Injectable()
export class UpdateServiceUseCase {
  constructor(private readonly services: ServiceRepository) {}

  async execute(
    serviceId: string,
    input: UpdateServiceInput,
  ): Promise<Service> {
    const service = await this.services.update(serviceId, input);
    if (!service) {
      throw new NotFoundException('Serviço não encontrado');
    }
    return service;
  }
}
