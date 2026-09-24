export interface ProfessionalSnapshot {
  id: string;
  name: string;
  active: boolean;
}

export interface ProfessionalWorkingWindow {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface ProfessionalWorkingWindowWithOwner extends ProfessionalWorkingWindow {
  professionalId: string;
}

export abstract class ProfessionalReader {
  abstract findActive(id: string): Promise<ProfessionalSnapshot | null>;
  abstract findByIds(ids: string[]): Promise<ProfessionalSnapshot[]>;
  abstract offersService(
    professionalId: string,
    serviceId: string,
  ): Promise<boolean>;
  abstract findWorkingHours(
    professionalId: string,
  ): Promise<ProfessionalWorkingWindow[]>;
  abstract findWorkingHoursByIds(
    professionalIds: string[],
  ): Promise<ProfessionalWorkingWindowWithOwner[]>;
}
