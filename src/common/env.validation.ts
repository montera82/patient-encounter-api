import { z } from 'zod';
import { envSchema, EnvConfig } from './types';

export function envValidation(config: Record<string, unknown>): EnvConfig {
  try {
    return envSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Environment validation failed: ${errorMessages}`);
    }
    throw error;
  }
}

export { envSchema, EnvConfig } from './types';
