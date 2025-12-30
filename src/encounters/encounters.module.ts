import { Module } from '@nestjs/common';

import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';
import { EncounterRepository } from './encounter.repository';
import { LoggerModule } from '../common/logging/logger.module';
import { AuditModule } from '../common/audit/audit.module';
import { AuditInterceptor } from '../common/logging/audit.interceptor';
import { CacheService } from '../common/cache/cache.service';

@Module({
  imports: [LoggerModule, AuditModule],
  controllers: [EncountersController],
  providers: [EncountersService, EncounterRepository, AuditInterceptor, CacheService],
  exports: [EncountersService, EncounterRepository],
})
export class EncountersModule {}
