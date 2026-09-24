import { FindServicesByIdsUseCase } from '../../../services/application/use-cases/find-services-by-ids.use-case.js';
import { makeProfessional } from '../../../testing/factories/professional.factory.js';
import { makeService } from '../../../testing/factories/service.factory.js';
import { makeWorkingHours } from '../../../testing/factories/working-hours.factory.js';
import {
  InvalidWorkingHoursException,
  ServicesNotFoundException,
} from '../../domain/exceptions.js';
import { ProfessionalRepository } from '../../domain/professional.repository.js';
import { CreateProfessionalUseCase } from './create-professional.use-case.js';
import { GetProfessionalUseCase } from './get-professional.use-case.js';
import { ListProfessionalsUseCase } from './list-professionals.use-case.js';
import { SetProfessionalServicesUseCase } from './set-professional-services.use-case.js';
import { SetProfessionalWorkingHoursUseCase } from './set-professional-working-hours.use-case.js';
import { UpdateProfessionalUseCase } from './update-professional.use-case.js';

describe('CreateProfessionalUseCase', () => {
  it('creates an active professional with a generated id and persists it', async () => {
    const professionals = {
      insert: vi
        .fn<ProfessionalRepository['insert']>()
        .mockResolvedValue(undefined),
    };
    const useCase = new CreateProfessionalUseCase(
      professionals as unknown as ProfessionalRepository,
    );

    const professional = await useCase.execute({ name: 'Ana Souza' });

    expect(professional).toMatchObject({ name: 'Ana Souza', active: true });
    expect(professional.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(professionals.insert).toHaveBeenCalledExactlyOnceWith(professional);
  });
});

describe('UpdateProfessionalUseCase', () => {
  function setup() {
    const professionals = {
      update: vi.fn<ProfessionalRepository['update']>(),
    };
    const useCase = new UpdateProfessionalUseCase(
      professionals as unknown as ProfessionalRepository,
    );
    return { professionals, useCase };
  }

  it('hands the changes to the repository and returns the updated professional', async () => {
    const { professionals, useCase } = setup();
    const professional = makeProfessional({ name: 'Ana Maria', active: false });
    professionals.update.mockResolvedValue(professional);
    const changes = { name: 'Ana Maria', active: false };

    const updated = await useCase.execute(professional.id, changes);

    expect(updated).toBe(professional);
    expect(professionals.update).toHaveBeenCalledExactlyOnceWith(
      professional.id,
      changes,
    );
  });

  it('fails when the professional does not exist', async () => {
    const { professionals, useCase } = setup();
    professionals.update.mockResolvedValue(null);

    await expect(useCase.execute('missing', { name: 'X' })).rejects.toThrow(
      'Profissional não encontrado',
    );
  });
});

describe('ListProfessionalsUseCase', () => {
  it('delegates the filter, including the service, and the page to the repository and describes the page', async () => {
    const professionals = { list: vi.fn<ProfessionalRepository['list']>() };
    const useCase = new ListProfessionalsUseCase(
      professionals as unknown as ProfessionalRepository,
    );
    const items = [makeProfessional()];
    professionals.list.mockResolvedValue({ items, total: 41 });
    const filter = { includeInactive: false, serviceId: 'SERVICE-A' };

    const result = await useCase.execute(filter, { page: 3, limit: 20 });

    expect(professionals.list).toHaveBeenCalledWith(filter, {
      page: 3,
      limit: 20,
    });
    expect(result).toEqual({
      items,
      total: 41,
      page: 3,
      limit: 20,
      totalPages: 3,
    });
  });
});

describe('GetProfessionalUseCase', () => {
  function setup() {
    const professionals = {
      findById: vi.fn<ProfessionalRepository['findById']>(),
      findServiceIds: vi
        .fn<ProfessionalRepository['findServiceIds']>()
        .mockResolvedValue([]),
      findWorkingHours: vi
        .fn<ProfessionalRepository['findWorkingHours']>()
        .mockResolvedValue([]),
    };
    const useCase = new GetProfessionalUseCase(
      professionals as unknown as ProfessionalRepository,
    );
    return { professionals, useCase };
  }

  it('returns the professional with services and working hours as the repository gives them', async () => {
    const { professionals, useCase } = setup();
    const professional = makeProfessional();
    const hours = [
      makeWorkingHours({ professionalId: professional.id, weekday: 1, startTime: '09:00:00' }),
      makeWorkingHours({ professionalId: professional.id, weekday: 1, startTime: '14:00:00' }),
      makeWorkingHours({ professionalId: professional.id, weekday: 2, startTime: '09:00:00' }),
    ];
    professionals.findById.mockResolvedValue(professional);
    professionals.findServiceIds.mockResolvedValue(['S1', 'S2']);
    professionals.findWorkingHours.mockResolvedValue(hours);

    const detail = await useCase.execute({
      professionalId: professional.id,
      includeInactive: false,
    });

    expect(detail.professional).toBe(professional);
    expect(detail.serviceIds).toEqual(['S1', 'S2']);
    expect(detail.workingHours).toBe(hours);
  });

  it('hides an inactive professional unless inactive ones are allowed', async () => {
    const { professionals, useCase } = setup();
    const professional = makeProfessional({ active: false });
    professionals.findById.mockResolvedValue(professional);

    await expect(
      useCase.execute({
        professionalId: professional.id,
        includeInactive: false,
      }),
    ).rejects.toThrow('Profissional não encontrado');
    await expect(
      useCase.execute({
        professionalId: professional.id,
        includeInactive: true,
      }),
    ).resolves.toBeDefined();
  });

  it('fails when the professional does not exist', async () => {
    const { professionals, useCase } = setup();
    professionals.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ professionalId: 'missing', includeInactive: true }),
    ).rejects.toThrow('Profissional não encontrado');
  });
});

