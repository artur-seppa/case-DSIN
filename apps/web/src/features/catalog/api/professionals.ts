import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { client } from '@/shared/api/client';
import { errorFromBody, networkFailureError } from '@/shared/api/errors';

export interface Professional {
  id: string;
  name: string;
  active: boolean;
}

export interface WorkingWindow {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface ProfessionalDetail extends Professional {
  serviceIds: string[];
  workingHours: WorkingWindow[];
}

export interface ProfessionalsPage {
  items: Professional[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ADMIN_PAGE_SIZE = 5;

async function fetchProfessionals(serviceId: string): Promise<Professional[]> {
  const { data, response } = await client.GET('/api/professionals', {
    params: { query: { serviceId, limit: 100 } },
  });
  if (!response.ok || !data) {
    throw new Error(`PROFESSIONALS_${response.status}`);
  }
  return data.items;
}

export function professionalsQueryOptions(serviceId: string) {
  return queryOptions({
    queryKey: ['catalog', 'professionals', serviceId],
    queryFn: () => fetchProfessionals(serviceId),
  });
}

async function fetchAllProfessionals(): Promise<Professional[]> {
  const { data, response } = await client.GET('/api/professionals', {
    params: { query: { includeInactive: true, limit: 100 } },
  });
  if (!response.ok || !data) {
    throw new Error(`PROFESSIONALS_${response.status}`);
  }
  return data.items;
}

export const adminProfessionalsQueryOptions = queryOptions({
  queryKey: ['catalog', 'professionals', 'admin'],
  queryFn: fetchAllProfessionals,
});

async function fetchAdminProfessionalsPage(page: number): Promise<ProfessionalsPage> {
  const { data, response } = await client.GET('/api/professionals', {
    params: { query: { includeInactive: true, page, limit: ADMIN_PAGE_SIZE } },
  });
  if (!response.ok || !data) {
    throw new Error(`PROFESSIONALS_${response.status}`);
  }
  return data;
}

export function adminProfessionalsInfiniteQueryOptions() {
  return infiniteQueryOptions({
    queryKey: ['catalog', 'professionals', 'admin', 'paginated'],
    queryFn: ({ pageParam }) => fetchAdminProfessionalsPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
  });
}

async function fetchProfessionalDetail(id: string): Promise<ProfessionalDetail> {
  const { data, response } = await client.GET('/api/professionals/{id}', {
    params: { path: { id } },
  });
  if (!response.ok || !data) {
    throw new Error(`PROFESSIONAL_${response.status}`);
  }
  return data;
}

export function professionalDetailQueryOptions(id: string) {
  return queryOptions({ queryKey: ['catalog', 'professionals', 'detail', id], queryFn: () => fetchProfessionalDetail(id) });
}

export async function createProfessional(name: string): Promise<Professional> {
  const result = await client.POST('/api/professionals', { body: { name } }).catch(() => {
    throw networkFailureError();
  });
  const { data, error, response } = result;
  if (!response.ok || !data) {
    throw errorFromBody(response.status, error);
  }
  return data;
}

export async function updateProfessional(id: string, input: { name?: string; active?: boolean }): Promise<Professional> {
  const result = await client
    .PATCH('/api/professionals/{id}', { params: { path: { id } }, body: input })
    .catch(() => {
      throw networkFailureError();
    });
  const { data, error, response } = result;
  if (!response.ok || !data) {
    throw errorFromBody(response.status, error);
  }
  return data;
}

export async function setProfessionalServices(id: string, serviceIds: string[]): Promise<ProfessionalDetail> {
  const result = await client
    .PUT('/api/professionals/{id}/services', { params: { path: { id } }, body: { serviceIds } })
    .catch(() => {
      throw networkFailureError();
    });
  const { data, error, response } = result;
  if (!response.ok || !data) {
    throw errorFromBody(response.status, error);
  }
  return data;
}

export async function setProfessionalWorkingHours(id: string, windows: WorkingWindow[]): Promise<ProfessionalDetail> {
  const result = await client
    .PUT('/api/professionals/{id}/working-hours', { params: { path: { id } }, body: { windows } })
    .catch(() => {
      throw networkFailureError();
    });
  const { data, error, response } = result;
  if (!response.ok || !data) {
    throw errorFromBody(response.status, error);
  }
  return data;
}
