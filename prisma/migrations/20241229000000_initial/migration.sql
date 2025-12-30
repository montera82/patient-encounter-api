-- CreateEnum
CREATE TYPE "EncounterType" AS ENUM ('INITIAL_ASSESSMENT', 'FOLLOW_UP', 'TREATMENT_SESSION');

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "medical_record_number" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "encounter_date" TIMESTAMP(3) NOT NULL,
    "encounter_type" "EncounterType" NOT NULL,
    "clinical_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "resource_path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "request_data" JSONB,
    "response_data" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider_id" TEXT NOT NULL,
    "action" TEXT,
    "fields_accessed" TEXT[],
    "resource_id" TEXT,
    "resource_type" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_medical_record_number_key" ON "patients"("medical_record_number");

-- CreateIndex
CREATE INDEX "encounters_patient_id_idx" ON "encounters"("patient_id");

-- CreateIndex
CREATE INDEX "encounters_provider_id_idx" ON "encounters"("provider_id");

-- CreateIndex
CREATE INDEX "encounters_encounter_date_idx" ON "encounters"("encounter_date");

-- CreateIndex
CREATE INDEX "encounters_encounter_type_idx" ON "encounters"("encounter_type");

-- CreateIndex
CREATE INDEX "audit_logs_provider_id_idx" ON "audit_logs"("provider_id");

-- CreateIndex
CREATE INDEX "audit_logs_resource_path_idx" ON "audit_logs"("resource_path");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_method_idx" ON "audit_logs"("method");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_idx" ON "audit_logs"("resource_type");

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
