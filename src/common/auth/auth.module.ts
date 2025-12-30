import { Module } from '@nestjs/common';

import { ApiKeyGuard } from './api-key.guard';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ApiKeyGuard],
  exports: [ApiKeyGuard],
})
export class AuthModule {}
