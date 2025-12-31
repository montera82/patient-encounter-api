import { Injectable } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';
import { CreateEncounterDto } from './domain/encounter.schemas';
import { EncounterEntity } from './domain/encounter.entity';
import { AppError } from '../common/app-error';

@Injectable()
export class EncounterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEncounterDto & { providerId: string }, createdBy: string): Promise<EncounterEntity> {
    try {
      const encounter = await this.prisma.encounter.create({
        data: {
          patientId: data.patientId,
          providerId: data.providerId,
          encounterDate: data.encounterDate,
          encounterType: data.encounterType,
          clinicalData: data.clinicalData,
          createdBy: createdBy,
        },
      });

      return new EncounterEntity(encounter);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async findById(id: string): Promise<EncounterEntity | null> {
    try {
      const encounter = await this.prisma.encounter.findUnique({
        where: {
          id,
        },
      });

      if (!encounter) {
        return null;
      }

      return new EncounterEntity(encounter);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async findPatientById(patientId: string): Promise<boolean> {
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
      });
      return !!patient;
    } catch (error) {
      return false;
    }
  }

  async findMany(filters: {
    patientId?: string;
    providerId?: string;
    startDate?: Date;
    endDate?: Date;
    encounterType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ encounters: EncounterEntity[]; total: number }> {
    try {
      const {
        patientId,
        providerId,
        startDate,
        endDate,
        encounterType,
        page = 1,
        limit = 50,
      } = filters;

      const skip = (page - 1) * limit;
      const take = Math.min(limit, 100);

      const where: Record<string, unknown> & {
        encounterDate?: { gte?: Date; lte?: Date };
      } = {};

      if (patientId) {
        where.patientId = patientId;
      }

      if (providerId) {
        where.providerId = providerId;
      }

      if (encounterType) {
        where.encounterType = encounterType;
      }

      if (startDate || endDate) {
        where.encounterDate = {};
        if (startDate) {
          where.encounterDate.gte = startDate;
        }
        if (endDate) {
          where.encounterDate.lte = endDate;
        }
      }

      const [encounters, total] = await Promise.all([
        this.prisma.encounter.findMany({
          where,
          orderBy: { encounterDate: 'desc' },
          skip,
          take,
        }),
        this.prisma.encounter.count({ where }),
      ]);

      return {
        encounters: encounters.map((encounter) => new EncounterEntity(encounter)),
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

      if (constraintField.includes('patient_id_fkey')) {
        throw AppError.badRequest(
          'The specified patient does not exist. Please verify the patient ID is correct.',
          'Patient not found'
        );
      }

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
      throw AppError.notFound('Record not found', 'Database record not found');
    }

    throw AppError.internal(
      'A database error occurred while processing your request',
      error.message || 'Database operation failed'
    );
  }
}
