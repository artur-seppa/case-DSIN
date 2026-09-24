import type { PageRequest } from '../../shared/pagination/page.js';
import type { Professional } from './professional.entity.js';
import type { WorkingHours } from './working-hours.entity.js';

export abstract class ProfessionalRepository {
  abstract findById(id: string): Promise<Professional | null>;
  abstract findByIds(ids: string[]): Promise<Professional[]>;
  abstract list(
    filter: { includeInactive: boolean; serviceId?: string },
    page: PageRequest,
  ): Promise<{ items: Professional[]; total: number }>;
  abstract insert(professional: Professional): Promise<void>;
  abstract update(
    id: string,
    changes: Partial<Pick<Professional, 'name' | 'active'>>,
  ): Promise<Professional | null>;
  abstract findServiceIds(professionalId: string): Promise<string[]>;
  abstract replaceServices(
    professionalId: string,
    serviceIds: string[],
  ): Promise<void>;
  abstract findWorkingHours(professionalId: string): Promise<WorkingHours[]>;
  abstract findWorkingHoursByIds(professionalIds: string[]): Promise<WorkingHours[]>;
  abstract replaceWorkingHours(
    professionalId: string,
    hours: WorkingHours[],
  ): Promise<void>;
}
