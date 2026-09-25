import { reportsLabels } from '@/shared/labels/reports';

export interface ServiceRankingListProps {
  ranking: { serviceId: string; name: string; completedCount: number }[];
}

export function ServiceRankingList({ ranking }: ServiceRankingListProps) {
  if (ranking.length === 0) {
    return <p className="text-small text-text-secondary">{reportsLabels.serviceRankingEmpty}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {ranking.map((row) => (
        <li key={row.serviceId} className="flex justify-between text-body text-text-primary">
          <span>{row.name}</span>
          <span className="font-medium">{row.completedCount}</span>
        </li>
      ))}
    </ul>
  );
}
