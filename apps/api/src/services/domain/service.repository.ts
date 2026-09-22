import type { PageRequest } from '../../shared/pagination/page.js';
import type { Service } from './service.entity.js';

export abstract class ServiceRepository {
  abstract findById(id: string): Promise<Service | null>;
  abstract findByIds(ids: string[]): Promise<Service[]>;
  abstract list(
    filter: { includeInactive: boolean },
    page: PageRequest,
  ): Promise<{ items: Service[]; total: number }>;
  abstract insert(service: Service): Promise<void>;
  abstract update(
    id: string,
    changes: Partial<
      Pick<Service, 'name' | 'durationMinutes' | 'priceCents' | 'active'>
    >,
  ): Promise<Service | null>;
}
