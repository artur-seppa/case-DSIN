import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { offsetOf, type PageRequest } from '../../../shared/pagination/page.js';
import { Professional } from '../../domain/professional.entity.js';
import { ProfessionalRepository } from '../../domain/professional.repository.js';
import { ProfessionalService } from '../../domain/professional-service.entity.js';
import { WorkingHours } from '../../domain/working-hours.entity.js';

@Injectable()
export class TypeOrmProfessionalRepository extends ProfessionalRepository {
  constructor(
    @InjectRepository(Professional)
    private readonly repository: Repository<Professional>,
  ) {
    super();
  }

  findById(id: string): Promise<Professional | null> {
    return this.repository.findOneBy({ id });
  }

  async list(
    filter: { includeInactive: boolean; serviceId?: string },
    page: PageRequest,
  ): Promise<{ items: Professional[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('professional')
      .orderBy('professional.name', 'ASC')
      .addOrderBy('professional.id', 'ASC')
      .skip(offsetOf(page))
      .take(page.limit);

    if (!filter.includeInactive) {
      query.andWhere('professional.active = :active', { active: true });
    }
    if (filter.serviceId) {
      query
        .innerJoin(
          ProfessionalService,
          'link',
          'link.professionalId = professional.id',
        )
        .andWhere('link.serviceId = :serviceId', {
          serviceId: filter.serviceId,
        });
    }
    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  async insert(professional: Professional): Promise<void> {
    await this.repository.insert(professional);
  }

  async update(
    id: string,
    changes: Partial<Pick<Professional, 'name' | 'active'>>,
  ): Promise<Professional | null> {
    const entity = Object.assign(new Professional(), { id });
    const { affected } = await this.repository
      .createQueryBuilder()
      .update()
      .set(changes)
      .whereEntity(entity)
      .returning('*')
      .updateEntity(true)
      .execute();
    return affected ? entity : null;
  }

  findServiceIds(professionalId: string): Promise<string[]> {
    return this.serviceIdsOf(this.repository.manager, professionalId);
  }

  async replaceServices(
    professionalId: string,
    serviceIds: string[],
  ): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      if (!(await this.lockProfessional(manager, professionalId))) {
        return;
      }
      await manager.delete(ProfessionalService, { professionalId });
      if (serviceIds.length > 0) {
        await manager.insert(
          ProfessionalService,
          serviceIds.map((serviceId) => ({ professionalId, serviceId })),
        );
      }
    });
  }

  findWorkingHours(professionalId: string): Promise<WorkingHours[]> {
    return this.repository.manager.find(WorkingHours, {
      where: { professionalId },
    });
  }

  async replaceWorkingHours(
    professionalId: string,
    hours: WorkingHours[],
  ): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      if (!(await this.lockProfessional(manager, professionalId))) {
        return;
      }
      await manager.delete(WorkingHours, { professionalId });
      if (hours.length > 0) {
        await manager.insert(WorkingHours, hours);
      }
    });
  }

  private async serviceIdsOf(
    manager: EntityManager,
    professionalId: string,
  ): Promise<string[]> {
    const links = await manager.find(ProfessionalService, {
      where: { professionalId },
      order: { serviceId: 'ASC' },
    });
    return links.map((link) => link.serviceId);
  }

  private lockProfessional(
    manager: EntityManager,
    professionalId: string,
  ): Promise<Professional | null> {
    return manager.findOne(Professional, {
      where: { id: professionalId },
      lock: { mode: 'pessimistic_write' },
    });
  }
}
