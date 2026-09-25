import { appointmentDetailQueryOptions } from '@/features/appointments/api/appointment-detail';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn() },
}));

const DETAIL = {
  id: 'apt-1',
  client: { id: 'client-1', name: 'Mariana', phone: null },
  status: 'CONFIRMED',
  notes: null,
  createdAt: '2026-09-20T12:00:00Z',
  startsAt: '2026-10-01T18:00:00Z',
  endsAt: '2026-10-01T19:00:00Z',
  totalCents: 8000,
  changeDeadline: '2026-09-29T18:00:00Z',
  canClientChange: true,
  items: [],
};

describe('appointmentDetailQueryOptions', () => {
  it('requests the appointment by id', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: DETAIL,
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    const options = appointmentDetailQueryOptions('apt-1');
    const result = await options.queryFn!({} as never);

    expect(client.GET).toHaveBeenCalledWith('/api/appointments/{id}', { params: { path: { id: 'apt-1' } } });
    expect(result).toEqual(DETAIL);
    expect(options.queryKey).toEqual(['appointments', 'detail', 'apt-1']);
  });

  it('throws a NOT_FOUND-carrying error on 404, distinct from other failures', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: undefined,
      error: { statusCode: 404, code: 'NOT_FOUND', message: 'Não encontrado' },
      response: new Response(null, { status: 404 }),
    } as never);

    await expect(appointmentDetailQueryOptions('missing').queryFn!({} as never)).rejects.toThrow('APPOINTMENT_404');
  });
});
