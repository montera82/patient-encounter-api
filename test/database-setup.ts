/* eslint-disable no-console */
import { Client } from 'pg';
import { execSync } from 'child_process';

export async function setupTestDatabase() {
  const testDbName = 'patient_encounter_test_db';
  const adminClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres_password_change_in_production',
    database: 'postgres', // Connect to default postgres database
  });

  try {
    console.log('Connecting to PostgreSQL...');
    await adminClient.connect();

    // Check if test database exists
    const result = await adminClient.query(
      'SELECT datname FROM pg_catalog.pg_database WHERE datname = $1',
      [testDbName]
    );

    if (result.rows.length === 0) {
      console.log(`Creating test database: ${testDbName}`);
      await adminClient.query(`CREATE DATABASE "${testDbName}"`);
      console.log('Test database created successfully');
    } else {
      console.log('Test database already exists');
    }

    await adminClient.end();

    // Run Prisma migrations on test database
    console.log('Running Prisma migrations on test database...');
    process.env.DATABASE_URL = `postgresql://postgres:postgres_password_change_in_production@localhost:5432/${testDbName}?schema=public`;
    
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: process.env
    });

    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Database setup failed:', error);
    await adminClient.end();
    throw error;
  }
}

export async function cleanupTestDatabase() {
  const testDbName = 'patient_encounter_test_db';
  const adminClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres_password_change_in_production',
    database: 'postgres',
  });

  try {
    await adminClient.connect();
    
    // Terminate all connections to the test database
    await adminClient.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity 
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [testDbName]);

    // Drop the test database
    await adminClient.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
    console.log('Test database cleaned up successfully');
  } catch (error) {
    console.error('Database cleanup failed:', error);
  } finally {
    await adminClient.end();
  }
}
