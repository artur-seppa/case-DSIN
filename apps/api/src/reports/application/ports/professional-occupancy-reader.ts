export interface ProfessionalWorkingMinutesRow {
  professionalId: string;
  name: string;
  workingMinutes: number;
}

export abstract class ProfessionalOccupancyReader {
  abstract workingMinutesByProfessional(): Promise<ProfessionalWorkingMinutesRow[]>;
}
