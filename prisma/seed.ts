import { PrismaClient, EncounterType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { config } from 'dotenv';

// Load environment variables from .env.docker
config({ path: '.env.docker' });

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Validate required environment variables
  const requiredEnvVars = [
    'SEED_PROVIDER1_ID',
    'SEED_PROVIDER1_NAME', 
    'SEED_PROVIDER1_API_KEY',
    'SEED_PROVIDER2_ID',
    'SEED_PROVIDER2_NAME',
    'SEED_PROVIDER2_API_KEY',
    'SEED_PATIENT_ID',
    'SEED_PATIENT_MRN',
    'SEED_PATIENT_DOB'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Required environment variable ${envVar} is not set`);
    }
  }

  const provider1 = await prisma.provider.upsert({
    where: { id: process.env.SEED_PROVIDER1_ID! },
    update: {},
    create: {
      id: process.env.SEED_PROVIDER1_ID!,
      name: process.env.SEED_PROVIDER1_NAME!,
      apiKey: await bcrypt.hash(process.env.SEED_PROVIDER1_API_KEY!, 10),
    },
  });

  const provider2 = await prisma.provider.upsert({
    where: { id: process.env.SEED_PROVIDER2_ID! },
    update: {},
    create: {
      id: process.env.SEED_PROVIDER2_ID!,
      name: process.env.SEED_PROVIDER2_NAME!,
      apiKey: await bcrypt.hash(process.env.SEED_PROVIDER2_API_KEY!, 10),
    },
  });

  const patient1 = await prisma.patient.upsert({
    where: { medicalRecordNumber: process.env.SEED_PATIENT_MRN! },
    update: {},
    create: {
      id: process.env.SEED_PATIENT_ID!,
      medicalRecordNumber: process.env.SEED_PATIENT_MRN!,
      dateOfBirth: new Date(process.env.SEED_PATIENT_DOB!),
    },
  });

  console.log('Seed completed successfully!');
  console.log('Created 2 providers and 1 patient');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
