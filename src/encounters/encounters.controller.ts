import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus, UseInterceptors, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiParam, ApiQuery, ApiHeader } from '@nestjs/swagger';

import { EncountersService } from './encounters.service';
import { CurrentProvider } from '../common/auth/api-key.guard';
import { AuthenticatedProvider } from '../common/types';
import { createZodPipe } from '../common/zod.pipe';
import { LoggerService } from '../common/logging/logger.service';
import { AuditInterceptor } from '../common/logging/audit.interceptor';
import { CreateEncounterSchema, CreateEncounterDto, IdempotencyKeySchema } from './domain/encounter.schemas';

@ApiTags('encounters')
@ApiSecurity('api-key')
@UseInterceptors(AuditInterceptor)
@Controller('encounters')
export class EncountersController {
  constructor(
    private readonly encountersService: EncountersService,
    private readonly logger: LoggerService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new patient encounter',
    description:
      'Creates a new encounter record with clinical data. Requires valid patient ID and clinical information. Supports idempotency via Idempotency-Key header.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Optional idempotency key to prevent duplicate encounter creation',
    required: false,
    schema: { type: 'string', maxLength: 255 },
  })
  @ApiResponse({
    status: 201,
    description: 'Encounter created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        patientId: { type: 'string', format: 'uuid' },
        providerId: { type: 'string', format: 'uuid' },
        encounterDate: { type: 'string', format: 'date-time' },
        encounterType: {
          type: 'string',
          enum: ['INITIAL_ASSESSMENT', 'FOLLOW_UP', 'TREATMENT_SESSION'],
        },
        clinicalData: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    schema: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async createEncounter(
    @Body(createZodPipe(CreateEncounterSchema)) createEncounterDto: CreateEncounterDto,
    @CurrentProvider() provider: AuthenticatedProvider,
    @Headers('idempotency-key') idempotencyKey?: string
  ) {
    if (idempotencyKey) {
      const validatedKey = IdempotencyKeySchema.parse(idempotencyKey);
      if (!validatedKey) {
        throw new Error('Invalid idempotency key format');
      }
    }

    this.logger.info('Creating new encounter', {
      encounterType: createEncounterDto.encounterType,
    });

    const encounter = await this.encountersService.createEncounter(
      createEncounterDto, 
      provider,
      idempotencyKey
    );

    return encounter.toResponse();
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get encounters with filtering',
    description:
      'Retrieve encounters with optional filtering by date range, patient, provider, and encounter type. Supports pagination.',
  })
  @ApiQuery({
    name: 'patientId',
    required: false,
    description: 'Filter by patient ID',
    type: 'string',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter encounters from this date (ISO format)',
    type: 'string',
    example: '2023-12-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter encounters to this date (ISO format)',
    type: 'string',
    example: '2023-12-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'encounterType',
    required: false,
    description: 'Filter by encounter type',
    enum: ['INITIAL_ASSESSMENT', 'FOLLOW_UP', 'TREATMENT_SESSION'],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination (default: 1)',
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records per page (default: 50, max: 100)',
    type: 'number',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Encounters retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        encounters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              patientId: { type: 'string', format: 'uuid' },
              providerId: { type: 'string', format: 'uuid' },
              encounterDate: { type: 'string', format: 'date-time' },
              encounterType: {
                type: 'string',
                enum: ['INITIAL_ASSESSMENT', 'FOLLOW_UP', 'TREATMENT_SESSION'],
              },
              clinicalData: { type: 'object' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              createdBy: { type: 'string', format: 'uuid' },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async getEncounters(
    @CurrentProvider() provider: AuthenticatedProvider,
    @Query('patientId') patientId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('encounterType') encounterType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const filters = {
      patientId,
      startDate,
      endDate,
      encounterType,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    this.logger.info('Retrieving encounters with filters', {
      operation: 'getEncounters',
    });

    const result = await this.encountersService.getEncounters(filters, provider);

    return {
      encounters: result.encounters.map((encounter) => encounter.toResponse()),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Get(':encounterId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a specific encounter by ID',
    description:
      'Retrieve a specific encounter record by its unique identifier. Only accessible by the provider who created it.',
  })
  @ApiParam({
    name: 'encounterId',
    description: 'Unique identifier for the encounter',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Encounter retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        patientId: { type: 'string', format: 'uuid' },
        providerId: { type: 'string', format: 'uuid' },
        encounterDate: { type: 'string', format: 'date-time' },
        encounterType: {
          type: 'string',
          enum: ['INITIAL_ASSESSMENT', 'FOLLOW_UP', 'TREATMENT_SESSION'],
        },
        clinicalData: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        createdBy: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Encounter not found',
    schema: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async getEncounterById(
    @Param('encounterId') encounterId: string,
    @CurrentProvider() provider: AuthenticatedProvider
  ) {
    this.logger.info('Retrieving encounter by ID', {
      operation: 'getEncounter',
    });

    const encounter = await this.encountersService.getEncounterById(encounterId, provider);

    return encounter.toResponse();
  }
}
