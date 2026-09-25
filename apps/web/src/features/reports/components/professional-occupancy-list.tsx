import { reportsLabels } from '@/shared/labels/reports';

export interface ProfessionalOccupancyListProps {
  occupancy: {
    professionalId: string;
    name: string;
    scheduledMinutes: number;
    workingMinutes: number;
    occupancyRate: number | null;
  }[];
}

export function ProfessionalOccupancyList({ occupancy }: ProfessionalOccupancyListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {occupancy.map((row) => (
        <li key={row.professionalId} className="flex justify-between text-body text-text-primary">
          <span>{row.name}</span>
          <span className="font-medium">
            {row.occupancyRate === null ? reportsLabels.occupancyNoSchedule : `${Math.round(row.occupancyRate * 100)}%`}
          </span>
        </li>
      ))}
    </ul>
  );
}
