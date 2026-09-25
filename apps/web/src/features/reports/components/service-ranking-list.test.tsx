import { render, screen } from '@testing-library/react';
import { ServiceRankingList } from '@/features/reports/components/service-ranking-list';

describe('ServiceRankingList', () => {
  it('shows each service with its completed count, in the given order', () => {
    render(
      <ServiceRankingList
        ranking={[
          { serviceId: 'S1', name: 'Corte', completedCount: 5 },
          { serviceId: 'S2', name: 'Manicure', completedCount: 3 },
        ]}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Corte');
    expect(items[0]).toHaveTextContent('5');
    expect(items[1]).toHaveTextContent('Manicure');
  });

  it('shows an empty-state message when there is no ranking', () => {
    render(<ServiceRankingList ranking={[]} />);

    expect(screen.getByText('Nenhum serviço concluído nesta semana')).toBeInTheDocument();
  });
});
