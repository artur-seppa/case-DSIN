import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { offsetOf, toPage } from './page.js';
import { PaginationQuery } from './pagination.query.js';

async function messagesFor(query: Record<string, unknown>) {
  const errors = await validate(plainToInstance(PaginationQuery, query));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('PaginationQuery', () => {
  it('defaults to the first page with 20 items', async () => {
    const query = plainToInstance(PaginationQuery, {});

    expect(await validate(query)).toHaveLength(0);
    expect(query).toMatchObject({ page: 1, limit: 20 });
  });

  it('converts the query string values to numbers', async () => {
    const query = plainToInstance(PaginationQuery, { page: '3', limit: '50' });

    expect(await validate(query)).toHaveLength(0);
    expect(query).toMatchObject({ page: 3, limit: 50 });
  });

  it('rejects a page below 1, in Portuguese', async () => {
    await expect(messagesFor({ page: '0' })).resolves.toEqual([
      'Página deve ser no mínimo 1',
    ]);
  });

  it('rejects a limit above 100, in Portuguese', async () => {
    await expect(messagesFor({ limit: '101' })).resolves.toEqual([
      'Itens por página deve ser no máximo 100',
    ]);
  });

  it('rejects a page so large that the offset would overflow the database', async () => {
    await expect(messagesFor({ page: '1e18' })).resolves.toEqual([
      'Página deve ser no máximo 100000',
    ]);
  });

  it('rejects values that are not integers', async () => {
    await expect(messagesFor({ page: 'abc' })).resolves.toContain(
      'Página: valor inválido',
    );
    await expect(messagesFor({ limit: '1.5' })).resolves.toEqual([
      'Itens por página: valor inválido',
    ]);
  });
});

describe('page helpers', () => {
  it('computes the offset of a page', () => {
    expect(offsetOf({ page: 1, limit: 20 })).toBe(0);
    expect(offsetOf({ page: 3, limit: 20 })).toBe(40);
  });

  it('rounds the number of pages up', () => {
    expect(toPage([], 21, { page: 1, limit: 20 }).totalPages).toBe(2);
    expect(toPage([], 40, { page: 1, limit: 20 }).totalPages).toBe(2);
    expect(toPage([], 0, { page: 1, limit: 20 }).totalPages).toBe(0);
  });
});
