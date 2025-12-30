import { Injectable, LoggerService as NestLoggerService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';
import { SafeLogContext } from '../types';
import { RequestContextService } from './request-context.service';

const BLOCKED_FIELDS = new Set([
  'patientid',
  'patient_id',
  'providerid',
  'provider_id',
  'encounterid',
  'encounter_id',
  'userid',
  'user_id',
  'clinicaldata',
  'notes',
  'assessment',
  'observations',
]);
@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly winston: WinstonLogger) {}

  log(message: string, context?: SafeLogContext): void {
    this.winston.info(message, this.sanitize(context));
  }

  info(message: string, context?: SafeLogContext): void {
    this.winston.info(message, this.sanitize(context));
  }

  error(message: string, error?: Error, context?: SafeLogContext): void {
    const safeContext = this.sanitize(context);
    if (error) {
      safeContext.errorName = error.name;
    }
    this.winston.error(message, safeContext);
  }

  warn(message: string, context?: SafeLogContext): void {
    this.winston.warn(message, this.sanitize(context));
  }

  private sanitize(context?: SafeLogContext): Record<string, unknown> {
    if (!context) {
      context = {};
    }

    if (!context.requestId) {
      const requestId = RequestContextService.getRequestId();
      if (requestId) {
        context.requestId = requestId;
      }
    }

    const safe: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();

      if (BLOCKED_FIELDS.has(lowerKey)) {
        safe[key] = '[REDACTED - PHI]';
        continue;
      }

      safe[key] = value;
    }

    return safe;
  }
}
