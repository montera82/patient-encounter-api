/* eslint-disable @typescript-eslint/no-explicit-any */
import { EncountersService } from './encounters.service';
import { EncounterEntity } from './domain/encounter.entity';
import { AppError } from '../common/app-error';
import { AuthenticatedProvider } from '../common/types';

const mockEncounterRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  findPatientById: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
};

const mockCacheService = {
  cache: jest.fn(),
  get: jest.fn(),
  cacheList: jest.fn(),
  getList: jest.fn(),
  generateKey: jest.fn(),
};

describe('EncountersService', () => {
  let service: EncountersService;
  let encounterRepository: any;
  let logger: any;

  const mockProvider: AuthenticatedProvider = {
    id: 'provider-123',
    name: 'Dr. Test Provider',
  };

  const mockEncounterData = {
    id: 'encounter-123',
    patientId: 'patient-456',
    providerId: 'provider-123',
    encounterDate: new Date('2023-12-15'),
    encounterType: 'INITIAL_ASSESSMENT',
    clinicalData: { notes: 'Test notes' },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'provider-123',
    toResponse: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    encounterRepository = mockEncounterRepository;
    logger = mockLogger;
    service = new EncountersService(encounterRepository, logger, mockCacheService as any);
  });

  describe('createEncounter', () => {
    const createDto = {
      patientId: 'patient-456',
      encounterDate: new Date('2023-12-15'),
      encounterType: 'INITIAL_ASSESSMENT' as any,
      clinicalData: { notes: 'Test notes' },
    };

    it('should create encounter successfully', async () => {
      encounterRepository.findPatientById.mockResolvedValue(true);
      encounterRepository.create.mockResolvedValue(mockEncounterData);

      const result = await service.createEncounter(createDto, mockProvider);

      expect(encounterRepository.create).toHaveBeenCalledWith(
        { ...createDto, providerId: mockProvider.id },
        mockProvider.id
      );
      expect(logger.log).toHaveBeenCalledWith('Encounter created successfully');
      expect(result).toEqual(mockEncounterData);
    });

    it('should throw error for future encounter date', async () => {
      encounterRepository.findPatientById.mockResolvedValue(true);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const futureDateDto = { ...createDto, encounterDate: futureDate };

      await expect(service.createEncounter(futureDateDto, mockProvider))
        .rejects.toThrow(AppError);
    });
  });

  describe('getEncounterById', () => {
    it('should retrieve encounter successfully', async () => {
      mockCacheService.get.mockResolvedValue(null);
      encounterRepository.findById.mockResolvedValue(mockEncounterData);

      const result = await service.getEncounterById('encounter-123', mockProvider);

      expect(encounterRepository.findById).toHaveBeenCalledWith('encounter-123');
      expect(logger.log).toHaveBeenCalledWith('Encounter retrieved successfully from database');
      expect(result).toEqual(mockEncounterData);
    });

    it('should throw not found error when encounter does not exist', async () => {
      encounterRepository.findById.mockResolvedValue(null);

      await expect(service.getEncounterById('nonexistent', mockProvider))
        .rejects.toThrow(AppError);
    });

    it('should return encounter from cache if available', async () => {
      mockCacheService.get.mockResolvedValue(mockEncounterData);

      const result = await service.getEncounterById('encounter-123', mockProvider);

      expect(result).toBeInstanceOf(EncounterEntity);
      expect(result.id).toBe(mockEncounterData.id);
      expect(result.patientId).toBe(mockEncounterData.patientId);
      expect(result.providerId).toBe(mockEncounterData.providerId);
      expect(mockCacheService.get).toHaveBeenCalledWith('encounter-123');
      expect(encounterRepository.findById).not.toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith('Encounter retrieved successfully from cache');
    });

    it('should throw unauthorized error for different provider', async () => {
      const otherProviderEncounter = { ...mockEncounterData, providerId: 'other-provider' };
      mockCacheService.get.mockResolvedValue(null);
      encounterRepository.findById.mockResolvedValue(otherProviderEncounter);

      await expect(service.getEncounterById('encounter-123', mockProvider))
        .rejects.toThrow(AppError);
    });
  });

  describe('getEncounters', () => {
    const mockResult = {
      encounters: [mockEncounterData],
      total: 1,
    };

    it('should return encounters from cache if available', async () => {
      const cacheKey = 'test-cache-key';
      const cachedResult = {
        encounters: [mockEncounterData],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      };

      mockCacheService.generateKey.mockReturnValue(cacheKey);
      mockCacheService.getList.mockResolvedValue(cachedResult);

      const result = await service.getEncounters({}, mockProvider);

      expect(result.encounters).toHaveLength(1);
      expect(result.encounters[0]).toBeInstanceOf(EncounterEntity);
      expect(result.encounters[0].id).toBe(mockEncounterData.id);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
      expect(mockCacheService.getList).toHaveBeenCalledWith(cacheKey);
      expect(encounterRepository.findMany).not.toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith('Retrieved 1 encounters from cache');
    });

    it('should retrieve encounters with default pagination', async () => {
      mockCacheService.generateKey.mockReturnValue('test-key');
      mockCacheService.getList.mockResolvedValue(null);
      encounterRepository.findMany.mockResolvedValue(mockResult);

      const result = await service.getEncounters({}, mockProvider);

      expect(result).toEqual({
        encounters: [mockEncounterData],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
      expect(logger.log).toHaveBeenCalledWith('Retrieved 1 encounters from database');
    });

    it('should throw error for invalid date range', async () => {
      const filters = {
        startDate: '2023-12-15',
        endDate: '2023-12-10',
      };

      await expect(service.getEncounters(filters, mockProvider))
        .rejects.toThrow(AppError);
    });
  });
});
