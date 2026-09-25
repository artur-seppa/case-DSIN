import { cn } from '@/shared/lib/cn';

export interface IndicatorCardProps {
  label: string;
  value: string;
  current: number;
  previous: number;
  invert: boolean;
}

export function IndicatorCard({ label, value, current, previous, invert }: IndicatorCardProps) {
  const hasBaseline = previous !== 0;
  const changeRatio = hasBaseline ? (current - previous) / previous : 0;
  const isImprovement = invert ? changeRatio < 0 : changeRatio > 0;
  const sign = changeRatio > 0 ? '+' : changeRatio < 0 ? '-' : '';
  const percent = Math.round(Math.abs(changeRatio) * 100);

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-bg-surface p-4">
      <span className="text-small text-text-secondary">{label}</span>
      <span className="font-display text-h3 font-semibold text-text-primary">{value}</span>
      {hasBaseline && changeRatio !== 0 ? (
        <span className={cn('text-small font-medium', isImprovement ? 'text-success-700' : 'text-error-700')}>
          {sign}
          {percent}%
        </span>
      ) : null}
    </div>
  );
}
