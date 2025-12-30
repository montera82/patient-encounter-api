import { Encounter, Provider, Patient } from '@prisma/client';
import { ClinicalData } from './encounter.schemas';

export class EncounterEntity {
  id: string;
  patientId: string;
  providerId: string;
  encounterDate: Date;
  encounterType: string;
  clinicalData: ClinicalData;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;

  patient?: Patient;
  provider?: Provider;

  constructor(encounter: Encounter & { patient?: Patient; provider?: Provider }) {
    this.id = encounter.id;
    this.patientId = encounter.patientId;
    this.providerId = encounter.providerId;
    this.encounterDate = encounter.encounterDate;
    this.encounterType = encounter.encounterType;
    this.clinicalData = encounter.clinicalData as ClinicalData;
    this.createdAt = encounter.createdAt;
    this.updatedAt = encounter.updatedAt;
    this.createdBy = encounter.createdBy;
    this.patient = encounter.patient;
    this.provider = encounter.provider;
  }

  toResponse(): Record<string, unknown> {
    return {
      id: this.id,
      patientId: this.patientId,
      providerId: this.providerId,
      encounterDate: this.encounterDate,
      encounterType: this.encounterType,
      clinicalData: this.clinicalData,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
    };
  }
}