describe('SetProfessionalServicesUseCase', () => {
  function setup() {
    const professionals = {
      findById: vi.fn<ProfessionalRepository['findById']>(),
      replaceServices: vi
        .fn<ProfessionalRepository['replaceServices']>()
        .mockResolvedValue(undefined),
      findWorkingHours: vi
        .fn<ProfessionalRepository['findWorkingHours']>()
        .mockResolvedValue([]),
    };
    const findServices = {
      execute: vi.fn<FindServicesByIdsUseCase['execute']>(),
    };
    const useCase = new SetProfessionalServicesUseCase(
      professionals as unknown as ProfessionalRepository,
      findServices as unknown as FindServicesByIdsUseCase,
    );
    return { professionals, findServices, useCase };
  }

  it('replaces the services, asking for each id only once', async () => {
    const { professionals, findServices, useCase } = setup();
    const professional = makeProfessional();
    const escova = makeService();
    professionals.findById.mockResolvedValue(professional);
    findServices.execute.mockResolvedValue([escova]);

    const detail = await useCase.execute({
      professionalId: professional.id,
      serviceIds: [escova.id, escova.id],
    });

    expect(findServices.execute).toHaveBeenCalledWith([escova.id]);
    expect(professionals.replaceServices).toHaveBeenCalledWith(
      professional.id,
      [escova.id],
    );
    expect(detail).toEqual({
      professional,
      serviceIds: [escova.id],
      workingHours: [],
    });
  });

  it('clears every association with an empty list, without looking services up', async () => {
    const { professionals, findServices, useCase } = setup();
    const professional = makeProfessional();
    professionals.findById.mockResolvedValue(professional);

    await useCase.execute({
      professionalId: professional.id,
      serviceIds: [],
    });

    expect(findServices.execute).not.toHaveBeenCalled();
    expect(professionals.replaceServices).toHaveBeenCalledWith(
      professional.id,
      [],
    );
  });

  it('refuses unknown services, tells which ones and changes nothing', async () => {
    const { professionals, findServices, useCase } = setup();
    const professional = makeProfessional();
    const corte = makeService();
    professionals.findById.mockResolvedValue(professional);
    findServices.execute.mockResolvedValue([corte]);

    const attempt = useCase.execute({
      professionalId: professional.id,
      serviceIds: [corte.id, 'GHOST'],
    });

    await expect(attempt).rejects.toBeInstanceOf(ServicesNotFoundException);
    await expect(attempt).rejects.toMatchObject({
      response: { code: 'SERVICES_NOT_FOUND', serviceIds: ['GHOST'] },
    });
    expect(professionals.replaceServices).not.toHaveBeenCalled();
  });

  it('fails when the professional does not exist, even if the services are also invalid', async () => {
    const { professionals, findServices, useCase } = setup();
    professionals.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ professionalId: 'missing', serviceIds: ['GHOST'] }),
    ).rejects.toThrow('Profissional não encontrado');
    expect(findServices.execute).not.toHaveBeenCalled();
  });
});

describe('SetProfessionalWorkingHoursUseCase', () => {
  function setup() {
    const professionals = {
      findById: vi.fn<ProfessionalRepository['findById']>(),
      replaceWorkingHours: vi
        .fn<ProfessionalRepository['replaceWorkingHours']>()
        .mockResolvedValue(undefined),
      findServiceIds: vi
        .fn<ProfessionalRepository['findServiceIds']>()
        .mockResolvedValue(['S1']),
    };
    const useCase = new SetProfessionalWorkingHoursUseCase(
      professionals as unknown as ProfessionalRepository,
    );
    return { professionals, useCase };
  }

  it('replaces the weekly schedule, giving each window its own id', async () => {
    const { professionals, useCase } = setup();
    const professional = makeProfessional();
    professionals.findById.mockResolvedValue(professional);

    const detail = await useCase.execute({
      professionalId: professional.id,
      windows: [
        { weekday: 1, startTime: '14:00', endTime: '18:00' },
        { weekday: 1, startTime: '09:00', endTime: '12:00' },
      ],
    });

    expect(detail.professional).toBe(professional);
    expect(detail.serviceIds).toEqual(['S1']);
    expect(detail.workingHours.map((h) => h.startTime)).toEqual([
      '09:00',
      '14:00',
    ]);

    const [professionalId, saved] =
      professionals.replaceWorkingHours.mock.calls[0]!;
    expect(professionalId).toBe(professional.id);
    expect(saved).toHaveLength(2);
    expect(saved.every((h) => h.professionalId === professional.id)).toBe(true);
    expect(new Set(saved.map((h) => h.id)).size).toBe(2);
  });

  it('does not persist anything when the schedule is invalid', async () => {
    const { professionals, useCase } = setup();
    professionals.findById.mockResolvedValue(makeProfessional());

    await expect(
      useCase.execute({
        professionalId: 'any',
        windows: [
          { weekday: 1, startTime: '09:00', endTime: '13:00' },
          { weekday: 1, startTime: '12:00', endTime: '18:00' },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidWorkingHoursException);
    expect(professionals.replaceWorkingHours).not.toHaveBeenCalled();
  });

  it('fails when the professional does not exist, even if the schedule is also invalid', async () => {
    const { professionals, useCase } = setup();
    professionals.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        professionalId: 'missing',
        windows: [
          { weekday: 1, startTime: '09:00', endTime: '13:00' },
          { weekday: 1, startTime: '12:00', endTime: '18:00' },
        ],
      }),
    ).rejects.toThrow('Profissional não encontrado');
    expect(professionals.replaceWorkingHours).not.toHaveBeenCalled();
  });
});
