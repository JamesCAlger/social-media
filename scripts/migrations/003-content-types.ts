/**
 * Migration: 003-content-types
 *
 * Adds support for multiple content types per account:
 * - Adds `content_types` JSONB column for array of content types
 * - Adds `content_type_selection_mode` for random/rotation/weighted selection
 * - Adds `last_content_type_index` for rotation mode tracking
 *
 * Run with: npx tsx scripts/migrations/003-content-types.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Starting migration: 003-content-types\n');

    await client.query('BEGIN');

    // 1. Add content_types column
    console.log('Adding content_types column...');
    const contentTypesCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'accounts' AND column_name = 'content_types'
    `);

    if (contentTypesCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE accounts
        ADD COLUMN content_types JSONB DEFAULT NULL;
      `);
      console.log('  ✓ content_types column added');
    } else {
      console.log('  - content_types column already exists');
    }

    // 2. Add content_type_selection_mode column
    console.log('Adding content_type_selection_mode column...');
    const selectionModeCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'accounts' AND column_name = 'content_type_selection_mode'
    `);

    if (selectionModeCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE accounts
        ADD COLUMN content_type_selection_mode VARCHAR(20) DEFAULT NULL;
      `);
      console.log('  ✓ content_type_selection_mode column added');
    } else {
      console.log('  - content_type_selection_mode column already exists');
    }

    // 3. Add last_content_type_index column
    console.log('Adding last_content_type_index column...');
    const lastIndexCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'accounts' AND column_name = 'last_content_type_index'
    `);

    if (lastIndexCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE accounts
        ADD COLUMN last_content_type_index INTEGER DEFAULT NULL;
      `);
      console.log('  ✓ last_content_type_index column added');
    } else {
      console.log('  - last_content_type_index column already exists');
    }

    // 4. Add check constraint for selection mode
    console.log('Adding selection mode constraint...');
    await client.query(`
      ALTER TABLE accounts
      DROP CONSTRAINT IF EXISTS accounts_selection_mode_check;
    `);
    await client.query(`
      ALTER TABLE accounts
      ADD CONSTRAINT accounts_selection_mode_check
      CHECK (content_type_selection_mode IS NULL OR content_type_selection_mode IN ('random', 'rotation', 'weighted'));
    `);
    console.log('  ✓ selection mode constraint added');

    // 5. Record migration in config table
    await client.query(`
      INSERT INTO config (key, value, updated_at)
      VALUES ('migration_003_content_types', '{"applied_at": "${new Date().toISOString()}", "version": "1.0.0"}', NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
    `);

    await client.query('COMMIT');

    console.log('\n✅ Migration 003-content-types completed successfully!\n');

    // Show summary
    console.log('Summary of changes:');
    console.log('  - Added content_types JSONB column');
    console.log('  - Added content_type_selection_mode column');
    console.log('  - Added last_content_type_index column');
    console.log('  - Added selection mode check constraint');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Rollback function
async function rollback() {
  const client = await pool.connect();

  try {
    console.log('Rolling back migration: 003-content-types\n');

    await client.query('BEGIN');

    await client.query(`ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_selection_mode_check;`);
    await client.query(`ALTER TABLE accounts DROP COLUMN IF EXISTS content_types;`);
    await client.query(`ALTER TABLE accounts DROP COLUMN IF EXISTS content_type_selection_mode;`);
    await client.query(`ALTER TABLE accounts DROP COLUMN IF EXISTS last_content_type_index;`);

    await client.query(`DELETE FROM config WHERE key = 'migration_003_content_types';`);

    await client.query('COMMIT');

    console.log('✅ Rollback completed');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Check if --rollback flag is passed
if (process.argv.includes('--rollback')) {
  rollback();
} else {
  migrate();
}
