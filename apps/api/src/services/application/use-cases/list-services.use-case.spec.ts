import { makeService } from '../../../testing/factories/service.factory.js';
import { ServiceRepository } from '../../domain/service.repository.js';
import { FindServicesByIdsUseCase } from './find-services-by-ids.use-case.js';
import { ListServicesUseCase } from './list-services.use-case.js';

describe('ListServicesUseCase', () => {
  const services = { list: vi.fn<ServiceRepository['list']>() };
  const useCase = new ListServicesUseCase(
    services as unknown as ServiceRepository,
  );

  it.each([{ includeInactive: false }, { includeInactive: true }])(
    'delegates the filter %o and the page to the repository',
    async (filter) => {
      services.list.mockResolvedValue({ items: [makeService()], total: 1 });
      const page = { page: 2, limit: 10 };

      await useCase.execute(filter, page);

      expect(services.list).toHaveBeenCalledWith(filter, page);
    },
  );

  it('describes the page: items, total, page, limit and total pages', async () => {
    const items = [makeService(), makeService()];
    services.list.mockResolvedValue({ items, total: 25 });

    const result = await useCase.execute(
      { includeInactive: false },
      { page: 2, limit: 10 },
    );

    expect(result).toEqual({
      items,
      total: 25,
      page: 2,
      limit: 10,
      totalPages: 3,
    });
  });

  it('reports zero pages for an empty catalog', async () => {
    services.list.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute(
      { includeInactive: false },
      { page: 1, limit: 20 },
    );

    expect(result).toMatchObject({ items: [], total: 0, totalPages: 0 });
  });
});

describe('FindServicesByIdsUseCase', () => {
  it('asks the repository for each id only once', async () => {
    const services = {
      findByIds: vi.fn<ServiceRepository['findByIds']>(),
    };
    const useCase = new FindServicesByIdsUseCase(
      services as unknown as ServiceRepository,
    );
    const corte = makeService();
    services.findByIds.mockResolvedValue([corte]);

    const result = await useCase.execute([corte.id, corte.id]);

    expect(result).toEqual([corte]);
    expect(services.findByIds).toHaveBeenCalledWith([corte.id]);
  });
});
