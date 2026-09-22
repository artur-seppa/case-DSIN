import { Injectable } from '@nestjs/common';
import type { Service } from '../../domain/service.entity.js';
import { ServiceRepository } from '../../domain/service.repository.js';

@Injectable()
export class FindServicesByIdsUseCase {
  constructor(private readonly services: ServiceRepository) {}

  execute(ids: string[]): Promise<Service[]> {
    return this.services.findByIds([...new Set(ids)]);
  }
}
