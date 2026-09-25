import { Injectable } from '@nestjs/common';
import { ProfessionalRepository } from '../../../professionals/domain/professional.repository.js';
import {
  ProfessionalOccupancyReader,
  type ProfessionalWorkingMinutesRow,
} from '../../application/ports/professional-occupancy-reader.js';

function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours! * 60 + minutes!;
}

@Injectable()
export class ProfessionalOccupancyReaderAdapter extends ProfessionalOccupancyReader {
  constructor(private readonly professionals: ProfessionalRepository) {
    super();
  }

  async workingMinutesByProfessional(): Promise<ProfessionalWorkingMinutesRow[]> {
    const { items: professionals } = await this.professionals.list(
      { includeInactive: true },
      { page: 1, limit: 200 },
    );
    const ids = professionals.map((professional) => professional.id);
    if (ids.length === 0) {
      return [];
    }

    const hours = await this.professionals.findWorkingHoursByIds(ids);
    const minutesByProfessional = new Map<string, number>();
    for (const window of hours) {
      const minutes = toMinutes(window.endTime) - toMinutes(window.startTime);
      minutesByProfessional.set(
        window.professionalId,
        (minutesByProfessional.get(window.professionalId) ?? 0) + minutes,
      );
    }

    return professionals.map((professional) => ({
      professionalId: professional.id,
      name: professional.name,
      workingMinutes: minutesByProfessional.get(professional.id) ?? 0,
    }));
  }
}
