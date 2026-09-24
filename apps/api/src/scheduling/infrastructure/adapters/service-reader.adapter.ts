import { Injectable } from '@nestjs/common';
import { ServiceRepository } from '../../../services/domain/service.repository.js';
import { ServiceReader, type ServiceSnapshot } from '../../application/ports/service-reader.js';

@Injectable()
export class ServiceReaderAdapter extends ServiceReader {
  constructor(private readonly services: ServiceRepository) {
    super();
  }

  async findActive(id: string): Promise<ServiceSnapshot | null> {
    const service = await this.services.findById(id);
    if (!service || !service.active) {
      return null;
    }
    return {
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      active: true,
    };
  }

  async findByIds(ids: string[]): Promise<ServiceSnapshot[]> {
    const services = await this.services.findByIds(ids);
    return services.map((service) => ({
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      active: service.active,
    }));
  }
}
