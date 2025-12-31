/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { JsonValue } from '@prisma/client/runtime/library';

import { LoggerService } from '../logging/logger.service';
import { AuditService } from '../audit/audit.service';
import { RequestContextService } from '../logging/request-context.service';
import { AUDIT_PATTERNS } from '../types';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly logger: LoggerService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const startTime = Date.now();
    const requestId = request.headers['x-request-id'] as string;
    const provider = request.provider as { id?: string; name?: string } | undefined;

    if (provider?.id) {
      const currentContext = RequestContextService.getContext();
      if (currentContext) {
        RequestContextService.setContext({
          ...currentContext,
          providerId: provider.id,
        });
      }
    }

    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;
    return next.handle().pipe(
      mergeMap(async (data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        await this.createAuditLog(
          request,
          response,
          provider,
          requestId,
          request.method,
          statusCode,
          duration,
          undefined,
          data
        );

        this.logger.info('Request completed successfully', {
          operation: `${className}.${methodName}`,
          resourcePath: request.url,
          duration,
          statusCode,
        });

        return data;
      }),
      catchError((error) => {
        return from((async () => {
          const duration = Date.now() - startTime;
          const statusCode = error.httpStatus || error.status || 500;

          await this.createAuditLog(
            request,
            response,
            provider,
            requestId,
            request.method,
            statusCode,
            duration,
            error
          );

          this.logger.info('Request failed', {
            operation: `${className}.${methodName}`,
            resourcePath: request.url,
            success: false,
            duration,
            statusCode,
            errorCode: error.code,
            errorMessage: error.message,
          });

          throw error;
        })());
      })
    );
  }

  private async createAuditLog(
    request: Request,
    response: Response,
    provider: Record<string, unknown>,
    requestId: string,
    method: string,
    statusCode: number,
    duration: number,
    error?: Record<string, unknown>,
    responseData?: unknown
  ) {
    try {
    
      if (!provider?.id || !this.shouldAudit(request.url)) {
        return;
      }

      const auditMetadata = this.extractAuditMetadata(request, responseData);

      const requestData = {
        duration,
        timestamp: new Date().toISOString(),
        queryParams: request.query || {},
        pathParams: request.params || {},
        headers: {
          userAgent: request.get('User-Agent'),
          contentType: request.get('Content-Type'),
          accept: request.get('Accept'),
        },
        ...(request.body && Object.keys(request.body).length > 0 && {
          bodyParams: this.sanitizeRequestBody(request.body),
        }),
        ...(error && {
          errorName: error.name,
          errorCode: error.code,
        }),
      };

      const responseMetadata = {
        statusCode,
        duration,
        ...(responseData && statusCode >= 200 && statusCode < 300 && {
          recordCount: this.extractRecordCount(responseData),
        }),
      };

      await this.auditService.createAuditLog({
        resourcePath: request.url,
        method,
        ipAddress: request.ip || request.connection.remoteAddress,
        userAgent: request.get('User-Agent'),
        providerId: provider.id as string,
        requestId,
        requestData: requestData as JsonValue,
        responseData: responseMetadata,
        action: auditMetadata.action,
        resourceType: auditMetadata.resourceType,
        resourceId: auditMetadata.resourceId,
        fieldsAccessed: auditMetadata.fieldsAccessed,
      });
    } catch (auditError) {

      this.logger.error('Audit log creation failed', auditError, {
        requestId,
        operation: 'audit.createAuditLog',
        resource: 'auditLog',
        success: false,
      });
    }
  }

  private extractAuditMetadata(request: Request, responseData?: unknown) {
    const url = request.url;
    const method = request.method;
    
    const encounterSingleMatch = url.match(/\/encounters\/([a-f0-9-]+)$/);
    const encounterCollectionMatch = url.match(/\/encounters(?:\?.*)?$/);
    
    if (encounterSingleMatch) {
      return {
        action: method === 'GET' ? 'READ' : method.toUpperCase(),
        resourceType: 'ENCOUNTER',
        resourceId: encounterSingleMatch[1],
        fieldsAccessed: this.extractFieldsFromResponse(responseData),
      };
    }
    
    if (encounterCollectionMatch) {
      return {
        action: method === 'GET' ? 'read' : method.toUpperCase(),
        resourceType: 'ENCOUNTER',
        resourceId: null,
        fieldsAccessed: this.extractFieldsFromResponse(responseData, true),
      };
    }
    
    return {
      action: method.toLowerCase(),
      resourceType: null,
      resourceId: null,
      fieldsAccessed: [],
    };
  }

  private extractFieldsFromResponse(responseData: unknown, isCollection = false): string[] {
    if (!responseData) {return [];}
    
    try {
      if (isCollection && typeof responseData === 'object' && responseData !== null) {
        const data = responseData as any;
        if (data.encounters && Array.isArray(data.encounters) && data.encounters.length > 0) {
          return Object.keys(data.encounters[0]).filter(key => !key.startsWith('_'));
        }
        // Check if it's a paginated response with meta
        if (data.meta && data.encounters) {
          return Object.keys(data.encounters[0] || {}).filter(key => !key.startsWith('_'));
        }
      } else if (typeof responseData === 'object' && responseData !== null) {
        // For single objects, extract all keys
        return Object.keys(responseData as any).filter(key => !key.startsWith('_'));
      }
    } catch (error) {
      // Log the error for debugging but continue
      this.logger.warn('Failed to extract fields from response');
    }
    
    return [];
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {return body;}
    
    const sanitized = { ...body };
    
    // Redact sensitive PHI fields but keep structure for audit
    const sensitiveFields = ['patientId', 'medicalRecordNumber', 'dateOfBirth', 'clinicalData'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED - PHI]';
      }
    }
    
    // For clinical data, show structure but redact content
    if (body.clinicalData && typeof body.clinicalData === 'object') {
      sanitized.clinicalData = {
        structure: Object.keys(body.clinicalData),
        content: '[REDACTED - PHI]'
      };
    }
    
    return sanitized;
  }

  private extractRecordCount(responseData: unknown): number {
    if (!responseData || typeof responseData !== 'object') {return 0;}
    
    const data = responseData as any;
    
    // For paginated responses
    if (data.meta && typeof data.meta.total === 'number') {
      return data.meta.total;
    }
    
    // For collection responses
    if (data.encounters && Array.isArray(data.encounters)) {
      return data.encounters.length;
    }
    
    // For single record responses
    if (data.id) {
      return 1;
    }
    
    return 0;
  }

  private shouldAudit(url: string): boolean {
    if (AUDIT_PATTERNS.SKIP.some((pattern) => pattern.test(url))) {
      return false;
    }

    return AUDIT_PATTERNS.AUDITABLE.some((pattern) => pattern.test(url));
  }
}
