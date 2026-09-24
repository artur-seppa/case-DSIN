export interface ServiceSnapshot {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
}

export abstract class ServiceReader {
  abstract findActive(id: string): Promise<ServiceSnapshot | null>;
  abstract findByIds(ids: string[]): Promise<ServiceSnapshot[]>;
}
