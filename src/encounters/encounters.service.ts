import { Injectable } from '@nestjs/common';
import { LoggerService } from '../common/logging/logger.service';
import { CacheService } from '../common/cache/cache.service';
import { EncounterRepository } from './encounter.repository';
import { EncounterEntity } from './domain/encounter.entity';
import { CreateEncounterDto } from './domain/encounter.schemas';
import { AuthenticatedProvider } from '../common/types';
import { AppError } from '../common/app-error';

@Injectable()
export class EncountersService {
  constructor(
    private readonly encounterRepository: EncounterRepository,
    private readonly logger: LoggerService,
    private readonly cacheService: CacheService
  ) {}

  async createEncounter(
    createEncounterDto: CreateEncounterDto,
    provider: AuthenticatedProvider,
    idempotencyKey?: string
  ): Promise<EncounterEntity> {
    if (idempotencyKey) {
      const idempotencyCacheKey = `idempotency:${idempotencyKey}`;
      const existingEncounterId = await this.cacheService.getString(idempotencyCacheKey);
      if (existingEncounterId) {
        const existingEncounter = await this.encounterRepository.findById(existingEncounterId);
        if (existingEncounter) {
          this.logger.log('Returning existing encounter for idempotency key');
          return existingEncounter;
        }
        await this.cacheService.del(idempotencyCacheKey);
      }
    }

    await this.validateEncounterCreation(createEncounterDto);

    const encounterData = {
      ...createEncounterDto,
      providerId: provider.id,
    };

    const encounter = await this.encounterRepository.create(encounterData, provider.id);

    if (idempotencyKey) {
      const idempotencyCacheKey = `idempotency:${idempotencyKey}`;
      await this.cacheService.set(idempotencyCacheKey, encounter.id, 86400);
    }

    await this.cacheService.cache(encounter);

    this.logger.log(`Encounter created successfully`);

    return encounter;
  }

  async getEncounterById(
    encounterId: string,
    provider: AuthenticatedProvider
  ): Promise<EncounterEntity> {
    const cachedEncounter = await this.cacheService.get(encounterId);
    
    if (cachedEncounter) {
      // Convert cached plain object back to EncounterEntity instance
      const encounter = new EncounterEntity(cachedEncounter as any);
      await this.validateEncounterAccess(encounter, provider);
      this.logger.log(`Encounter retrieved successfully from cache`);
      return encounter;
    }

    const encounter = await this.encounterRepository.findById(encounterId);

    if (!encounter) {
      throw AppError.notFound(
        'Encounter not found',
        `Encounter with ID ${encounterId} does not exist`
      );
    }

    await this.validateEncounterAccess(encounter, provider);

    await this.cacheService.cache(encounter);

    this.logger.log(`Encounter retrieved successfully from database`);

    return encounter;
  }

  async getEncounters(
    filters: {
      patientId?: string;
      providerId?: string;
      startDate?: string;
      endDate?: string;
      encounterType?: string;
      page?: number;
      limit?: number;
    },
    provider: AuthenticatedProvider
  ): Promise<{ encounters: EncounterEntity[]; total: number; page: number; limit: number; totalPages: number }> {
    const parsedFilters = {
      ...filters,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      providerId: provider.id,
    };

    if (parsedFilters.startDate && parsedFilters.endDate) {
      if (parsedFilters.startDate > parsedFilters.endDate) {
        throw AppError.badRequest(
          'Start date cannot be after end date',
          'Invalid date range provided'
        );
      }
    }

    const cacheKey = this.cacheService.generateKey({
      ...filters,
      providerId: parsedFilters.providerId
    });

    const cachedResult = await this.cacheService.getList(cacheKey);
    
    if (cachedResult) {
      // Convert cached plain objects back to EncounterEntity instances
      const encounters = cachedResult.encounters.map(e => new EncounterEntity(e as any));
      this.logger.log(`Retrieved ${encounters.length} encounters from cache`);
      return {
        ...cachedResult,
        encounters
      };
    }

    const result = await this.encounterRepository.findMany(parsedFilters);

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const totalPages = Math.ceil(result.total / limit);

    const responseData = {
      encounters: result.encounters,
      total: result.total,
      page,
      limit,
      totalPages,
    };

    await this.cacheService.cacheList(cacheKey, responseData);

    this.logger.log(`Retrieved ${result.encounters.length} encounters from database`);

    return responseData;
  }

  private async validateEncounterCreation(
    createEncounterDto: CreateEncounterDto
  ): Promise<void> {
    const now = new Date();
    if (createEncounterDto.encounterDate > now) {
      throw AppError.badRequest(
        'Encounter date cannot be in the future',
        'Encounter date validation failed'
      );
    }

    // Validate patient exists
    const patient = await this.encounterRepository.findPatientById(createEncounterDto.patientId);
    if (!patient) {
      throw AppError.badRequest(
        'Patient not found',
        `Patient with ID ${createEncounterDto.patientId} does not exist`
      );
    }
  }

  private async validateEncounterAccess(
    encounter: EncounterEntity,
    provider: AuthenticatedProvider
  ): Promise<void> {

    if (encounter.providerId !== provider.id) {
      throw AppError.unauthorized(
        'You do not have permission to access this encounter',
        `Provider ${provider.id} attempted to access encounter ${encounter.id} owned by provider ${encounter.providerId}`
      );
    }
  }
}
