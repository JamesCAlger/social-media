/**
 * Migration: 001-multi-account
 *
 * Adds multi-account support to the database:
 * - Creates `accounts` table for storing Instagram account credentials and config
 * - Creates `account_metrics` table for tracking daily growth metrics
 * - Adds `account_id` foreign key to `content` and `platform_posts` tables
 *
 * Run with: npx tsx scripts/migrations/001-multi-account.ts
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
    console.log('Starting migration: 001-multi-account\n');

    await client.query('BEGIN');

    // 1. Create accounts table
    console.log('Creating accounts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Identity
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,

        -- Platform credentials
        platform VARCHAR(50) NOT NULL DEFAULT 'instagram',
        business_account_id VARCHAR(255) NOT NULL,
        access_token TEXT NOT NULL,
        token_expires_at TIMESTAMPTZ,

        -- Facebook App (for token refresh) - shared across accounts
        facebook_app_id VARCHAR(255),
        facebook_app_secret VARCHAR(255),

        -- Content strategy (A/B testing config)
        content_strategy JSONB NOT NULL DEFAULT '{}',

        -- Posting schedule
        posting_schedule JSONB NOT NULL DEFAULT '{}',

        -- Status
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_post_at TIMESTAMPTZ,
        last_error TEXT,
        consecutive_failures INTEGER NOT NULL DEFAULT 0,

        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- Constraints
        CONSTRAINT accounts_platform_check CHECK (platform IN ('instagram', 'tiktok', 'youtube')),
        UNIQUE(platform, business_account_id)
      );
    `);
    console.log('  ✓ accounts table created');

    // 2. Create account_metrics table for tracking growth
    console.log('Creating account_metrics table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS account_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

        -- Snapshot date
        recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,

        -- Follower metrics
        followers INTEGER NOT NULL DEFAULT 0,
        followers_gained INTEGER NOT NULL DEFAULT 0,
        followers_lost INTEGER NOT NULL DEFAULT 0,

        -- Content metrics (aggregated for the day)
        posts_published INTEGER NOT NULL DEFAULT 0,
        total_reach INTEGER NOT NULL DEFAULT 0,
        total_impressions INTEGER NOT NULL DEFAULT 0,
        total_engagement INTEGER NOT NULL DEFAULT 0,

        -- Calculated rates
        engagement_rate DECIMAL(8,6),
        growth_rate DECIMAL(8,6),

        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- Unique constraint: one record per account per day
        UNIQUE(account_id, recorded_at)
      );
    `);
    console.log('  ✓ account_metrics table created');

    // 3. Add account_id to content table
    console.log('Adding account_id to content table...');

    // Check if column exists first
    const contentColumnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'content' AND column_name = 'account_id'
    `);

    if (contentColumnCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE content
        ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
      `);
      console.log('  ✓ account_id added to content table');
    } else {
      console.log('  - account_id already exists in content table');
    }

    // 4. Add account_id to platform_posts table
    console.log('Adding account_id to platform_posts table...');

    const platformPostsColumnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'platform_posts' AND column_name = 'account_id'
    `);

    if (platformPostsColumnCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE platform_posts
        ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
      `);
      console.log('  ✓ account_id added to platform_posts table');
    } else {
      console.log('  - account_id already exists in platform_posts table');
    }

    // 5. Create indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_accounts_platform ON accounts(platform);
      CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active);
      CREATE INDEX IF NOT EXISTS idx_accounts_slug ON accounts(slug);
      CREATE INDEX IF NOT EXISTS idx_content_account_id ON content(account_id);
      CREATE INDEX IF NOT EXISTS idx_platform_posts_account_id ON platform_posts(account_id);
      CREATE INDEX IF NOT EXISTS idx_account_metrics_account_id ON account_metrics(account_id);
      CREATE INDEX IF NOT EXISTS idx_account_metrics_recorded_at ON account_metrics(recorded_at);
    `);
    console.log('  ✓ indexes created');

    // 6. Create updated_at trigger function
    console.log('Creating updated_at trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // 7. Add trigger to accounts table
    await client.query(`
      DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
      CREATE TRIGGER update_accounts_updated_at
        BEFORE UPDATE ON accounts
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('  ✓ updated_at trigger created');

    // 8. Record migration in config table
    await client.query(`
      INSERT INTO config (key, value, updated_at)
      VALUES ('migration_001_multi_account', '{"applied_at": "${new Date().toISOString()}", "version": "1.0.0"}', NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
    `);

    await client.query('COMMIT');

    console.log('\n✅ Migration 001-multi-account completed successfully!\n');

    // Show summary
    console.log('Summary of changes:');
    console.log('  - Created accounts table');
    console.log('  - Created account_metrics table');
    console.log('  - Added account_id to content table');
    console.log('  - Added account_id to platform_posts table');
    console.log('  - Created indexes for efficient queries');
    console.log('  - Added updated_at trigger for accounts table');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Rollback function (use with caution!)
async function rollback() {
  const client = await pool.connect();

  try {
    console.log('Rolling back migration: 001-multi-account\n');
    console.log('⚠️  WARNING: This will delete all account data!\n');

    await client.query('BEGIN');

    // Remove columns from existing tables
    await client.query(`ALTER TABLE content DROP COLUMN IF EXISTS account_id;`);
    await client.query(`ALTER TABLE platform_posts DROP COLUMN IF EXISTS account_id;`);

    // Drop new tables
    await client.query(`DROP TABLE IF EXISTS account_metrics;`);
    await client.query(`DROP TABLE IF EXISTS accounts;`);

    // Remove migration record
    await client.query(`DELETE FROM config WHERE key = 'migration_001_multi_account';`);

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
