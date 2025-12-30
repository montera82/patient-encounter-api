import { config } from 'dotenv';
import { setupTestDatabase } from './database-setup';

// Load the main Docker environment file
config({ path: '.env.docker' });

// Override specific settings for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.DATABASE_URL = 'postgresql://postgres:postgres_password_change_in_production@localhost:5432/patient_encounter_test_db?schema=public';
process.env.RATE_LIMIT_LIMIT = '1000';
process.env.DISABLE_EXTERNAL_LOGGING = 'true';

// Setup test database before any tests run
beforeAll(async () => {
  await setupTestDatabase();
}, 60000); // 60 second timeout for database setup
