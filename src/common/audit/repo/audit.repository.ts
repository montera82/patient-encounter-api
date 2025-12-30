import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma.service';
import { AppError } from '../../app-error';
import { CreateAuditLogData, AuditQueryParams } from '../../types';
import { AuditLogEntity } from '../domain/audit-log.entity';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAuditLogData): Promise<AuditLogEntity> {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          resourcePath: data.resourcePath,
          method: data.method,
          providerId: data.providerId,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          requestId: data.requestId || null,
          requestData: data.requestData || null,
          responseData: data.responseData || null,
          action: data.action || null,
          resourceType: data.resourceType || null,
          resourceId: data.resourceId || null,
          fieldsAccessed: data.fieldsAccessed || [],
          timestamp: new Date(),
        },
      });

      return new AuditLogEntity(auditLog);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async findMany(params: AuditQueryParams): Promise<{
    auditLogs: AuditLogEntity[];
    total: number;
  }> {
    const { startDate, endDate, providerId, resourcePath, method, page = 1, limit = 50 } = params;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const where: Record<string, unknown> & {
      timestamp?: { gte?: Date; lte?: Date };
    } = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    if (providerId) {
      where.providerId = providerId;
    }
    if (resourcePath) {
      where.resourcePath = { contains: resourcePath, mode: 'insensitive' };
    }
    if (method) {
      where.method = method;
    }

    try {
      const [auditLogs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip,
          take,
          select: {
            id: true,
            resourcePath: true,
            method: true,
            providerId: true,
            ipAddress: true,
            userAgent: true,
            requestId: true,
            requestData: true,
            responseData: true,
            action: true,
            resourceType: true,
            resourceId: true,
            fieldsAccessed: true,
            timestamp: true,
          },
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      return {
        auditLogs: auditLogs.map((log) => new AuditLogEntity(log)),
        total,
      };
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  private handleDatabaseError(error: Error & { code?: string; meta?: Record<string, unknown> }): never {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      throw AppError.conflict(
        `A record with this ${field} already exists`,
        'Unique constraint violation'
      );
    }

    if (error.code === 'P2003') {
      const constraintField = (error.meta?.field_name as string) || '';

      if (constraintField.includes('provider_id_fkey')) {
        throw AppError.badRequest(
          'The specified provider does not exist. Please verify the provider ID is correct.',
          'Provider not found'
        );
      }

      throw AppError.badRequest(
        'The referenced record does not exist. Please verify all IDs are correct.',
        'Foreign key constraint violation'
      );
    }

    if (error.code === 'P2025') {
      throw AppError.notFound('Audit record not found', 'Database record not found');
    }

    throw AppError.internal(
      'A database error occurred while processing your request',
      error.message || 'Database operation failed'
    );
  }
}
