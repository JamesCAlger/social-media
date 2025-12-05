import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupDatabase() {
  const client = await pool.connect();

  try {
    console.log('Creating database schema...');

    // Drop existing tables (for development)
    await client.query(`
      DROP TABLE IF EXISTS telegram_interactions CASCADE;
      DROP TABLE IF EXISTS processing_logs CASCADE;
      DROP TABLE IF EXISTS platform_posts CASCADE;
      DROP TABLE IF EXISTS content CASCADE;
      DROP TABLE IF EXISTS config CASCADE;
    `);

    // Create content table
    await client.query(`
      CREATE TABLE content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- Layer 1: Idea
        idea TEXT NOT NULL,
        caption TEXT NOT NULL,
        cultural_context TEXT,
        environment TEXT,
        sound_concept TEXT,

        -- Processing status
        status VARCHAR(50) NOT NULL DEFAULT 'generating',

        -- Costs
        idea_cost DECIMAL(10,4),
        prompt_cost DECIMAL(10,4),
        video_cost DECIMAL(10,4),
        composition_cost DECIMAL(10,4),
        total_cost DECIMAL(10,4),

        -- Review
        reviewed_at TIMESTAMPTZ,
        reviewed_by VARCHAR(255),
        review_notes TEXT,
        edited_caption TEXT,

        -- Telegram integration
        telegram_message_id BIGINT,
        telegram_chat_id VARCHAR(255),

        -- Storage references
        storage_path TEXT,
        final_video_path TEXT,
        r2_url TEXT,

        -- Timestamps
        completed_at TIMESTAMPTZ,
        posted_at TIMESTAMPTZ,

        CONSTRAINT content_status_check CHECK (status IN (
          'generating', 'idea_generated', 'prompts_generated', 'videos_generated', 'review_pending', 'approved', 'rejected', 'posted', 'failed'
        ))
      );
    `);

    // Create platform_posts table
    await client.query(`
      CREATE TABLE platform_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,

        platform VARCHAR(50) NOT NULL,
        post_id TEXT NOT NULL,
        post_url TEXT,

        posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status VARCHAR(50) NOT NULL DEFAULT 'posted',
        error_message TEXT,

        -- Engagement metrics
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        last_updated TIMESTAMPTZ,

        CONSTRAINT platform_posts_platform_check CHECK (platform IN (
          'instagram', 'tiktok', 'youtube'
        ))
      );
    `);

    // Create processing_logs table
    await client.query(`
      CREATE TABLE processing_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID REFERENCES content(id) ON DELETE CASCADE,

        layer VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,

        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,

        error_message TEXT,
        metadata JSONB,
        cost DECIMAL(10,4)
      );
    `);

    // Create config table
    await client.query(`
      CREATE TABLE config (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create telegram_interactions table
    await client.query(`
      CREATE TABLE telegram_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,

        callback_query_id VARCHAR(255) UNIQUE NOT NULL,
        callback_data TEXT NOT NULL,
        action VARCHAR(50) NOT NULL,

        user_id BIGINT NOT NULL,
        username VARCHAR(255),
        message_id BIGINT NOT NULL,
        chat_id BIGINT NOT NULL,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMPTZ,

        CONSTRAINT telegram_interactions_action_check CHECK (action IN (
          'approve', 'reject', 'edit'
        ))
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX idx_content_status ON content(status);
      CREATE INDEX idx_content_created_at ON content(created_at DESC);
      CREATE INDEX idx_platform_posts_content_id ON platform_posts(content_id);
      CREATE INDEX idx_platform_posts_platform ON platform_posts(platform);
      CREATE INDEX idx_processing_logs_content_id ON processing_logs(content_id);
      CREATE INDEX idx_processing_logs_layer ON processing_logs(layer);
      CREATE INDEX idx_telegram_interactions_content_id ON telegram_interactions(content_id);
      CREATE INDEX idx_telegram_interactions_callback_query_id ON telegram_interactions(callback_query_id);
    `);

    console.log('✅ Database schema created successfully!');
  } catch (error) {
    console.error('❌ Error creating database schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
