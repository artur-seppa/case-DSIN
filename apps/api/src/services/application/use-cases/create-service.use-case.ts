import { Injectable } from '@nestjs/common';
import { Service } from '../../domain/service.entity.js';
import { ServiceRepository } from '../../domain/service.repository.js';

export interface CreateServiceInput {
  name: string;
  durationMinutes: number;
  priceCents: number;
}

@Injectable()
export class CreateServiceUseCase {
  constructor(private readonly services: ServiceRepository) {}

  async execute(input: CreateServiceInput): Promise<Service> {
    const service = Object.assign(new Service(), {
      name: input.name,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
      active: true,
    });

    await this.services.insert(service);
    return service;
  }
}
