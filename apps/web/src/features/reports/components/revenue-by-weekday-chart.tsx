import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCents } from '@/shared/utils/money';

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'SEG',
  2: 'TER',
  3: 'QUA',
  4: 'QUI',
  5: 'SEX',
  6: 'SÁB',
  7: 'DOM',
};

export interface RevenueByWeekdayChartProps {
  data: { weekday: number; revenueCents: number }[];
}

export function RevenueByWeekdayChart({ data }: RevenueByWeekdayChartProps) {
  const chartData = data.map((row) => ({ label: WEEKDAY_LABELS[row.weekday] ?? '', revenueCents: row.revenueCents }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis hide />
        <Tooltip formatter={(value) => formatCents(Number(value))} />
        <Bar dataKey="revenueCents" fill="var(--color-accent-700)" radius={4} />
      </BarChart>
    </ResponsiveContainer>
  );
}
