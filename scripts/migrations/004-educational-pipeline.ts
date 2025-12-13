/**
 * Migration: 004-educational-pipeline
 *
 * Adds tables for the educational content pipeline:
 * - `educational_content` - Core content tracking for educational videos
 * - `educational_performance` - Performance metrics for educational content
 * - `ab_tests` - A/B test tracking
 * - `topic_categories` - Topic category definitions and weights
 * - `prompt_history` - Track changes to agent prompts over time
 *
 * Run with: npx tsx scripts/migrations/004-educational-pipeline.ts
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
    console.log('Starting migration: 004-educational-pipeline\n');

    await client.query('BEGIN');

    // 1. Create educational_content table
    console.log('Creating educational_content table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS educational_content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Content identity
        niche VARCHAR(50) NOT NULL DEFAULT 'finance',
        topic_category VARCHAR(100),
        topic VARCHAR(500),

        -- Status tracking
        status VARCHAR(50) NOT NULL DEFAULT 'generating',

        -- Research output (from Research Agent)
        research_data JSONB,

        -- Script versions
        initial_script JSONB,
        final_script JSONB,
        iterations_needed INTEGER DEFAULT 0,

        -- Quality tracking (from Critic Agent)
        quality_score DECIMAL(5,2),
        hook_score DECIMAL(5,2),
        pacing_score DECIMAL(5,2),
        unique_angle_score DECIMAL(5,2),
        engagement_score DECIMAL(5,2),
        clarity_score DECIMAL(5,2),
        critique_data JSONB,

        -- Assets (from Asset Agent)
        assets JSONB,

        -- Audio (from Audio Agent)
        audio JSONB,

        -- Final output (from Composer Agent)
        video_local_path TEXT,
        video_r2_url TEXT,
        duration DECIMAL(5,2),
        file_size_bytes BIGINT,

        -- Cost tracking
        total_cost DECIMAL(10,4) DEFAULT 0,
        cost_breakdown JSONB,

        -- Safety & Review
        safety_flags JSONB,
        requires_extra_review BOOLEAN DEFAULT FALSE,
        review_priority VARCHAR(20) DEFAULT 'low',
        telegram_message_id BIGINT,
        telegram_chat_id VARCHAR(255),
        approved_at TIMESTAMPTZ,
        approved_by VARCHAR(255),
        rejected_at TIMESTAMPTZ,
        rejection_reason TEXT,

        -- A/B Test association
        ab_test_id VARCHAR(100),
        is_variant_a BOOLEAN,

        -- Instagram post reference
        instagram_post_id TEXT,
        instagram_post_url TEXT,

        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        posted_at TIMESTAMPTZ,

        -- Constraints
        CONSTRAINT educational_content_status_check CHECK (status IN (
          'generating', 'researching', 'scripting', 'critiquing', 'refining',
          'asset_generation', 'audio_generation', 'composing',
          'safety_check', 'pending_review', 'approved', 'rejected',
          'posting', 'posted', 'failed'
        )),
        CONSTRAINT educational_content_review_priority_check CHECK (review_priority IN (
          'high', 'medium', 'low'
        ))
      );
    `);
    console.log('  ✓ educational_content table created');

    // 2. Create educational_performance table
    console.log('Creating educational_performance table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS educational_performance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES educational_content(id) ON DELETE CASCADE,

        -- Instagram metrics (raw)
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        saves INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        reach INTEGER DEFAULT 0,
        profile_visits INTEGER DEFAULT 0,

        -- Retention metrics
        three_second_retention DECIMAL(5,2),
        average_watch_time DECIMAL(5,2),
        completion_rate DECIMAL(5,2),
        replay_rate DECIMAL(5,2),

        -- Derived rates
        save_rate DECIMAL(8,6),
        share_rate DECIMAL(8,6),
        engagement_rate DECIMAL(8,6),

        -- Content attributes (for correlation analysis)
        hook_style VARCHAR(50),
        topic_category VARCHAR(100),
        visual_style VARCHAR(50),
        has_number_in_hook BOOLEAN,
        energy_level VARCHAR(20),

        -- Timestamps
        first_recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- One record per content
        UNIQUE(content_id)
      );
    `);
    console.log('  ✓ educational_performance table created');

    // 3. Create ab_tests table
    console.log('Creating ab_tests table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ab_tests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        test_id VARCHAR(100) UNIQUE NOT NULL,

        -- Test configuration
        variable VARCHAR(50) NOT NULL,
        topic VARCHAR(500) NOT NULL,
        hypothesis TEXT,

        -- Variant A
        variant_a_content_id UUID REFERENCES educational_content(id) ON DELETE SET NULL,
        variant_a_description TEXT,
        variant_a_value TEXT,
        variant_a_posted_at TIMESTAMPTZ,

        -- Variant B
        variant_b_content_id UUID REFERENCES educational_content(id) ON DELETE SET NULL,
        variant_b_description TEXT,
        variant_b_value TEXT,
        variant_b_posted_at TIMESTAMPTZ,

        -- Status and results
        status VARCHAR(50) DEFAULT 'pending',
        winner VARCHAR(10),
        percent_difference DECIMAL(8,4),
        confidence VARCHAR(20),
        learning TEXT,
        results_data JSONB,

        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,

        -- Constraints
        CONSTRAINT ab_tests_status_check CHECK (status IN (
          'pending', 'variant_a_posted', 'running', 'complete', 'inconclusive', 'cancelled'
        )),
        CONSTRAINT ab_tests_variable_check CHECK (variable IN (
          'hook', 'visual_style', 'pacing', 'opening_frame', 'cta_style'
        )),
        CONSTRAINT ab_tests_winner_check CHECK (winner IS NULL OR winner IN ('A', 'B', 'tie')),
        CONSTRAINT ab_tests_confidence_check CHECK (confidence IS NULL OR confidence IN ('high', 'medium', 'low'))
      );
    `);
    console.log('  ✓ ab_tests table created');

    // 4. Create topic_categories table
    console.log('Creating topic_categories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS topic_categories (
        id VARCHAR(100) PRIMARY KEY,
        niche VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,

        -- Scheduling
        weight DECIMAL(4,3) DEFAULT 0.200,
        best_days TEXT[],
        examples TEXT[],

        -- Performance tracking (updated by Performance Agent)
        post_count INTEGER DEFAULT 0,
        avg_save_rate DECIMAL(8,6),
        avg_share_rate DECIMAL(8,6),
        avg_completion_rate DECIMAL(5,2),
        performance_score DECIMAL(5,2),

        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('  ✓ topic_categories table created');

    // 5. Create prompt_history table
    console.log('Creating prompt_history table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS prompt_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        agent_name VARCHAR(100) NOT NULL,
        prompt_section VARCHAR(100) NOT NULL,

        previous_text TEXT,
        new_text TEXT NOT NULL,
        reasoning TEXT,

        data_points_used INTEGER,
        confidence VARCHAR(20),

        -- Who/what triggered the change
        triggered_by VARCHAR(100),

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('  ✓ prompt_history table created');

    // 6. Create indexes
    console.log('Creating indexes...');
    await client.query(`
      -- educational_content indexes
      CREATE INDEX IF NOT EXISTS idx_educational_content_status ON educational_content(status);
      CREATE INDEX IF NOT EXISTS idx_educational_content_niche ON educational_content(niche);
      CREATE INDEX IF NOT EXISTS idx_educational_content_topic_category ON educational_content(topic_category);
      CREATE INDEX IF NOT EXISTS idx_educational_content_created_at ON educational_content(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_educational_content_ab_test_id ON educational_content(ab_test_id);

      -- educational_performance indexes
      CREATE INDEX IF NOT EXISTS idx_educational_performance_content_id ON educational_performance(content_id);
      CREATE INDEX IF NOT EXISTS idx_educational_performance_topic_category ON educational_performance(topic_category);
      CREATE INDEX IF NOT EXISTS idx_educational_performance_hook_style ON educational_performance(hook_style);

      -- ab_tests indexes
      CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
      CREATE INDEX IF NOT EXISTS idx_ab_tests_variable ON ab_tests(variable);

      -- topic_categories indexes
      CREATE INDEX IF NOT EXISTS idx_topic_categories_niche ON topic_categories(niche);

      -- prompt_history indexes
      CREATE INDEX IF NOT EXISTS idx_prompt_history_agent_name ON prompt_history(agent_name);
      CREATE INDEX IF NOT EXISTS idx_prompt_history_created_at ON prompt_history(created_at DESC);
    `);
    console.log('  ✓ indexes created');

    // 7. Add updated_at trigger to new tables
    console.log('Creating updated_at triggers...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_educational_content_updated_at ON educational_content;
      CREATE TRIGGER update_educational_content_updated_at
        BEFORE UPDATE ON educational_content
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_topic_categories_updated_at ON topic_categories;
      CREATE TRIGGER update_topic_categories_updated_at
        BEFORE UPDATE ON topic_categories
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('  ✓ triggers created');

    // 8. Insert default topic categories for finance niche
    console.log('Inserting default topic categories...');
    await client.query(`
      INSERT INTO topic_categories (id, niche, name, description, weight, best_days, examples)
      VALUES
        ('savings_budgeting', 'finance', 'Savings & Budgeting', 'Practical money management tips', 0.25, ARRAY['monday', 'tuesday'], ARRAY['Emergency fund mistakes', 'Budget methods', 'Saving hacks']),
        ('investing_basics', 'finance', 'Investing Basics', 'Introduction to investing concepts', 0.25, ARRAY['tuesday', 'wednesday'], ARRAY['Index funds explained', 'Compound interest', 'When to start investing']),
        ('money_psychology', 'finance', 'Money Psychology', 'Behavioral finance and money mindset', 0.25, ARRAY['wednesday', 'thursday'], ARRAY['Why you overspend', 'Money beliefs', 'Lifestyle creep']),
        ('myth_busting', 'finance', 'Myth Busting', 'Debunking common financial misconceptions', 0.15, ARRAY['thursday', 'friday'], ARRAY['Renting isn''t throwing money away', 'Credit score myths', 'Degree ROI reality']),
        ('timely_news', 'finance', 'Timely/News', 'Current events and financial news analysis', 0.10, ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], ARRAY['Fed rate impact', 'New tax law explained', 'Market event breakdown'])
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('  ✓ default topic categories inserted');

    // 9. Record migration in config table
    await client.query(`
      INSERT INTO config (key, value, updated_at)
      VALUES ('migration_004_educational_pipeline', '{"applied_at": "${new Date().toISOString()}", "version": "1.0.0"}', NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
    `);

    await client.query('COMMIT');

    console.log('\n✅ Migration 004-educational-pipeline completed successfully!\n');

    // Show summary
    console.log('Summary of changes:');
    console.log('  - Created educational_content table');
    console.log('  - Created educational_performance table');
    console.log('  - Created ab_tests table');
    console.log('  - Created topic_categories table');
    console.log('  - Created prompt_history table');
    console.log('  - Created indexes for efficient queries');
    console.log('  - Added updated_at triggers');
    console.log('  - Inserted default finance topic categories');

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
    console.log('Rolling back migration: 004-educational-pipeline\n');
    console.log('⚠️  WARNING: This will delete all educational pipeline data!\n');

    await client.query('BEGIN');

    // Drop tables in reverse dependency order
    await client.query(`DROP TABLE IF EXISTS prompt_history CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS educational_performance CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS ab_tests CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS topic_categories CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS educational_content CASCADE;`);

    // Remove migration record
    await client.query(`DELETE FROM config WHERE key = 'migration_004_educational_pipeline';`);

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
