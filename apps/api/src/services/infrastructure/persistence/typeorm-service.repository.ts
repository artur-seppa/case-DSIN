import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { offsetOf, type PageRequest } from '../../../shared/pagination/page.js';
import { isUniqueViolation } from '../../../shared/database/unique-violation.js';
import { Service } from '../../domain/service.entity.js';
import { ServiceRepository } from '../../domain/service.repository.js';
import { ServiceNameAlreadyInUseException } from '../../domain/exceptions.js';

@Injectable()
export class TypeOrmServiceRepository extends ServiceRepository {
  constructor(
    @InjectRepository(Service) private readonly repository: Repository<Service>,
  ) {
    super();
  }

  findById(id: string): Promise<Service | null> {
    return this.repository.findOneBy({ id });
  }

  findByIds(ids: string[]): Promise<Service[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository.findBy({ id: In(ids) });
  }

  async list(
    filter: { includeInactive: boolean },
    page: PageRequest,
  ): Promise<{ items: Service[]; total: number }> {
    const [items, total] = await this.repository.findAndCount({
      where: filter.includeInactive ? {} : { active: true },
      order: { name: 'ASC', id: 'ASC' },
      skip: offsetOf(page),
      take: page.limit,
    });
    return { items, total };
  }

  async insert(service: Service): Promise<void> {
    try {
      await this.repository.insert(service);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ServiceNameAlreadyInUseException();
      }
      throw error;
    }
  }

  async update(
    id: string,
    changes: Partial<
      Pick<Service, 'name' | 'durationMinutes' | 'priceCents' | 'active'>
    >,
  ): Promise<Service | null> {
    const entity = Object.assign(new Service(), { id });
    try {
      const { affected } = await this.repository
        .createQueryBuilder()
        .update()
        .set(changes)
        .whereEntity(entity)
        .returning('*')
        .updateEntity(true)
        .execute();
      return affected ? entity : null;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ServiceNameAlreadyInUseException();
      }
      throw error;
    }
  }
}
