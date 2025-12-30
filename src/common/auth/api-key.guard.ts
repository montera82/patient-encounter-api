import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma.service';
import { AppError } from '../app-error';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

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
      const providers = await this.prisma.provider.findMany({
        where: { apiKey: { not: null } },
      });

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
}
