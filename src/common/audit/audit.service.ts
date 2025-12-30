import { Injectable } from '@nestjs/common';

import { LoggerService } from '../logging/logger.service';
import { CreateAuditLogData, AuditQueryParams } from '../types';
import { AuditRepository } from './repo/audit.repository';

@Injectable()
export class AuditService {
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly logger: LoggerService
  ) {}

  async createAuditLog(data: CreateAuditLogData): Promise<void> {
    try {
      await this.auditRepository.create(data);
    } catch (error) {
      this.logger.error('Audit log creation failed', error, {
        requestId: data.requestId,
        operation: 'audit.createAuditLog',
        resource: 'auditLog',
        success: false,
      });
    }
  }

  async queryAuditLogs(params: AuditQueryParams) {
    try {
      const { auditLogs, total } = await this.auditRepository.findMany(params);

      return {
        data: auditLogs,
        meta: {
          total,
          page: params.page || 1,
          limit: params.limit || 50,
          totalPages: Math.ceil(total / (params.limit || 50)),
        },
      };
    } catch (error) {
      this.logger.error('Failed to query audit logs', error);
      throw new Error('Failed to retrieve audit logs');
    }
  }
}
