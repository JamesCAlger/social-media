/**
 * Migration: Fix nullable fields for accounts table
 *
 * Allows business_account_id and access_token to be NULL
 * so accounts can be created before credentials are added.
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('Starting migration: Fix nullable fields...\n');

    // Make business_account_id nullable
    console.log('1. Making business_account_id nullable...');
    await client.query(`
      ALTER TABLE accounts
      ALTER COLUMN business_account_id DROP NOT NULL
    `);
    console.log('   Done.');

    // Make access_token nullable
    console.log('2. Making access_token nullable...');
    await client.query(`
      ALTER TABLE accounts
      ALTER COLUMN access_token DROP NOT NULL
    `);
    console.log('   Done.');

    console.log('\nMigration completed successfully!');
  } catch (error: any) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
