import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { client } from '@/shared/api/client';
import { errorFromBody, networkFailureError } from '@/shared/api/errors';

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
}

export interface ServiceInput {
  name: string;
  durationMinutes: number;
  priceCents: number;
}

export interface ServicesPage {
  items: Service[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ADMIN_PAGE_SIZE = 5;

async function fetchServices(): Promise<Service[]> {
  const { data, response } = await client.GET('/api/services', {
    params: { query: { limit: 100 } },
  });
  if (!response.ok || !data) {
    throw new Error(`SERVICES_${response.status}`);
  }
  return data.items;
}

export const servicesQueryOptions = queryOptions({
  queryKey: ['catalog', 'services'],
  queryFn: fetchServices,
});

async function fetchAllServices(): Promise<Service[]> {
  const { data, response } = await client.GET('/api/services', {
    params: { query: { includeInactive: true, limit: 100 } },
  });
  if (!response.ok || !data) {
    throw new Error(`SERVICES_${response.status}`);
  }
  return data.items;
}

export const adminServicesQueryOptions = queryOptions({
  queryKey: ['catalog', 'services', 'admin'],
  queryFn: fetchAllServices,
});

async function fetchAdminServicesPage(page: number): Promise<ServicesPage> {
  const { data, response } = await client.GET('/api/services', {
    params: { query: { includeInactive: true, page, limit: ADMIN_PAGE_SIZE } },
  });
  if (!response.ok || !data) {
    throw new Error(`SERVICES_${response.status}`);
  }
  return data;
}

export function adminServicesInfiniteQueryOptions() {
  return infiniteQueryOptions({
    queryKey: ['catalog', 'services', 'admin', 'paginated'],
    queryFn: ({ pageParam }) => fetchAdminServicesPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
  });
}

export async function createService(input: ServiceInput): Promise<Service> {
  const result = await client.POST('/api/services', { body: input }).catch(() => {
    throw networkFailureError();
  });
  const { data, error, response } = result;
  if (!response.ok || !data) {
    throw errorFromBody(response.status, error);
  }
  return data;
}

export async function updateService(id: string, input: Partial<ServiceInput> & { active?: boolean }): Promise<Service> {
  const result = await client
    .PATCH('/api/services/{id}', { params: { path: { id } }, body: input })
    .catch(() => {
      throw networkFailureError();
    });
  const { data, error, response } = result;
  if (!response.ok || !data) {
    throw errorFromBody(response.status, error);
  }
  return data;
}
