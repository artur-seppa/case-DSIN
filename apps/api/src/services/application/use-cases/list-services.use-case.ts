import { Injectable } from '@nestjs/common';
import {
  toPage,
  type Page,
  type PageRequest,
} from '../../../shared/pagination/page.js';
import type { Service } from '../../domain/service.entity.js';
import { ServiceRepository } from '../../domain/service.repository.js';

@Injectable()
export class ListServicesUseCase {
  constructor(private readonly services: ServiceRepository) {}

  async execute(
    filter: { includeInactive: boolean },
    page: PageRequest,
  ): Promise<Page<Service>> {
    const { items, total } = await this.services.list(filter, page);
    return toPage(items, total, page);
  }
}
