import { AppointmentMetricsReader } from '../ports/appointment-metrics-reader.js';
import { ProfessionalOccupancyReader } from '../ports/professional-occupancy-reader.js';
import { SchedulingSettings } from '../../../scheduling/application/ports/scheduling-settings.js';
import { GetWeeklyReportUseCase } from './get-weekly-report.use-case.js';

const SETTINGS: SchedulingSettings = {
  utcOffsetMinutes: -180,
  slotMinutes: 30,
  minLeadMinutes: 120,
  maxDaysAhead: 60,
  changeWindowHours: 48,
};

function setup() {
  const metrics: AppointmentMetricsReader = {
    weekComparisonCounts: vi.fn().mockResolvedValue({
      current: { revenueCents: 10000, completedCount: 4, cancelledCount: 1, noShowCount: 1, totalItemsCount: 10 },
      previous: { revenueCents: 8000, completedCount: 3, cancelledCount: 2, noShowCount: 0, totalItemsCount: 8 },
    }),
    appointmentsCreatedCounts: vi.fn().mockResolvedValue({ current: 5, previous: 4 }),
    serviceRanking: vi.fn().mockResolvedValue([{ serviceId: 'S1', name: 'Corte', completedCount: 3 }]),
    revenueByWeekday: vi.fn().mockResolvedValue([{ weekday: 2, revenueCents: 5000 }]),
    scheduledMinutesByProfessional: vi.fn().mockResolvedValue([{ professionalId: 'P1', scheduledMinutes: 60 }]),
  };
  const occupancy: ProfessionalOccupancyReader = {
    workingMinutesByProfessional: vi.fn().mockResolvedValue([
      { professionalId: 'P1', name: 'Bia', workingMinutes: 480 },
      { professionalId: 'P2', name: 'Carla', workingMinutes: 0 },
      { professionalId: 'P3', name: 'Duda', workingMinutes: 240 },
    ]),
  };
  const useCase = new GetWeeklyReportUseCase(metrics, occupancy, SETTINGS);
  return { useCase, metrics, occupancy };
}

describe('GetWeeklyReportUseCase', () => {
  it('assembles current/previous rates, week keys, and all 7 revenueByWeekday entries', async () => {
    const { useCase } = setup();

    const result = await useCase.execute('2026-09-30');

    expect(result.weekStart).toBe('2026-09-28');
    expect(result.weekEnd).toBe('2026-10-04');
    expect(result.current).toEqual({
      revenueCents: 10000,
      completedCount: 4,
      createdCount: 5,
      cancellationRate: 0.1,
      noShowRate: 0.1,
    });
    expect(result.previous).toEqual({
      revenueCents: 8000,
      completedCount: 3,
      createdCount: 4,
      cancellationRate: 0.25,
      noShowRate: 0,
    });
    expect(result.revenueByWeekday).toHaveLength(7);
    expect(result.revenueByWeekday).toContainEqual({ weekday: 2, revenueCents: 5000 });
    expect(result.revenueByWeekday).toContainEqual({ weekday: 1, revenueCents: 0 });
  });

  it('gives rate 0 (not NaN) when a period has zero items', async () => {
    const { useCase, metrics } = setup();
    vi.mocked(metrics.weekComparisonCounts).mockResolvedValue({
      current: { revenueCents: 0, completedCount: 0, cancelledCount: 0, noShowCount: 0, totalItemsCount: 0 },
      previous: { revenueCents: 0, completedCount: 0, cancelledCount: 0, noShowCount: 0, totalItemsCount: 0 },
    });

    const result = await useCase.execute('2026-09-28');

    expect(result.current.cancellationRate).toBe(0);
    expect(result.current.noShowRate).toBe(0);
  });

  it('gives a professional with no working hours occupancyRate: null instead of omitting them', async () => {
    const { useCase } = setup();

    const result = await useCase.execute('2026-09-28');

    const carla = result.professionalOccupancy.find((row) => row.professionalId === 'P2');
    expect(carla).toEqual({
      professionalId: 'P2',
      name: 'Carla',
      scheduledMinutes: 0,
      workingMinutes: 0,
      occupancyRate: null,
    });
    const bia = result.professionalOccupancy.find((row) => row.professionalId === 'P1');
    expect(bia).toEqual({
      professionalId: 'P1',
      name: 'Bia',
      scheduledMinutes: 60,
      workingMinutes: 480,
      occupancyRate: 0.125,
    });
  });

  it('gives a professional with configured hours but zero scheduled minutes occupancyRate: 0, not null', async () => {
    const { useCase } = setup();

    const result = await useCase.execute('2026-09-28');

    const duda = result.professionalOccupancy.find((row) => row.professionalId === 'P3');
    expect(duda).toEqual({
      professionalId: 'P3',
      name: 'Duda',
      scheduledMinutes: 0,
      workingMinutes: 240,
      occupancyRate: 0,
    });
  });
});
