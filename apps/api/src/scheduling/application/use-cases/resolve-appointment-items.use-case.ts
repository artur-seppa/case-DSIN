import { Injectable, NotFoundException } from '@nestjs/common';
import { professionalDoesNotOfferServiceException } from '../../domain/exceptions.js';
import { ProfessionalReader } from '../ports/professional-reader.js';
import { ServiceReader } from '../ports/service-reader.js';

export interface AppointmentItemInput {
  serviceId: string;
  professionalId: string;
}

export interface ResolvedAppointmentItem {
  serviceId: string;
  professionalId: string;
  durationMinutes: number;
  priceCents: number;
}

@Injectable()
export class ResolveAppointmentItemsUseCase {
  constructor(
    private readonly services: ServiceReader,
    private readonly professionals: ProfessionalReader,
  ) {}

  async execute(
    items: AppointmentItemInput[],
  ): Promise<ResolvedAppointmentItem[]> {
    const serviceIds = [...new Set(items.map((item) => item.serviceId))];
    const professionalIds = [...new Set(items.map((item) => item.professionalId))];

    const [services, professionals] = await Promise.all([
      this.services.findByIds(serviceIds),
      this.professionals.findByIds(professionalIds),
    ]);
    const serviceById = new Map(services.map((service) => [service.id, service]));
    const professionalById = new Map(professionals.map((professional) => [professional.id, professional]));

    const offerPairs = [...new Set(items.map((item) => `${item.professionalId}:${item.serviceId}`))];
    const offersByPair = new Map(
      await Promise.all(
        offerPairs.map(async (pair): Promise<[string, boolean]> => {
          const [professionalId, serviceId] = pair.split(':') as [string, string];
          return [pair, await this.professionals.offersService(professionalId, serviceId)];
        }),
      ),
    );

    return items.map((item) => {
      const service = serviceById.get(item.serviceId);
      if (!service || !service.active) {
        throw new NotFoundException('Serviço não encontrado');
      }
      const professional = professionalById.get(item.professionalId);
      if (!professional || !professional.active) {
        throw new NotFoundException('Profissional não encontrado');
      }
      if (!offersByPair.get(`${item.professionalId}:${item.serviceId}`)) {
        throw professionalDoesNotOfferServiceException();
      }
      return {
        serviceId: item.serviceId,
        professionalId: item.professionalId,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
      };
    });
  }
}
