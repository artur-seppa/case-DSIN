import { ServiceRepository } from '../../domain/service.repository.js';
import { CreateServiceUseCase } from './create-service.use-case.js';

describe('CreateServiceUseCase', () => {
  it('creates an active service with a generated id and persists it', async () => {
    const services = {
      insert: vi.fn<ServiceRepository['insert']>().mockResolvedValue(undefined),
    };
    const useCase = new CreateServiceUseCase(
      services as unknown as ServiceRepository,
    );

    const service = await useCase.execute({
      name: 'Corte feminino',
      durationMinutes: 60,
      priceCents: 8000,
    });

    expect(service).toMatchObject({
      name: 'Corte feminino',
      durationMinutes: 60,
      priceCents: 8000,
      active: true,
    });
    expect(service.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(services.insert).toHaveBeenCalledExactlyOnceWith(service);
  });
});
