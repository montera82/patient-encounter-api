import { Module } from '@nestjs/common';

import { ApiKeyGuard } from './api-key.guard';
import { PrismaModule } from '../prisma.module';
import { CacheConfigModule } from '../cache/cache.module';

@Module({
  imports: [PrismaModule, CacheConfigModule],
  providers: [ApiKeyGuard],
  exports: [ApiKeyGuard],
})
export class AuthModule {}
