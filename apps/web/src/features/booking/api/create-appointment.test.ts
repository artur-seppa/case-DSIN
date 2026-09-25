import { createAppointment } from '@/features/booking/api/create-appointment';
import { client } from '@/shared/api/client';
import { NETWORK_ERROR_MESSAGE } from '@/shared/api/errors';

vi.mock('@/shared/api/client', () => ({
  client: { POST: vi.fn() },
}));

describe('createAppointment', () => {
  it('throws a network-failure ApiError when the request itself rejects', async () => {
    vi.mocked(client.POST).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      createAppointment({ startsAt: '2026-10-01T18:00:00Z', notes: undefined, items: [] }),
    ).rejects.toEqual({ status: 0, code: null, message: NETWORK_ERROR_MESSAGE });
  });

  it('resolves with the created appointment on success', async () => {
    const appointment = { id: 'apt-1', status: 'PENDING' };
    vi.mocked(client.POST).mockResolvedValue({
      data: appointment,
      error: undefined,
      response: new Response(null, { status: 201 }),
    } as never);

    await expect(
      createAppointment({ startsAt: '2026-10-01T18:00:00Z', notes: undefined, items: [] }),
    ).resolves.toEqual(appointment);
  });

  it('maps a 409 SLOT_TAKEN without touching the response body a second time', async () => {
    const body = { statusCode: 409, code: 'SLOT_TAKEN', message: 'Horário acabou de ser ocupado' };
    const response = new Response(JSON.stringify(body), { status: 409 });
    await response.text();
    vi.mocked(client.POST).mockResolvedValue({ data: undefined, error: body, response } as never);

    await expect(
      createAppointment({ startsAt: '2026-10-01T18:00:00Z', notes: undefined, items: [] }),
    ).rejects.toEqual({ status: 409, code: 'SLOT_TAKEN', message: 'Horário acabou de ser ocupado' });
  });
});
