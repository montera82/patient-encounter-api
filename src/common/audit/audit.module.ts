import { Module } from '@nestjs/common';

import { AuditService } from './audit.service';
import { AuditRepository } from './repo/audit.repository';
import { AuditController } from './audit.controller';
import { LoggerModule } from '../logging/logger.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [LoggerModule, AuthModule, PrismaModule],
  providers: [AuditService, AuditRepository],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
