import { infiniteQueryOptions } from '@tanstack/react-query';
import { client } from '@/shared/api/client';

export type ItemStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface AppointmentSummary {
  id: string;
  client: { id: string; name: string; phone: string | null };
  status: string;
  startsAt: string;
  endsAt: string;
  totalCents: number;
  items: { id: string; service: { name: string }; professional: { name: string }; status: string }[];
}

export interface AppointmentsPage {
  items: AppointmentSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AppointmentsDateRange {
  from?: string;
  to?: string;
}

const PAGE_SIZE = 10;

async function fetchAppointments(
  page: number,
  itemStatus?: ItemStatus[],
  dateRange?: AppointmentsDateRange,
): Promise<AppointmentsPage> {
  const { data, response } = await client.GET('/api/appointments', {
    params: {
      query: {
        page,
        limit: PAGE_SIZE,
        itemStatus,
        from: dateRange?.from,
        to: dateRange?.to,
        sort: 'startsAt',
        order: 'asc',
      },
    },
  });
  if (!response.ok || !data) {
    throw new Error(`APPOINTMENTS_${response.status}`);
  }
  return data;
}

export function appointmentsInfiniteQueryOptions(itemStatus?: ItemStatus[], dateRange?: AppointmentsDateRange) {
  return infiniteQueryOptions({
    queryKey: ['appointments', 'list', itemStatus ?? null, dateRange ?? null],
    queryFn: ({ pageParam }) => fetchAppointments(pageParam, itemStatus, dateRange),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
  });
}
