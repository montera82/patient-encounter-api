import { CreateEncounterSchema, ClinicalDataSchema } from './encounter.schemas';
import { EncounterType } from '@prisma/client';

describe('Encounter Schemas', () => {
  describe('ClinicalDataSchema', () => {
    it('accepts valid data', () => {
      const result = ClinicalDataSchema.safeParse({
        notes: 'Patient presents with chest pain',
        observations: 'BP: 120/80, HR: 72',
        assessment: 'Possible anxiety-related chest pain',
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty data', () => {
      const result = ClinicalDataSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects non-string values', () => {
      const result = ClinicalDataSchema.safeParse({
        notes: 123,
        observations: true,
        assessment: null,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CreateEncounterSchema', () => {
    const validEncounter = {
      patientId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      encounterDate: '2024-12-29T10:30:00.000Z',
      encounterType: EncounterType.INITIAL_ASSESSMENT,
      clinicalData: { notes: 'Patient consultation' },
    };

    it('accepts valid encounter data', () => {
      const result = CreateEncounterSchema.safeParse(validEncounter);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.encounterDate).toBeInstanceOf(Date);
      }
    });

    it('rejects invalid UUID', () => {
      const result = CreateEncounterSchema.safeParse({
        ...validEncounter,
        patientId: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid date', () => {
      const result = CreateEncounterSchema.safeParse({
        ...validEncounter,
        encounterDate: 'invalid-date',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid encounter type', () => {
      const result = CreateEncounterSchema.safeParse({
        ...validEncounter,
        encounterType: 'INVALID_TYPE',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing required fields', () => {
      const result = CreateEncounterSchema.safeParse({
        patientId: validEncounter.patientId,
      });
      expect(result.success).toBe(false);
    });
  });
});
