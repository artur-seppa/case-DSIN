import { makeService } from '../../../testing/factories/service.factory.js';
import { ServiceRepository } from '../../domain/service.repository.js';
import { UpdateServiceUseCase } from './update-service.use-case.js';

function setup() {
  const services = { update: vi.fn<ServiceRepository['update']>() };
  const useCase = new UpdateServiceUseCase(
    services as unknown as ServiceRepository,
  );
  return { services, useCase };
}

describe('UpdateServiceUseCase', () => {
  it('hands the changes to the repository and returns the updated service', async () => {
    const { services, useCase } = setup();
    const service = makeService({ priceCents: 9000 });
    services.update.mockResolvedValue(service);
    const changes = { priceCents: 9000, active: false };

    const updated = await useCase.execute(service.id, changes);

    expect(updated).toBe(service);
    expect(services.update).toHaveBeenCalledExactlyOnceWith(
      service.id,
      changes,
    );
  });

  it('fails when the service does not exist', async () => {
    const { services, useCase } = setup();
    services.update.mockResolvedValue(null);

    await expect(useCase.execute('missing', { name: 'X' })).rejects.toThrow(
      'Serviço não encontrado',
    );
  });
});
