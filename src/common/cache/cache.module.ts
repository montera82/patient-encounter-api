import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const store = await redisStore({
          url: configService.get<string>('REDIS_URL'),
        });
        
        return {
          store,
          ttl: configService.get<number>('CACHE_TTL', 1800000),
          max: configService.get<number>('CACHE_MAX_ITEMS', 10000),
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
  exports: [CacheModule],
})
export class CacheConfigModule {}
