import { render, screen } from '@testing-library/react';
import { ProfessionalOccupancyList } from '@/features/reports/components/professional-occupancy-list';

describe('ProfessionalOccupancyList', () => {
  it('shows the occupancy percentage for a professional with configured hours', () => {
    render(
      <ProfessionalOccupancyList
        occupancy={[
          { professionalId: 'P1', name: 'Bia', scheduledMinutes: 240, workingMinutes: 480, occupancyRate: 0.5 },
        ]}
      />,
    );

    expect(screen.getByText('Bia')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows an alternate message instead of a percentage when occupancyRate is null', () => {
    render(
      <ProfessionalOccupancyList
        occupancy={[
          { professionalId: 'P2', name: 'Carla', scheduledMinutes: 0, workingMinutes: 0, occupancyRate: null },
        ]}
      />,
    );

    expect(screen.getByText('Carla')).toBeInTheDocument();
    expect(screen.getByText('Sem expediente configurado')).toBeInTheDocument();
  });
});
