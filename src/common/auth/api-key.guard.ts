import { Injectable, CanActivate, ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma.service';
import { CacheService } from '../cache/cache.service';
import { AppError } from '../app-error';
import { AuthenticatedProvider } from '../types';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly CACHE_KEY = 'auth:providers';
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService
  ) {}

  canActivate(context: ExecutionContext): Promise<boolean> {
    return this.validateRequest(context);
  }

  private async validateRequest(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request.requestId || 'unknown';

    const apiKey = this.extractApiKey(request);
    if (!apiKey) {
      throw AppError.unauthorized('API key is required', 'No API key provided', { requestId }, requestId);
    }

    const provider = await this.validateApiKey(apiKey);
    if (!provider) {
      throw AppError.unauthorized('Invalid API key', 'Invalid API key provided', { requestId }, requestId);
    }

    request.provider = { id: provider.id, name: provider.name };
    request.authContext = {
      provider: request.provider,
      requestId,
      ipAddress: request.ip || 'unknown',
      userAgent: request.headers['user-agent'] || 'unknown',
    };

    return true;
  }

  private extractApiKey(request: Request): string | null {
    const apiKey = request.headers['x-api-key'];
    return typeof apiKey === 'string' ? apiKey : null;
  }

  private async validateApiKey(apiKey: string) {
    try {
      const providers = await this.getProviders();

      for (const provider of providers) {
        if (provider.apiKey && (await bcrypt.compare(apiKey, provider.apiKey))) {
          return provider;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private async getProviders() {
    const cached = await this.cache.getString(this.CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }

    const providers = await this.prisma.provider.findMany({
      where: { apiKey: { not: null } },
      select: { id: true, name: true, apiKey: true },
    });
    
    await this.cache.set(this.CACHE_KEY, JSON.stringify(providers), this.CACHE_TTL);
    return providers;
  }
}

export const CurrentProvider = createParamDecorator(
  (data: keyof AuthenticatedProvider | undefined, ctx: ExecutionContext): AuthenticatedProvider | any => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.provider?.[data] : request.provider;
  }
);
