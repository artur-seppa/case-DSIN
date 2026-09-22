export interface PageRequest {
  page: number;
  limit: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function offsetOf({ page, limit }: PageRequest): number {
  return (page - 1) * limit;
}

export function toPage<T>(
  items: T[],
  total: number,
  { page, limit }: PageRequest,
): Page<T> {
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
