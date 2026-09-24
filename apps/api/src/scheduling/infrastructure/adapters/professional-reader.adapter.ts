import { Injectable } from '@nestjs/common';
import { ProfessionalRepository } from '../../../professionals/domain/professional.repository.js';
import {
  ProfessionalReader,
  type ProfessionalSnapshot,
  type ProfessionalWorkingWindow,
  type ProfessionalWorkingWindowWithOwner,
} from '../../application/ports/professional-reader.js';

@Injectable()
export class ProfessionalReaderAdapter extends ProfessionalReader {
  constructor(private readonly professionals: ProfessionalRepository) {
    super();
  }

  async findActive(id: string): Promise<ProfessionalSnapshot | null> {
    const professional = await this.professionals.findById(id);
    if (!professional || !professional.active) {
      return null;
    }
    return { id: professional.id, name: professional.name, active: true };
  }

  async findByIds(ids: string[]): Promise<ProfessionalSnapshot[]> {
    const professionals = await this.professionals.findByIds(ids);
    return professionals.map((professional) => ({
      id: professional.id,
      name: professional.name,
      active: professional.active,
    }));
  }

  async offersService(
    professionalId: string,
    serviceId: string,
  ): Promise<boolean> {
    const serviceIds = await this.professionals.findServiceIds(professionalId);
    return serviceIds.includes(serviceId);
  }

  async findWorkingHours(
    professionalId: string,
  ): Promise<ProfessionalWorkingWindow[]> {
    const hours = await this.professionals.findWorkingHours(professionalId);
    return hours.map((window) => ({
      weekday: window.weekday,
      startTime: window.startTime.slice(0, 5),
      endTime: window.endTime.slice(0, 5),
    }));
  }

  async findWorkingHoursByIds(
    professionalIds: string[],
  ): Promise<ProfessionalWorkingWindowWithOwner[]> {
    const hours = await this.professionals.findWorkingHoursByIds(professionalIds);
    return hours.map((window) => ({
      professionalId: window.professionalId,
      weekday: window.weekday,
      startTime: window.startTime.slice(0, 5),
      endTime: window.endTime.slice(0, 5),
    }));
  }
}
