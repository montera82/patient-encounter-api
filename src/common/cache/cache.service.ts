import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { EncounterEntity } from '../../encounters/domain/encounter.entity';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async cache(encounter: EncounterEntity): Promise<void> {
    const key = `encounter:${encounter.id}`;
    await this.cacheManager.set(key, encounter);
  }

  async get(encounterId: string): Promise<EncounterEntity | null> {
    const key = `encounter:${encounterId}`;
    return await this.cacheManager.get<EncounterEntity>(key) || null;
  }

  async cacheList(
    key: string,
    data: { encounters: EncounterEntity[]; total: number; page: number; limit: number; totalPages: number },
    ttl: number = 300
  ): Promise<void> {
    await this.cacheManager.set(key, data, ttl);
  }

  async getList(
    key: string
  ): Promise<{ encounters: EncounterEntity[]; total: number; page: number; limit: number; totalPages: number } | null> {
    return await this.cacheManager.get(key) || null;
  }

  generateKey(filters: {
    patientId?: string;
    providerId: string;
    startDate?: string;
    endDate?: string;
    encounterType?: string;
    page?: number;
    limit?: number;
  }): string {
    const normalizedFilters = {
      ...filters,
      page: filters.page || 1,
      limit: filters.limit || 50
    };
    
    const keyParts = Object.entries(normalizedFilters)
      .filter(([_, value]) => value !== undefined && value !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    
    return `encounters:list:${keyParts}`;
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async getString(key: string): Promise<string | null> {
    return await this.cacheManager.get<string>(key) || null;
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }
}
