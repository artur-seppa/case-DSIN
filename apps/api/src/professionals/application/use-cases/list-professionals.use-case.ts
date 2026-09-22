import { Injectable } from '@nestjs/common';
import {
  toPage,
  type Page,
  type PageRequest,
} from '../../../shared/pagination/page.js';
import type { Professional } from '../../domain/professional.entity.js';
import { ProfessionalRepository } from '../../domain/professional.repository.js';

@Injectable()
export class ListProfessionalsUseCase {
  constructor(private readonly professionals: ProfessionalRepository) {}

  async execute(
    filter: { includeInactive: boolean; serviceId?: string },
    page: PageRequest,
  ): Promise<Page<Professional>> {
    const { items, total } = await this.professionals.list(filter, page);
    return toPage(items, total, page);
  }
}
