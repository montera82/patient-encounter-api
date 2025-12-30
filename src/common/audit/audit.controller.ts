import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiSecurity } from '@nestjs/swagger';

import { AuditService } from './audit.service';
import { AuditQueryParams } from '../types';
import { ApiKeyGuard } from '../auth/api-key.guard';

@ApiTags('audit')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('audit/encounters')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Query audit logs',
    description:
      'Retrieve audit logs with optional filtering and pagination for compliance tracking',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter from date (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter to date (ISO format)',
  })
  @ApiQuery({
    name: 'providerId',
    required: false,
    type: String,
    description: 'Filter by provider ID',
  })
  @ApiQuery({
    name: 'resourcePath',
    required: false,
    type: String,
    description: 'Filter by resource path (e.g., /api/v1/encounters)',
  })
  @ApiQuery({
    name: 'method',
    required: false,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    description: 'Filter by HTTP method',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Records per page (default: 50, max: 1000)',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              resourcePath: { type: 'string' },
              method: { type: 'string' },
              providerId: { type: 'string' },
              ipAddress: { type: 'string' },
              userAgent: { type: 'string' },
              requestId: { type: 'string' },
              requestData: { type: 'object' },
              responseData: { type: 'object' },
              timestamp: { type: 'string' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async queryAuditLogs(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('providerId') providerId?: string,
    @Query('resource') resource?: string,
    @Query('resourcePath') resourcePath?: string,
    @Query('method') method?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const queryParams: AuditQueryParams = {
      startDate,
      endDate,
      providerId,
      resourcePath,
      method,
      page: page ? parseInt(page, 10) : 1,
      limit: Math.min(limit ? parseInt(limit, 10) : 50, 1000),
    };

    return this.auditService.queryAuditLogs(queryParams);
  }
}
