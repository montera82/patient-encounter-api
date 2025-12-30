import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { envValidation } from './common/env.validation';
import { PrismaModule } from './common/prisma.module';
import { CacheConfigModule } from './common/cache/cache.module';
import { LoggerModule } from './common/logging/logger.module';
import { AuthModule } from './common/auth/auth.module';
import { EncountersModule } from './encounters/encounters.module';
import { AuditModule } from './common/audit/audit.module';
import { ApiKeyGuard } from './common/auth/api-key.guard';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { RequestIdInterceptor } from './common/logging/request-id.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: envValidation,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    CacheConfigModule,
    LoggerModule,
    AuthModule,
    EncountersModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestIdInterceptor,
    },
  ],
})
export class AppModule {}
