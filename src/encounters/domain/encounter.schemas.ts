import { z } from 'zod';
import { EncounterType } from '@prisma/client';

export const ClinicalDataSchema = z.object({
  notes: z.string().optional(),
  observations: z.string().optional(),
  assessment: z.string().optional(),
});

export const CreateEncounterSchema = z.object({
  patientId: z.string().uuid('Patient ID must be a valid UUID'),
  encounterDate: z
    .string()
    .datetime('Encounter date must be a valid ISO date')
    .transform((date) => new Date(date)),
  encounterType: z.nativeEnum(EncounterType, {
    errorMap: () => ({
      message: `Encounter type must be one of: ${Object.values(EncounterType).join(', ')}`,
    }),
  }),
  clinicalData: ClinicalDataSchema,
});

export const IdempotencyKeySchema = z.string().min(1).max(255).optional();

export type ClinicalData = z.infer<typeof ClinicalDataSchema>;
export type CreateEncounterDto = z.infer<typeof CreateEncounterSchema>;
