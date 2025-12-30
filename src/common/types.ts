import { z } from 'zod';
import { JsonValue } from '@prisma/client/runtime/library';

export interface AuthenticatedProvider {
  id: string;
  name: string;
}

export interface AuthContext {
  provider: AuthenticatedProvider;
  requestId: string;
  ipAddress: string;
  userAgent: string;
}

export interface CreateAuditLogData {
  resourcePath: string;
  method: string;
  providerId: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  requestData?: JsonValue;
  responseData?: JsonValue;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  fieldsAccessed?: string[];
}

export interface AuditQueryParams {
  startDate?: string;
  endDate?: string;
  providerId?: string;
  resourcePath?: string;
  method?: string;
  page?: number;
  limit?: number;
}

export interface SafeLogContext {
  requestId?: string;
  operation?: string;
  resource?: string;
  duration?: number;
  statusCode?: number;
  success?: boolean;
  errorCode?: string;
  [key: string]: unknown;
}

export interface RequestContext {
  requestId: string;
  providerId?: string;
  timestamp?: Date;
}

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_PREFIX: z.string().default('api/v1'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  API_KEY_SALT_ROUNDS: z.string().transform(Number).default('10'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  RATE_LIMIT_TTL: z.string().transform(Number).default('60'),
  RATE_LIMIT_LIMIT: z.string().transform(Number).default('100'),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const AUDIT_PATTERNS = {
  AUDITABLE: [/\/encounters/],
  SKIP: [/\/docs/],
} as const;

declare module 'express' {
  interface Request {
    provider?: AuthenticatedProvider;
    requestId?: string;
    authContext?: AuthContext;
  }
}
