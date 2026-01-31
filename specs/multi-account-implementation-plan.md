# Multi-Account Implementation Plan

**Created:** 2025-12-05
**Completed:** 2025-12-05
**Purpose:** Transform single-account pipeline into 12-account A/B testing system
**Status:** COMPLETE

---

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Database Multi-Tenancy | COMPLETE |
| Phase 2 | Per-Account Pipeline Components | COMPLETE |
| Phase 3 | Multi-Account Orchestrator | COMPLETE |
| Phase 4 | Scheduling & Analytics | COMPLETE |
| Phase 5 | Account Setup & Configuration | READY (12 test accounts created) |

### Files Created

```
scripts/migrations/001-multi-account.ts        # Database migration
scripts/migrations/002-fix-nullable-fields.ts  # Fix for optional credentials
src/core/types.ts                              # Added Account, ContentStrategy, etc.
src/core/account-repository.ts                 # Account CRUD operations
src/core/multi-account-orchestrator.ts         # Pipeline coordinator
src/utils/multi-account-token-manager.ts       # Per-account token management
src/layers/01-idea-generation/multi-account.ts # Multi-account idea generation
src/layers/01-idea-generation/niche-prompts.ts # Niche-specific prompts
src/layers/06-distribution/multi-account.ts    # Multi-account distribution
src/layers/06-distribution/platforms/instagram-multi.ts  # Multi-account Instagram
src/services/scheduler.ts                      # Cron-based scheduler
src/services/analytics.ts                      # A/B testing analytics
src/cli/manage-accounts.ts                     # Account management CLI
src/cli/run-account.ts                         # Pipeline runner CLI
src/cli/analytics.ts                           # Analytics CLI
```

### npm Scripts Added

```bash
npm run migrate                # Run database migrations
npm run accounts               # Account management
npm run accounts:list          # List all accounts
npm run accounts:create        # Create account interactively
npm run accounts:setup-test    # Create 12 test accounts
npm run run:account <slug>     # Run pipeline for account
npm run run:all                # Run for all active accounts
npm run run:due                # Run for accounts due to post
npm run run:status             # Show account status
npm run scheduler              # Start scheduler service
npm run analytics              # Analytics CLI
npm run analytics:report       # Generate analytics report
npm run analytics:collect      # Collect metrics from Instagram
npm run analytics:compare      # Compare strategy performance
```

### Test Results (2025-12-05)

- Created 12 test accounts for A/B testing
- Pipeline successfully ran through all 6 layers
- Video generated and uploaded to R2
- Content linked to account in database
- Niche-specific prompts working correctly

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Database Multi-Tenancy](#phase-1-database-multi-tenancy)
3. [Phase 2: Per-Account Pipeline Components](#phase-2-per-account-pipeline-components)
4. [Phase 3: Multi-Account Orchestrator](#phase-3-multi-account-orchestrator)
5. [Phase 4: Scheduling & Analytics](#phase-4-scheduling--analytics)
6. [Phase 5: Account Setup & Configuration](#phase-5-account-setup--configuration)
7. [Testing Strategy](#testing-strategy)
8. [Rollback Plan](#rollback-plan)

---

## Overview

### Current State
- Single Instagram account hardcoded via environment variables
- Single token stored in `config` table as `instagram_token_info`
- Content not linked to any account
- Orchestrator runs one pipeline for one account

### Target State
- 12 Instagram accounts stored in database
- Per-account tokens with auto-refresh
- Content linked to specific accounts
- Orchestrator supports multiple execution modes
- Per-account content strategies for A/B testing
- Analytics tracking per account

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Scheduler                                │
│  (Cron jobs per account based on posting_schedule)              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Multi-Account Orchestrator                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  runForAccount(accountId)                                │   │
│  │  runForAllAccounts()                                     │   │
│  │  runDueAccounts() ← checks posting_schedule              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Account 1   │      │  Account 2   │      │  Account N   │
│  ──────────  │      │  ──────────  │      │  ──────────  │
│  Strategy:   │      │  Strategy:   │      │  Strategy:   │
│  - Pottery   │      │  - Oddly Sat │      │  - Nature    │
│  - 1x/day    │      │  - 2x/day    │      │  - 1x/day    │
│  - 15s Reels │      │  - 7s Reels  │      │  - 30s Reels │
└──────────────┘      └──────────────┘      └──────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Shared Pipeline Layers                        │
│  Layer 1 → Layer 2 → Layer 3 → Layer 4 → Layer 5 → Layer 6     │
│  (Content strategy passed as config to each layer)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Multi-Tenancy

**Goal:** Add account management tables and link content to accounts.

**Estimated Effort:** 1-2 days

### Step 1.1: Create Migration Script

**File:** `scripts/migrations/001-multi-account.ts`

```typescript
// Migration: Add multi-account support
// Run with: npx tsx scripts/migrations/001-multi-account.ts

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Starting migration: 001-multi-account');

    await client.query('BEGIN');

    // 1. Create accounts table
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

        -- Facebook App (for token refresh)
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

    // 2. Create account_metrics table for tracking growth
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
        engagement_rate DECIMAL(5,4),
        growth_rate DECIMAL(5,4),

        -- Unique constraint: one record per account per day
        UNIQUE(account_id, recorded_at)
      );
    `);

    // 3. Add account_id to content table
    await client.query(`
      ALTER TABLE content
      ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
    `);

    // 4. Add account_id to platform_posts table
    await client.query(`
      ALTER TABLE platform_posts
      ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
    `);

    // 5. Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_accounts_platform ON accounts(platform);
      CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active);
      CREATE INDEX IF NOT EXISTS idx_accounts_slug ON accounts(slug);
      CREATE INDEX IF NOT EXISTS idx_content_account_id ON content(account_id);
      CREATE INDEX IF NOT EXISTS idx_platform_posts_account_id ON platform_posts(account_id);
      CREATE INDEX IF NOT EXISTS idx_account_metrics_account_id ON account_metrics(account_id);
      CREATE INDEX IF NOT EXISTS idx_account_metrics_recorded_at ON account_metrics(recorded_at);
    `);

    // 6. Create updated_at trigger function
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

    await client.query('COMMIT');

    console.log('✅ Migration 001-multi-account completed successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
```

### Step 1.2: Define TypeScript Interfaces

**File:** `src/core/types.ts` (additions)

```typescript
// Add to existing types.ts

export interface Account {
  id: string;
  name: string;
  slug: string;
  description?: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  businessAccountId: string;
  accessToken: string;
  tokenExpiresAt?: Date;
  facebookAppId?: string;
  facebookAppSecret?: string;
  contentStrategy: ContentStrategy;
  postingSchedule: PostingSchedule;
  isActive: boolean;
  lastPostAt?: Date;
  lastError?: string;
  consecutiveFailures: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentStrategy {
  // Niche/theme
  niche: 'asmr_pottery' | 'oddly_satisfying' | 'nature_sounds' | 'craft_process' | 'custom';
  nicheDescription?: string;

  // Content format
  contentType: 'reels_only' | 'carousels_only' | 'mixed';
  reelsToCarouselRatio?: number; // 0.0 - 1.0, e.g., 0.7 = 70% reels

  // Video settings
  videoLength: 7 | 15 | 30;
  hookStyle: 'visual' | 'text_overlay' | 'question';

  // Audio settings
  audioType: 'asmr_native' | 'trending_audio' | 'silent';

  // Prompt customization (passed to Layer 1 & 2)
  ideaPromptOverrides?: Record<string, string>;

  // Hashtag strategy
  hashtagStrategy: 'niche_specific' | 'trending' | 'mixed';
  customHashtags?: string[];
}

export interface PostingSchedule {
  // Frequency
  postsPerDay: 1 | 2 | 3;

  // Timing (24h format, UTC)
  postingTimes: string[]; // e.g., ["09:00", "15:00", "21:00"]

  // Days of week (0 = Sunday, 6 = Saturday)
  activeDays: number[]; // e.g., [0, 1, 2, 3, 4, 5, 6] for every day

  // Timezone for the schedule
  timezone: string; // e.g., "America/New_York"
}

export interface AccountMetrics {
  id: string;
  accountId: string;
  recordedAt: Date;
  followers: number;
  followersGained: number;
  followersLost: number;
  postsPublished: number;
  totalReach: number;
  totalImpressions: number;
  totalEngagement: number;
  engagementRate?: number;
  growthRate?: number;
}
```

### Step 1.3: Create Account Repository

**File:** `src/core/account-repository.ts`

```typescript
import { Pool, PoolClient } from 'pg';
import { Account, ContentStrategy, PostingSchedule, AccountMetrics } from './types';
import { logger } from './logger';

export class AccountRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Get all active accounts
   */
  async getActiveAccounts(): Promise<Account[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM accounts WHERE is_active = true ORDER BY name`
      );
      return result.rows.map(this.mapRowToAccount);
    } finally {
      client.release();
    }
  }

  /**
   * Get account by ID
   */
  async getAccountById(id: string): Promise<Account | null> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM accounts WHERE id = $1`,
        [id]
      );
      return result.rows[0] ? this.mapRowToAccount(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Get account by slug
   */
  async getAccountBySlug(slug: string): Promise<Account | null> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM accounts WHERE slug = $1`,
        [slug]
      );
      return result.rows[0] ? this.mapRowToAccount(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new account
   */
  async createAccount(data: {
    name: string;
    slug: string;
    description?: string;
    platform: 'instagram' | 'tiktok' | 'youtube';
    businessAccountId: string;
    accessToken: string;
    tokenExpiresAt?: Date;
    facebookAppId?: string;
    facebookAppSecret?: string;
    contentStrategy: ContentStrategy;
    postingSchedule: PostingSchedule;
  }): Promise<string> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `INSERT INTO accounts (
          name, slug, description, platform, business_account_id,
          access_token, token_expires_at, facebook_app_id, facebook_app_secret,
          content_strategy, posting_schedule
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          data.name,
          data.slug,
          data.description,
          data.platform,
          data.businessAccountId,
          data.accessToken,
          data.tokenExpiresAt,
          data.facebookAppId,
          data.facebookAppSecret,
          JSON.stringify(data.contentStrategy),
          JSON.stringify(data.postingSchedule),
        ]
      );

      logger.info('Account created', { accountId: result.rows[0].id, name: data.name });
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Update account
   */
  async updateAccount(id: string, updates: Partial<Account>): Promise<void> {
    const client = await this.getClient();
    try {
      const fieldMap: Record<string, string> = {
        name: 'name',
        slug: 'slug',
        description: 'description',
        accessToken: 'access_token',
        tokenExpiresAt: 'token_expires_at',
        contentStrategy: 'content_strategy',
        postingSchedule: 'posting_schedule',
        isActive: 'is_active',
        lastPostAt: 'last_post_at',
        lastError: 'last_error',
        consecutiveFailures: 'consecutive_failures',
      };

      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        const dbField = fieldMap[key];
        if (dbField) {
          fields.push(`${dbField} = $${paramCount}`);
          // JSON fields need to be stringified
          if (key === 'contentStrategy' || key === 'postingSchedule') {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
          paramCount++;
        }
      }

      if (fields.length === 0) return;

      await client.query(
        `UPDATE accounts SET ${fields.join(', ')} WHERE id = $${paramCount}`,
        [...values, id]
      );

      logger.info('Account updated', { accountId: id, fields: Object.keys(updates) });
    } finally {
      client.release();
    }
  }

  /**
   * Update account token
   */
  async updateToken(id: string, accessToken: string, expiresAt: Date): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query(
        `UPDATE accounts SET access_token = $1, token_expires_at = $2 WHERE id = $3`,
        [accessToken, expiresAt, id]
      );
      logger.info('Account token updated', { accountId: id, expiresAt });
    } finally {
      client.release();
    }
  }

  /**
   * Record successful post
   */
  async recordSuccessfulPost(id: string): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query(
        `UPDATE accounts SET
          last_post_at = NOW(),
          last_error = NULL,
          consecutive_failures = 0
        WHERE id = $1`,
        [id]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Record failed post
   */
  async recordFailedPost(id: string, error: string): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query(
        `UPDATE accounts SET
          last_error = $1,
          consecutive_failures = consecutive_failures + 1
        WHERE id = $2`,
        [error, id]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get accounts due for posting
   */
  async getAccountsDueForPosting(): Promise<Account[]> {
    const client = await this.getClient();
    try {
      // Get all active accounts and filter by schedule in application code
      // (More complex schedule matching is done in the orchestrator)
      const result = await client.query(
        `SELECT * FROM accounts
         WHERE is_active = true
         AND consecutive_failures < 5
         ORDER BY last_post_at ASC NULLS FIRST`
      );
      return result.rows.map(this.mapRowToAccount);
    } finally {
      client.release();
    }
  }

  /**
   * Record daily metrics
   */
  async recordMetrics(accountId: string, metrics: Partial<AccountMetrics>): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query(
        `INSERT INTO account_metrics (
          account_id, followers, followers_gained, followers_lost,
          posts_published, total_reach, total_impressions, total_engagement,
          engagement_rate, growth_rate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (account_id, recorded_at)
        DO UPDATE SET
          followers = EXCLUDED.followers,
          followers_gained = EXCLUDED.followers_gained,
          followers_lost = EXCLUDED.followers_lost,
          posts_published = account_metrics.posts_published + EXCLUDED.posts_published,
          total_reach = account_metrics.total_reach + EXCLUDED.total_reach,
          total_impressions = account_metrics.total_impressions + EXCLUDED.total_impressions,
          total_engagement = account_metrics.total_engagement + EXCLUDED.total_engagement,
          engagement_rate = EXCLUDED.engagement_rate,
          growth_rate = EXCLUDED.growth_rate`,
        [
          accountId,
          metrics.followers || 0,
          metrics.followersGained || 0,
          metrics.followersLost || 0,
          metrics.postsPublished || 0,
          metrics.totalReach || 0,
          metrics.totalImpressions || 0,
          metrics.totalEngagement || 0,
          metrics.engagementRate,
          metrics.growthRate,
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get metrics history for an account
   */
  async getMetricsHistory(accountId: string, days: number = 30): Promise<AccountMetrics[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM account_metrics
         WHERE account_id = $1
         AND recorded_at >= CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY recorded_at DESC`,
        [accountId]
      );
      return result.rows.map(row => ({
        id: row.id,
        accountId: row.account_id,
        recordedAt: row.recorded_at,
        followers: row.followers,
        followersGained: row.followers_gained,
        followersLost: row.followers_lost,
        postsPublished: row.posts_published,
        totalReach: row.total_reach,
        totalImpressions: row.total_impressions,
        totalEngagement: row.total_engagement,
        engagementRate: row.engagement_rate,
        growthRate: row.growth_rate,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to Account object
   */
  private mapRowToAccount(row: any): Account {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      platform: row.platform,
      businessAccountId: row.business_account_id,
      accessToken: row.access_token,
      tokenExpiresAt: row.token_expires_at ? new Date(row.token_expires_at) : undefined,
      facebookAppId: row.facebook_app_id,
      facebookAppSecret: row.facebook_app_secret,
      contentStrategy: row.content_strategy,
      postingSchedule: row.posting_schedule,
      isActive: row.is_active,
      lastPostAt: row.last_post_at ? new Date(row.last_post_at) : undefined,
      lastError: row.last_error,
      consecutiveFailures: row.consecutive_failures,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
```

### Step 1.4: Update Database Class

**File:** `src/core/database.ts` (modifications)

```typescript
// Add to existing database.ts

import { AccountRepository } from './account-repository';

export class Database {
  private pool: Pool;
  public accounts: AccountRepository;  // Add this

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });

    // Initialize account repository
    this.accounts = new AccountRepository(this.pool);  // Add this
  }

  // ... rest of existing methods ...

  /**
   * Create content linked to an account
   */
  async createContentForAccount(accountId: string, data: {
    idea: string;
    caption: string;
    cultural_context?: string;
    environment?: string;
    sound_concept?: string;
    text_overlays?: TextOverlaysRecord;
  }): Promise<string> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `INSERT INTO content (account_id, idea, caption, cultural_context, environment, sound_concept, text_overlays, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'generating')
         RETURNING id`,
        [
          accountId,
          data.idea,
          data.caption,
          data.cultural_context,
          data.environment,
          data.sound_concept,
          data.text_overlays ? JSON.stringify(data.text_overlays) : null,
        ]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Get content for a specific account
   */
  async getContentByAccount(accountId: string, limit: number = 50): Promise<ContentRecord[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM content WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [accountId, limit]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
}
```

### Phase 1 Checklist

- [ ] Create migration script `scripts/migrations/001-multi-account.ts`
- [ ] Run migration on database
- [ ] Add new types to `src/core/types.ts`
- [ ] Create `src/core/account-repository.ts`
- [ ] Update `src/core/database.ts` with account methods
- [ ] Test: Create a test account via repository
- [ ] Test: Query accounts from database

---

## Phase 2: Per-Account Pipeline Components

**Goal:** Modify pipeline components to accept and use account context.

**Estimated Effort:** 2-3 days

### Step 2.1: Update Token Manager

**File:** `src/utils/instagram-token-manager.ts` (replace entirely)

```typescript
import axios from 'axios';
import { Account } from '../core/types';
import { AccountRepository } from '../core/account-repository';
import { logger } from '../core/logger';

export class InstagramTokenManager {
  private accountRepo: AccountRepository;

  constructor(accountRepo: AccountRepository) {
    this.accountRepo = accountRepo;
  }

  /**
   * Get a valid access token for an account, refreshing if necessary
   */
  async getValidToken(account: Account): Promise<string> {
    // Check if token is expired or will expire soon (within 7 days)
    if (this.isTokenExpiringSoon(account)) {
      logger.info('Token expiring soon, refreshing...', {
        accountId: account.id,
        accountName: account.name
      });
      return await this.refreshToken(account);
    }

    return account.accessToken;
  }

  /**
   * Check if token will expire within 7 days
   */
  private isTokenExpiringSoon(account: Account): boolean {
    if (!account.tokenExpiresAt) {
      // If no expiry date, assume it needs refresh
      return true;
    }

    const now = new Date();
    const daysUntilExpiry = (account.tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    logger.debug('Token expiry check', {
      accountId: account.id,
      expiresAt: account.tokenExpiresAt,
      daysUntilExpiry: daysUntilExpiry.toFixed(2),
    });

    return daysUntilExpiry < 7;
  }

  /**
   * Refresh the access token
   */
  private async refreshToken(account: Account): Promise<string> {
    if (!account.facebookAppId || !account.facebookAppSecret) {
      throw new Error(`Account ${account.name} missing Facebook App credentials for token refresh`);
    }

    try {
      logger.info('Refreshing access token...', { accountId: account.id });

      const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: account.facebookAppId,
          client_secret: account.facebookAppSecret,
          fb_exchange_token: account.accessToken,
        },
      });

      const newToken = response.data.access_token;
      const expiresIn = response.data.expires_in; // seconds

      // Calculate new expiry date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

      // Update in database
      await this.accountRepo.updateToken(account.id, newToken, expiresAt);

      logger.info('Token refreshed successfully', {
        accountId: account.id,
        accountName: account.name,
        expiresAt,
        expiresInDays: (expiresIn / 86400).toFixed(2),
      });

      return newToken;
    } catch (error: any) {
      logger.error('Failed to refresh token', {
        accountId: account.id,
        error: error.message
      });
      throw new Error(`Token refresh failed for ${account.name}: ${error.message}`);
    }
  }

  /**
   * Get token expiry info for an account
   */
  getTokenInfo(account: Account): { expiresAt?: Date; daysRemaining: number } {
    if (!account.tokenExpiresAt) {
      return { daysRemaining: -1 };
    }

    const now = new Date();
    const daysRemaining = (account.tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    return {
      expiresAt: account.tokenExpiresAt,
      daysRemaining: Math.floor(daysRemaining),
    };
  }
}
```

### Step 2.2: Update Instagram Platform

**File:** `src/layers/06-distribution/platforms/instagram.ts` (replace entirely)

```typescript
import axios from 'axios';
import { PlatformPost, Account } from '../../../core/types';
import { logger } from '../../../core/logger';
import { InstagramTokenManager } from '../../../utils/instagram-token-manager';
import { AccountRepository } from '../../../core/account-repository';

export class InstagramPlatform {
  private tokenManager: InstagramTokenManager;
  private accountRepo: AccountRepository;

  constructor(accountRepo: AccountRepository) {
    this.accountRepo = accountRepo;
    this.tokenManager = new InstagramTokenManager(accountRepo);
  }

  /**
   * Post content to Instagram for a specific account
   */
  async post(account: Account, videoUrl: string, caption: string): Promise<PlatformPost> {
    logger.info('Posting to Instagram', {
      accountId: account.id,
      accountName: account.name,
      videoUrl
    });

    try {
      // Get valid access token (auto-refreshes if needed)
      const accessToken = await this.tokenManager.getValidToken(account);

      // Step 1: Create Instagram media container
      const containerResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${account.businessAccountId}/media`,
        {
          media_type: 'REELS',
          video_url: videoUrl,
          caption: caption,
          access_token: accessToken,
        }
      );

      const containerId = containerResponse.data.id;
      logger.info('Media container created', {
        accountId: account.id,
        containerId
      });

      // Step 2: Wait for Instagram to process the video
      await this.waitForProcessing(containerId, accessToken);

      // Step 3: Publish media
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${account.businessAccountId}/media_publish`,
        {
          creation_id: containerId,
          access_token: accessToken,
        }
      );

      const mediaId = publishResponse.data.id;
      const postUrl = `https://www.instagram.com/reel/${mediaId}`;

      // Record successful post
      await this.accountRepo.recordSuccessfulPost(account.id);

      logger.info('Posted to Instagram successfully', {
        accountId: account.id,
        accountName: account.name,
        mediaId,
        postUrl
      });

      return {
        platform: 'instagram',
        postId: mediaId,
        postUrl: postUrl,
        postedAt: new Date().toISOString(),
        status: 'posted',
      };
    } catch (error: any) {
      // Record failed post
      await this.accountRepo.recordFailedPost(account.id, error.message);

      logger.error('Failed to post to Instagram', {
        accountId: account.id,
        accountName: account.name,
        error: error.message
      });

      return {
        platform: 'instagram',
        postId: '',
        postUrl: '',
        postedAt: new Date().toISOString(),
        status: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * Wait for Instagram to finish processing the video
   */
  private async waitForProcessing(
    containerId: string,
    accessToken: string,
    maxAttempts: number = 30
  ): Promise<void> {
    logger.info('Waiting for Instagram to process video', { containerId });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const statusResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${containerId}`,
          {
            params: {
              fields: 'status_code,status',
              access_token: accessToken,
            },
          }
        );

        const { status_code } = statusResponse.data;

        logger.debug('Instagram processing status', { containerId, status_code, attempt });

        if (status_code === 'FINISHED') {
          logger.info('Instagram video processing complete', { containerId });
          return;
        }

        if (status_code === 'ERROR') {
          throw new Error(`Instagram video processing failed: ${statusResponse.data.status}`);
        }

        // Wait 2 seconds before next check
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        if (attempt === maxAttempts) {
          throw new Error(`Instagram processing timeout after ${maxAttempts} attempts`);
        }
        logger.warn('Error checking Instagram status, retrying...', {
          error: error.message,
          attempt
        });
      }
    }

    throw new Error('Instagram processing timeout');
  }
}
```

### Step 2.3: Update Distribution Layer

**File:** `src/layers/06-distribution/index.ts` (replace entirely)

```typescript
import { DistributionOutput, IdeaOutput, CompositionOutput, Account } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { DistributionOutputSchema } from './schema';
import { InstagramPlatform } from './platforms/instagram';

export class DistributionLayer {
  private database: Database;
  private storage = createStorage();

  constructor(database: Database) {
    this.database = database;
  }

  /**
   * Execute distribution for a specific account
   */
  async execute(
    account: Account,
    idea: IdeaOutput,
    composition: CompositionOutput
  ): Promise<DistributionOutput> {
    logger.info('Starting Layer 6: Distribution', {
      contentId: idea.id,
      accountId: account.id,
      accountName: account.name,
    });

    const startTime = Date.now();

    try {
      const videoUrl = composition.finalVideo.r2Url;
      const caption = idea.caption;

      const posts = [];

      // Check if distribution is enabled
      if (process.env.ENABLE_DISTRIBUTION === 'true') {
        // Post to Instagram using account credentials
        if (account.platform === 'instagram') {
          logger.info('Posting to Instagram with R2 URL', {
            videoUrl,
            accountName: account.name,
          });

          const instagram = new InstagramPlatform(this.database.accounts);
          const instagramPost = await instagram.post(account, videoUrl, caption);
          posts.push(instagramPost);
        }

        // TODO: Add TikTok and YouTube support with account context
      } else {
        logger.warn('Distribution disabled via ENABLE_DISTRIBUTION flag');
      }

      const output: DistributionOutput = {
        contentId: idea.id,
        posts,
      };

      // Validate output
      validate(DistributionOutputSchema, output);

      // Update database
      await this.database.updateContent(idea.id, {
        status: 'posted',
        posted_at: new Date(),
      });

      // Save platform posts to database with account reference
      for (const post of posts) {
        if (post.status === 'posted') {
          const client = await this.database.getClient();
          try {
            await client.query(
              `INSERT INTO platform_posts (content_id, account_id, platform, post_id, post_url, status)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [idea.id, account.id, post.platform, post.postId, post.postUrl, post.status]
            );
          } finally {
            client.release();
          }
        }
      }

      // Save metadata
      await this.storage.saveJSON(`${idea.id}/distribution.json`, output);

      // Log processing
      await this.database.logProcessing({
        content_id: idea.id,
        layer: 'distribution',
        status: 'completed',
        completed_at: new Date(),
        metadata: { ...output, accountId: account.id },
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Layer 6 completed', {
        contentId: idea.id,
        accountId: account.id,
        duration,
        platforms: posts.length,
        successful: posts.filter((p) => p.status === 'posted').length,
      });

      return output;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Layer 6 failed', {
        error,
        duration,
        contentId: idea.id,
        accountId: account.id,
      });

      await this.database.logProcessing({
        content_id: idea.id,
        layer: 'distribution',
        status: 'failed',
        completed_at: new Date(),
        error_message: (error as Error).message,
      });

      throw error;
    }
  }
}
```

### Step 2.4: Update Idea Generation Layer

**File:** `src/layers/01-idea-generation/index.ts` (modifications)

Add account context to idea generation for niche-specific prompts:

```typescript
// Modify the execute method signature to accept optional account
async execute(config: Config, account?: Account): Promise<IdeaOutput> {
  // ... existing code ...

  // Customize prompt based on account's content strategy
  let nicheContext = '';
  if (account?.contentStrategy) {
    const strategy = account.contentStrategy;

    switch (strategy.niche) {
      case 'asmr_pottery':
        nicheContext = 'Focus on pottery and ceramics crafting with satisfying clay sounds.';
        break;
      case 'oddly_satisfying':
        nicheContext = 'Focus on visually satisfying processes like slime, sand, or precision work.';
        break;
      case 'nature_sounds':
        nicheContext = 'Focus on nature scenes with calming environmental sounds.';
        break;
      case 'craft_process':
        nicheContext = 'Focus on various craft processes and handmade creations.';
        break;
      case 'custom':
        nicheContext = strategy.nicheDescription || '';
        break;
    }
  }

  // Pass nicheContext to the prompt
  // ... rest of implementation ...
}
```

### Step 2.5: Update Prompt Engineering Layer

Similar modifications to accept account context and customize video length, hook style, etc.

```typescript
// Modify execute method to use account's content strategy
async execute(idea: IdeaOutput, config: Config, account?: Account): Promise<PromptOutput> {
  // Use account's content strategy for video settings
  const videoLength = account?.contentStrategy?.videoLength || 15;
  const hookStyle = account?.contentStrategy?.hookStyle || 'visual';

  // Pass these to prompt generation
  // ... implementation ...
}
```

### Phase 2 Checklist

- [ ] Replace `src/utils/instagram-token-manager.ts`
- [ ] Replace `src/layers/06-distribution/platforms/instagram.ts`
- [ ] Replace `src/layers/06-distribution/index.ts`
- [ ] Update `src/layers/01-idea-generation/index.ts` for account context
- [ ] Update `src/layers/02-prompt-engineering/index.ts` for account context
- [ ] Test: Token refresh works with account from database
- [ ] Test: Distribution posts to correct account
- [ ] Test: Content strategy affects idea generation

---

## Phase 3: Multi-Account Orchestrator

**Goal:** Create new orchestrator that coordinates pipelines across multiple accounts.

**Estimated Effort:** 2-3 days

### Step 3.1: Create Multi-Account Orchestrator

**File:** `src/core/multi-account-orchestrator.ts`

```typescript
import { Database } from './database';
import { logger } from './logger';
import { getConfig } from '../config';
import { Account } from './types';
import { IdeaGenerationLayer } from '../layers/01-idea-generation';
import { PromptEngineeringLayer } from '../layers/02-prompt-engineering';
import { VideoGenerationLayer } from '../layers/03-video-generation';
import { CompositionLayer } from '../layers/04-composition';
import { ReviewLayer } from '../layers/05-review';
import { DistributionLayer } from '../layers/06-distribution';

export interface PipelineResult {
  accountId: string;
  accountName: string;
  contentId?: string;
  success: boolean;
  error?: string;
  duration: number;
  cost?: number;
}

export class MultiAccountOrchestrator {
  private db: Database;
  private config = getConfig();

  constructor() {
    this.db = new Database();
  }

  /**
   * Run pipeline for a specific account
   */
  async runForAccount(accountId: string): Promise<PipelineResult> {
    const account = await this.db.accounts.getAccountById(accountId);

    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    if (!account.isActive) {
      throw new Error(`Account is not active: ${account.name}`);
    }

    return this.executePipeline(account);
  }

  /**
   * Run pipeline for account by slug
   */
  async runForAccountBySlug(slug: string): Promise<PipelineResult> {
    const account = await this.db.accounts.getAccountBySlug(slug);

    if (!account) {
      throw new Error(`Account not found: ${slug}`);
    }

    if (!account.isActive) {
      throw new Error(`Account is not active: ${account.name}`);
    }

    return this.executePipeline(account);
  }

  /**
   * Run pipeline for all active accounts
   */
  async runForAllAccounts(): Promise<PipelineResult[]> {
    const accounts = await this.db.accounts.getActiveAccounts();

    logger.info('Running pipeline for all active accounts', {
      count: accounts.length
    });

    const results: PipelineResult[] = [];

    for (const account of accounts) {
      try {
        const result = await this.executePipeline(account);
        results.push(result);
      } catch (error: any) {
        results.push({
          accountId: account.id,
          accountName: account.name,
          success: false,
          error: error.message,
          duration: 0,
        });
      }

      // Small delay between accounts to avoid rate limits
      await this.delay(5000);
    }

    return results;
  }

  /**
   * Run pipeline for accounts that are due based on their posting schedule
   */
  async runDueAccounts(): Promise<PipelineResult[]> {
    const accounts = await this.db.accounts.getAccountsDueForPosting();
    const now = new Date();

    const dueAccounts = accounts.filter(account =>
      this.isAccountDueForPost(account, now)
    );

    logger.info('Found accounts due for posting', {
      total: accounts.length,
      due: dueAccounts.length,
    });

    const results: PipelineResult[] = [];

    for (const account of dueAccounts) {
      try {
        const result = await this.executePipeline(account);
        results.push(result);
      } catch (error: any) {
        results.push({
          accountId: account.id,
          accountName: account.name,
          success: false,
          error: error.message,
          duration: 0,
        });
      }

      // Delay between accounts
      await this.delay(5000);
    }

    return results;
  }

  /**
   * Check if an account is due for posting based on schedule
   */
  private isAccountDueForPost(account: Account, now: Date): boolean {
    const schedule = account.postingSchedule;

    if (!schedule || !schedule.postingTimes || schedule.postingTimes.length === 0) {
      // No schedule defined, skip
      return false;
    }

    // Check if today is an active day
    const dayOfWeek = now.getDay();
    if (schedule.activeDays && !schedule.activeDays.includes(dayOfWeek)) {
      return false;
    }

    // Check if we've already posted the required number of times today
    const todayPostCount = await this.getTodayPostCount(account.id);
    if (todayPostCount >= schedule.postsPerDay) {
      return false;
    }

    // Check if current time matches any posting time (within 30 min window)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    for (const postingTime of schedule.postingTimes) {
      const [hour, minute] = postingTime.split(':').map(Number);
      const scheduledMinutes = hour * 60 + minute;

      // Check if within 30-minute window after scheduled time
      if (currentTimeMinutes >= scheduledMinutes &&
          currentTimeMinutes < scheduledMinutes + 30) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get number of posts made today for an account
   */
  private async getTodayPostCount(accountId: string): Promise<number> {
    const client = await this.db.getClient();
    try {
      const result = await client.query(
        `SELECT COUNT(*) FROM content
         WHERE account_id = $1
         AND status = 'posted'
         AND posted_at >= CURRENT_DATE`,
        [accountId]
      );
      return parseInt(result.rows[0].count, 10);
    } finally {
      client.release();
    }
  }

  /**
   * Execute the full pipeline for an account
   */
  private async executePipeline(account: Account): Promise<PipelineResult> {
    logger.info('Starting pipeline for account', {
      accountId: account.id,
      accountName: account.name,
      niche: account.contentStrategy?.niche,
    });

    const startTime = Date.now();

    try {
      // Layer 1: Idea Generation (with account context)
      logger.info('=== Starting Layer 1: Idea Generation ===', { accountName: account.name });
      const ideaLayer = new IdeaGenerationLayer(this.db);
      const idea = await ideaLayer.execute(this.config, account);

      // Link content to account
      await this.db.updateContent(idea.id, { account_id: account.id } as any);

      logger.info(`Layer 1 completed. Content ID: ${idea.id}`);

      // Layer 2: Prompt Engineering (with account context)
      logger.info('=== Starting Layer 2: Prompt Engineering ===', { accountName: account.name });
      const promptLayer = new PromptEngineeringLayer(this.db);
      const prompts = await promptLayer.execute(idea, this.config, account);
      logger.info(`Layer 2 completed. Generated ${prompts.prompts.length} prompts`);

      // Layer 3: Video Generation
      logger.info('=== Starting Layer 3: Video Generation ===', { accountName: account.name });
      const videoLayer = new VideoGenerationLayer(this.db);
      const videos = await videoLayer.execute(prompts, this.config);
      logger.info(`Layer 3 completed. Generated ${videos.videos.length} videos`);

      // Layer 4: Composition
      logger.info('=== Starting Layer 4: Composition ===', { accountName: account.name });
      const compositionLayer = new CompositionLayer(this.db);
      const composition = await compositionLayer.execute(videos, this.config, idea.textOverlays);
      logger.info('Layer 4 completed. Final video composed and uploaded to R2');

      await this.db.updateContent(idea.id, { status: 'review_pending' });

      // Layer 5: Review
      logger.info('=== Starting Layer 5: Review ===', { accountName: account.name });
      const reviewLayer = new ReviewLayer(this.db);
      const review = await reviewLayer.execute(idea, composition, this.config);
      logger.info(`Layer 5 completed. Decision: ${review.decision}`);

      if (review.decision !== 'approved') {
        const duration = (Date.now() - startTime) / 1000;
        logger.info('Content not approved, skipping distribution', {
          accountName: account.name,
          contentId: idea.id,
          decision: review.decision,
        });
        return {
          accountId: account.id,
          accountName: account.name,
          contentId: idea.id,
          success: true,
          duration,
        };
      }

      // Layer 6: Distribution (with account context)
      logger.info('=== Starting Layer 6: Distribution ===', { accountName: account.name });
      const distributionLayer = new DistributionLayer(this.db);
      const distribution = await distributionLayer.execute(account, idea, composition);
      logger.info(`Layer 6 completed. Posted to ${distribution.posts.length} platforms`);

      // Calculate total cost
      const content = await this.db.getContent(idea.id);
      const totalCost =
        Number(content?.idea_cost || 0) +
        Number(content?.prompt_cost || 0) +
        Number(content?.video_cost || 0) +
        Number(content?.composition_cost || 0);

      await this.db.updateContent(idea.id, {
        total_cost: totalCost,
        completed_at: new Date(),
      });

      const duration = (Date.now() - startTime) / 1000;

      logger.info('Pipeline completed successfully for account', {
        accountId: account.id,
        accountName: account.name,
        contentId: idea.id,
        duration: duration.toFixed(2),
        totalCost: totalCost.toFixed(4),
      });

      return {
        accountId: account.id,
        accountName: account.name,
        contentId: idea.id,
        success: true,
        duration,
        cost: totalCost,
      };

    } catch (error: any) {
      const duration = (Date.now() - startTime) / 1000;

      logger.error('Pipeline failed for account', {
        accountId: account.id,
        accountName: account.name,
        error: error.message,
        duration: duration.toFixed(2),
      });

      // Record failure
      await this.db.accounts.recordFailedPost(account.id, error.message);

      return {
        accountId: account.id,
        accountName: account.name,
        success: false,
        error: error.message,
        duration,
      };
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.db.close();
  }
}
```

### Step 3.2: Create CLI Entry Points

**File:** `src/cli/run-account.ts`

```typescript
#!/usr/bin/env npx tsx

import { MultiAccountOrchestrator } from '../core/multi-account-orchestrator';
import { logger } from '../core/logger';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  npx tsx src/cli/run-account.ts <account-slug>     Run pipeline for specific account
  npx tsx src/cli/run-account.ts --all              Run pipeline for all active accounts
  npx tsx src/cli/run-account.ts --due              Run pipeline for accounts due to post
  npx tsx src/cli/run-account.ts --list             List all accounts
    `);
    process.exit(1);
  }

  const orchestrator = new MultiAccountOrchestrator();

  try {
    if (args[0] === '--all') {
      logger.info('Running pipeline for all accounts');
      const results = await orchestrator.runForAllAccounts();

      console.log('\n=== Results ===');
      for (const result of results) {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.accountName}: ${result.success ? 'Success' : result.error}`);
      }

    } else if (args[0] === '--due') {
      logger.info('Running pipeline for accounts due to post');
      const results = await orchestrator.runDueAccounts();

      console.log('\n=== Results ===');
      for (const result of results) {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.accountName}: ${result.success ? 'Success' : result.error}`);
      }

    } else if (args[0] === '--list') {
      const db = (orchestrator as any).db;
      const accounts = await db.accounts.getActiveAccounts();

      console.log('\n=== Active Accounts ===');
      for (const account of accounts) {
        console.log(`- ${account.slug} (${account.name})`);
        console.log(`  Niche: ${account.contentStrategy?.niche || 'not set'}`);
        console.log(`  Posts/day: ${account.postingSchedule?.postsPerDay || 'not set'}`);
        console.log(`  Last post: ${account.lastPostAt || 'never'}`);
        console.log('');
      }

    } else {
      const slug = args[0];
      logger.info(`Running pipeline for account: ${slug}`);
      const result = await orchestrator.runForAccountBySlug(slug);

      if (result.success) {
        console.log(`✅ Success! Content ID: ${result.contentId}`);
        console.log(`   Duration: ${result.duration.toFixed(2)}s`);
        console.log(`   Cost: $${result.cost?.toFixed(4) || 'N/A'}`);
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
    }
  } catch (error: any) {
    logger.error('CLI error', { error: error.message });
    console.error(`Error: ${error.message}`);
    process.exit(1);
  } finally {
    await orchestrator.close();
  }
}

main();
```

**File:** `src/cli/manage-accounts.ts`

```typescript
#!/usr/bin/env npx tsx

import { Database } from '../core/database';
import { ContentStrategy, PostingSchedule } from '../core/types';
import { logger } from '../core/logger';
import * as readline from 'readline';

const db = new Database();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAccount() {
  console.log('\n=== Create New Account ===\n');

  const name = await question('Account name (e.g., "ASMR Pottery Test A"): ');
  const slug = await question('Account slug (e.g., "pottery-a"): ');
  const businessAccountId = await question('Instagram Business Account ID: ');
  const accessToken = await question('Access Token: ');

  // Content Strategy
  console.log('\nContent Strategy:');
  console.log('1. asmr_pottery');
  console.log('2. oddly_satisfying');
  console.log('3. nature_sounds');
  console.log('4. craft_process');
  const nicheChoice = await question('Choose niche (1-4): ');
  const niches = ['asmr_pottery', 'oddly_satisfying', 'nature_sounds', 'craft_process'];
  const niche = niches[parseInt(nicheChoice) - 1] || 'asmr_pottery';

  const videoLength = await question('Video length (7, 15, or 30 seconds): ');

  console.log('\nHook style:');
  console.log('1. visual');
  console.log('2. text_overlay');
  console.log('3. question');
  const hookChoice = await question('Choose hook style (1-3): ');
  const hooks = ['visual', 'text_overlay', 'question'];
  const hookStyle = hooks[parseInt(hookChoice) - 1] || 'visual';

  const postsPerDay = await question('Posts per day (1, 2, or 3): ');
  const postingTime = await question('Posting time (e.g., "09:00"): ');

  const contentStrategy: ContentStrategy = {
    niche: niche as any,
    contentType: 'reels_only',
    videoLength: parseInt(videoLength) as 7 | 15 | 30,
    hookStyle: hookStyle as any,
    audioType: 'asmr_native',
    hashtagStrategy: 'niche_specific',
  };

  const postingSchedule: PostingSchedule = {
    postsPerDay: parseInt(postsPerDay) as 1 | 2 | 3,
    postingTimes: [postingTime],
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    timezone: 'UTC',
  };

  // Use shared Facebook App credentials from env
  const facebookAppId = process.env.FACEBOOK_APP_ID;
  const facebookAppSecret = process.env.FACEBOOK_APP_SECRET;

  try {
    const accountId = await db.accounts.createAccount({
      name,
      slug,
      platform: 'instagram',
      businessAccountId,
      accessToken,
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      facebookAppId,
      facebookAppSecret,
      contentStrategy,
      postingSchedule,
    });

    console.log(`\n✅ Account created successfully!`);
    console.log(`   ID: ${accountId}`);
    console.log(`   Slug: ${slug}`);
  } catch (error: any) {
    console.error(`\n❌ Failed to create account: ${error.message}`);
  }
}

async function listAccounts() {
  const accounts = await db.accounts.getActiveAccounts();

  console.log('\n=== Active Accounts ===\n');

  if (accounts.length === 0) {
    console.log('No active accounts found.');
    return;
  }

  for (const account of accounts) {
    console.log(`${account.name} (${account.slug})`);
    console.log(`  ID: ${account.id}`);
    console.log(`  Platform: ${account.platform}`);
    console.log(`  Business Account: ${account.businessAccountId}`);
    console.log(`  Niche: ${account.contentStrategy?.niche || 'not set'}`);
    console.log(`  Video Length: ${account.contentStrategy?.videoLength || 15}s`);
    console.log(`  Hook Style: ${account.contentStrategy?.hookStyle || 'visual'}`);
    console.log(`  Posts/Day: ${account.postingSchedule?.postsPerDay || 1}`);
    console.log(`  Posting Times: ${account.postingSchedule?.postingTimes?.join(', ') || 'not set'}`);
    console.log(`  Last Post: ${account.lastPostAt || 'never'}`);
    console.log(`  Failures: ${account.consecutiveFailures}`);
    console.log('');
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log(`
Usage:
  npx tsx src/cli/manage-accounts.ts create    Create a new account
  npx tsx src/cli/manage-accounts.ts list      List all accounts
    `);
    process.exit(0);
  }

  try {
    switch (args[0]) {
      case 'create':
        await createAccount();
        break;
      case 'list':
        await listAccounts();
        break;
      default:
        console.error(`Unknown command: ${args[0]}`);
        process.exit(1);
    }
  } finally {
    rl.close();
    await db.close();
  }
}

main();
```

### Step 3.3: Add npm Scripts

**File:** `package.json` (additions to scripts)

```json
{
  "scripts": {
    "pipeline": "tsx src/index.ts",
    "pipeline:account": "tsx src/cli/run-account.ts",
    "pipeline:all": "tsx src/cli/run-account.ts --all",
    "pipeline:due": "tsx src/cli/run-account.ts --due",
    "accounts:create": "tsx src/cli/manage-accounts.ts create",
    "accounts:list": "tsx src/cli/manage-accounts.ts list",
    "migrate": "tsx scripts/migrations/001-multi-account.ts"
  }
}
```

### Phase 3 Checklist

- [ ] Create `src/core/multi-account-orchestrator.ts`
- [ ] Create `src/cli/run-account.ts`
- [ ] Create `src/cli/manage-accounts.ts`
- [ ] Update `package.json` with new scripts
- [ ] Test: Create account via CLI
- [ ] Test: List accounts via CLI
- [ ] Test: Run pipeline for single account
- [ ] Test: Run pipeline for all accounts

---

## Phase 4: Scheduling & Analytics

**Goal:** Automate scheduled posting and track per-account analytics.

**Estimated Effort:** 2-3 days

### Step 4.1: Create Scheduler Service

**File:** `src/services/scheduler.ts`

```typescript
import cron from 'node-cron';
import { MultiAccountOrchestrator } from '../core/multi-account-orchestrator';
import { logger } from '../core/logger';

export class SchedulerService {
  private orchestrator: MultiAccountOrchestrator;
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.orchestrator = new MultiAccountOrchestrator();
  }

  /**
   * Start the scheduler
   * Runs every 15 minutes to check for accounts due to post
   */
  start() {
    logger.info('Starting scheduler service');

    // Run every 15 minutes
    this.cronJob = cron.schedule('*/15 * * * *', async () => {
      logger.info('Scheduler tick: checking for due accounts');

      try {
        const results = await this.orchestrator.runDueAccounts();

        if (results.length > 0) {
          logger.info('Scheduler completed posting run', {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
          });
        }
      } catch (error: any) {
        logger.error('Scheduler error', { error: error.message });
      }
    });

    logger.info('Scheduler started - running every 15 minutes');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Scheduler stopped');
    }
  }

  /**
   * Run immediately (for testing)
   */
  async runNow() {
    logger.info('Running scheduler immediately');
    return this.orchestrator.runDueAccounts();
  }
}

// CLI entry point
if (require.main === module) {
  const scheduler = new SchedulerService();

  scheduler.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down scheduler');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down scheduler');
    scheduler.stop();
    process.exit(0);
  });
}
```

### Step 4.2: Create Analytics Service

**File:** `src/services/analytics.ts`

```typescript
import axios from 'axios';
import { Database } from '../core/database';
import { Account } from '../core/types';
import { logger } from '../core/logger';

export class AnalyticsService {
  private db: Database;

  constructor() {
    this.db = new Database();
  }

  /**
   * Fetch and record metrics for all accounts
   */
  async recordDailyMetrics(): Promise<void> {
    const accounts = await this.db.accounts.getActiveAccounts();

    logger.info('Recording daily metrics', { accountCount: accounts.length });

    for (const account of accounts) {
      try {
        await this.recordAccountMetrics(account);
      } catch (error: any) {
        logger.error('Failed to record metrics for account', {
          accountId: account.id,
          accountName: account.name,
          error: error.message,
        });
      }
    }
  }

  /**
   * Fetch and record metrics for a single account
   */
  private async recordAccountMetrics(account: Account): Promise<void> {
    // Fetch follower count from Instagram API
    const metrics = await this.fetchInstagramMetrics(account);

    // Get previous day's follower count for growth calculation
    const history = await this.db.accounts.getMetricsHistory(account.id, 2);
    const previousFollowers = history[0]?.followers || metrics.followers;

    const followersGained = Math.max(0, metrics.followers - previousFollowers);
    const followersLost = Math.max(0, previousFollowers - metrics.followers);
    const growthRate = previousFollowers > 0
      ? (metrics.followers - previousFollowers) / previousFollowers
      : 0;

    // Calculate engagement rate (engagements / followers)
    const engagementRate = metrics.followers > 0
      ? metrics.totalEngagement / metrics.followers
      : 0;

    // Record metrics
    await this.db.accounts.recordMetrics(account.id, {
      followers: metrics.followers,
      followersGained,
      followersLost,
      postsPublished: metrics.postsToday,
      totalReach: metrics.reach,
      totalImpressions: metrics.impressions,
      totalEngagement: metrics.totalEngagement,
      engagementRate,
      growthRate,
    });

    logger.info('Recorded metrics for account', {
      accountId: account.id,
      accountName: account.name,
      followers: metrics.followers,
      growthRate: (growthRate * 100).toFixed(2) + '%',
    });
  }

  /**
   * Fetch metrics from Instagram Graph API
   */
  private async fetchInstagramMetrics(account: Account): Promise<{
    followers: number;
    postsToday: number;
    reach: number;
    impressions: number;
    totalEngagement: number;
  }> {
    try {
      // Fetch account info
      const accountResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${account.businessAccountId}`,
        {
          params: {
            fields: 'followers_count,media_count',
            access_token: account.accessToken,
          },
        }
      );

      // Fetch insights for today's posts
      const insightsResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${account.businessAccountId}/insights`,
        {
          params: {
            metric: 'reach,impressions',
            period: 'day',
            access_token: account.accessToken,
          },
        }
      );

      const reach = insightsResponse.data.data?.find((m: any) => m.name === 'reach')?.values[0]?.value || 0;
      const impressions = insightsResponse.data.data?.find((m: any) => m.name === 'impressions')?.values[0]?.value || 0;

      // Count posts made today
      const client = await this.db.getClient();
      let postsToday = 0;
      try {
        const result = await client.query(
          `SELECT COUNT(*) FROM content
           WHERE account_id = $1
           AND status = 'posted'
           AND posted_at >= CURRENT_DATE`,
          [account.id]
        );
        postsToday = parseInt(result.rows[0].count, 10);
      } finally {
        client.release();
      }

      return {
        followers: accountResponse.data.followers_count || 0,
        postsToday,
        reach,
        impressions,
        totalEngagement: reach * 0.05, // Estimate - replace with actual if available
      };
    } catch (error: any) {
      logger.error('Failed to fetch Instagram metrics', {
        accountId: account.id,
        error: error.message,
      });

      // Return zeros on error
      return {
        followers: 0,
        postsToday: 0,
        reach: 0,
        impressions: 0,
        totalEngagement: 0,
      };
    }
  }

  /**
   * Generate comparison report for all accounts
   */
  async generateComparisonReport(days: number = 30): Promise<AccountComparison[]> {
    const accounts = await this.db.accounts.getActiveAccounts();
    const comparisons: AccountComparison[] = [];

    for (const account of accounts) {
      const metrics = await this.db.accounts.getMetricsHistory(account.id, days);

      if (metrics.length < 2) continue;

      const firstMetric = metrics[metrics.length - 1];
      const lastMetric = metrics[0];

      const totalFollowersGained = lastMetric.followers - firstMetric.followers;
      const avgGrowthRate = metrics.reduce((sum, m) => sum + (m.growthRate || 0), 0) / metrics.length;
      const avgEngagementRate = metrics.reduce((sum, m) => sum + (m.engagementRate || 0), 0) / metrics.length;
      const totalPosts = metrics.reduce((sum, m) => sum + m.postsPublished, 0);

      comparisons.push({
        accountId: account.id,
        accountName: account.name,
        niche: account.contentStrategy?.niche || 'unknown',
        videoLength: account.contentStrategy?.videoLength || 15,
        hookStyle: account.contentStrategy?.hookStyle || 'visual',
        postsPerDay: account.postingSchedule?.postsPerDay || 1,
        startFollowers: firstMetric.followers,
        endFollowers: lastMetric.followers,
        totalFollowersGained,
        avgDailyGrowthRate: avgGrowthRate,
        avgEngagementRate,
        totalPosts,
        daysTracked: metrics.length,
      });
    }

    // Sort by total followers gained (best performing first)
    comparisons.sort((a, b) => b.totalFollowersGained - a.totalFollowersGained);

    return comparisons;
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}

export interface AccountComparison {
  accountId: string;
  accountName: string;
  niche: string;
  videoLength: number;
  hookStyle: string;
  postsPerDay: number;
  startFollowers: number;
  endFollowers: number;
  totalFollowersGained: number;
  avgDailyGrowthRate: number;
  avgEngagementRate: number;
  totalPosts: number;
  daysTracked: number;
}
```

### Step 4.3: Create Analytics CLI

**File:** `src/cli/analytics.ts`

```typescript
#!/usr/bin/env npx tsx

import { AnalyticsService } from '../services/analytics';
import { logger } from '../core/logger';

async function main() {
  const args = process.argv.slice(2);
  const analytics = new AnalyticsService();

  try {
    if (args[0] === 'record') {
      // Record daily metrics
      await analytics.recordDailyMetrics();
      console.log('✅ Daily metrics recorded');

    } else if (args[0] === 'report') {
      // Generate comparison report
      const days = parseInt(args[1]) || 30;
      const report = await analytics.generateComparisonReport(days);

      console.log(`\n=== Account Performance Report (${days} days) ===\n`);

      if (report.length === 0) {
        console.log('No data available yet. Run "npm run analytics record" first.');
        return;
      }

      console.log('Ranked by follower growth:\n');

      for (let i = 0; i < report.length; i++) {
        const r = report[i];
        const rank = i + 1;

        console.log(`#${rank} ${r.accountName}`);
        console.log(`   Niche: ${r.niche} | Length: ${r.videoLength}s | Hook: ${r.hookStyle}`);
        console.log(`   Posts/day: ${r.postsPerDay} | Total posts: ${r.totalPosts}`);
        console.log(`   Followers: ${r.startFollowers} → ${r.endFollowers} (+${r.totalFollowersGained})`);
        console.log(`   Avg daily growth: ${(r.avgDailyGrowthRate * 100).toFixed(2)}%`);
        console.log(`   Avg engagement: ${(r.avgEngagementRate * 100).toFixed(2)}%`);
        console.log('');
      }

      // Summary statistics
      console.log('=== Summary ===');
      const bestGrowth = report[0];
      const worstGrowth = report[report.length - 1];

      console.log(`Best performer: ${bestGrowth.accountName} (+${bestGrowth.totalFollowersGained} followers)`);
      console.log(`Worst performer: ${worstGrowth.accountName} (+${worstGrowth.totalFollowersGained} followers)`);

      // Find patterns
      const byNiche = groupBy(report, r => r.niche);
      const byLength = groupBy(report, r => r.videoLength.toString());
      const byHook = groupBy(report, r => r.hookStyle);

      console.log('\nBy Niche:');
      for (const [niche, accounts] of Object.entries(byNiche)) {
        const avgGrowth = accounts.reduce((sum, a) => sum + a.totalFollowersGained, 0) / accounts.length;
        console.log(`  ${niche}: avg +${avgGrowth.toFixed(0)} followers`);
      }

      console.log('\nBy Video Length:');
      for (const [length, accounts] of Object.entries(byLength)) {
        const avgGrowth = accounts.reduce((sum, a) => sum + a.totalFollowersGained, 0) / accounts.length;
        console.log(`  ${length}s: avg +${avgGrowth.toFixed(0)} followers`);
      }

      console.log('\nBy Hook Style:');
      for (const [hook, accounts] of Object.entries(byHook)) {
        const avgGrowth = accounts.reduce((sum, a) => sum + a.totalFollowersGained, 0) / accounts.length;
        console.log(`  ${hook}: avg +${avgGrowth.toFixed(0)} followers`);
      }

    } else {
      console.log(`
Usage:
  npx tsx src/cli/analytics.ts record         Record daily metrics for all accounts
  npx tsx src/cli/analytics.ts report [days]  Generate comparison report (default: 30 days)
      `);
    }
  } finally {
    await analytics.close();
  }
}

function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const key = fn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

main();
```

### Step 4.4: Add Cron Jobs

**File:** `scripts/setup-cron.sh`

```bash
#!/bin/bash

# Add cron jobs for the multi-account pipeline

# Record metrics daily at midnight
(crontab -l 2>/dev/null | grep -v "analytics.ts record"; echo "0 0 * * * cd /path/to/social-media-pipeline && npx tsx src/cli/analytics.ts record >> logs/analytics.log 2>&1") | crontab -

# Run scheduler check every 15 minutes (alternative to running scheduler as service)
# (crontab -l 2>/dev/null | grep -v "run-account.ts --due"; echo "*/15 * * * * cd /path/to/social-media-pipeline && npx tsx src/cli/run-account.ts --due >> logs/scheduler.log 2>&1") | crontab -

echo "Cron jobs installed. Run 'crontab -l' to verify."
```

### Phase 4 Checklist

- [ ] Create `src/services/scheduler.ts`
- [ ] Create `src/services/analytics.ts`
- [ ] Create `src/cli/analytics.ts`
- [ ] Create `scripts/setup-cron.sh`
- [ ] Update `package.json` with analytics scripts
- [ ] Test: Scheduler runs and processes due accounts
- [ ] Test: Analytics records daily metrics
- [ ] Test: Analytics generates comparison report
- [ ] Set up cron jobs for production

---

## Phase 5: Account Setup & Configuration

**Goal:** Set up 12 Instagram accounts with different test configurations.

**Estimated Effort:** 1-2 days (mostly manual Instagram setup)

### Step 5.1: Create 12 Instagram Business Accounts

| Account | Slug | Niche | Video Length | Hook Style | Posts/Day |
|---------|------|-------|--------------|------------|-----------|
| 1 | `pottery-15s-visual` | asmr_pottery | 15 | visual | 1 |
| 2 | `pottery-7s-visual` | asmr_pottery | 7 | visual | 1 |
| 3 | `pottery-30s-visual` | asmr_pottery | 30 | visual | 1 |
| 4 | `satisfying-15s-visual` | oddly_satisfying | 15 | visual | 1 |
| 5 | `satisfying-15s-text` | oddly_satisfying | 15 | text_overlay | 1 |
| 6 | `satisfying-15s-question` | oddly_satisfying | 15 | question | 1 |
| 7 | `nature-15s-visual` | nature_sounds | 15 | visual | 1 |
| 8 | `craft-15s-visual` | craft_process | 15 | visual | 1 |
| 9 | `pottery-15s-2x` | asmr_pottery | 15 | visual | 2 |
| 10 | `pottery-15s-3x` | asmr_pottery | 15 | visual | 3 |
| 11 | `satisfying-mixed` | oddly_satisfying | 15 | visual | 1 |
| 12 | `control-baseline` | asmr_pottery | 15 | visual | 1 |

### Step 5.2: Instagram Account Setup Checklist

For each account:

- [ ] Create Instagram account
- [ ] Convert to Professional/Creator account
- [ ] Create linked Facebook Page
- [ ] Connect Page to Facebook App
- [ ] Generate long-lived access token
- [ ] Get Instagram Business Account ID
- [ ] Add to database via `npm run accounts:create`

### Step 5.3: Bulk Account Creation Script

**File:** `scripts/seed-accounts.ts`

```typescript
import { Database } from '../src/core/database';
import { ContentStrategy, PostingSchedule } from '../src/core/types';

const db = new Database();

interface AccountSeed {
  name: string;
  slug: string;
  businessAccountId: string;
  accessToken: string;
  contentStrategy: ContentStrategy;
  postingSchedule: PostingSchedule;
}

// Define your 12 test accounts here
const accounts: AccountSeed[] = [
  {
    name: 'Pottery 15s Visual',
    slug: 'pottery-15s-visual',
    businessAccountId: 'YOUR_BUSINESS_ID_1',
    accessToken: 'YOUR_TOKEN_1',
    contentStrategy: {
      niche: 'asmr_pottery',
      contentType: 'reels_only',
      videoLength: 15,
      hookStyle: 'visual',
      audioType: 'asmr_native',
      hashtagStrategy: 'niche_specific',
    },
    postingSchedule: {
      postsPerDay: 1,
      postingTimes: ['09:00'],
      activeDays: [0, 1, 2, 3, 4, 5, 6],
      timezone: 'UTC',
    },
  },
  // ... Add remaining 11 accounts
];

async function seedAccounts() {
  const facebookAppId = process.env.FACEBOOK_APP_ID;
  const facebookAppSecret = process.env.FACEBOOK_APP_SECRET;

  for (const account of accounts) {
    try {
      const id = await db.accounts.createAccount({
        ...account,
        platform: 'instagram',
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        facebookAppId,
        facebookAppSecret,
      });
      console.log(`✅ Created: ${account.name} (${id})`);
    } catch (error: any) {
      console.error(`❌ Failed: ${account.name} - ${error.message}`);
    }
  }

  await db.close();
}

seedAccounts();
```

### Phase 5 Checklist

- [ ] Create 12 Instagram accounts
- [ ] Set up Facebook Pages for each
- [ ] Connect all to single Facebook App
- [ ] Generate access tokens
- [ ] Collect Business Account IDs
- [ ] Run seed script or create accounts via CLI
- [ ] Verify all accounts are active in database
- [ ] Test post to each account individually

---

## Testing Strategy

### Unit Tests

```typescript
// tests/core/account-repository.test.ts
describe('AccountRepository', () => {
  it('should create an account');
  it('should update token');
  it('should record successful post');
  it('should record failed post');
  it('should get accounts due for posting');
});

// tests/core/multi-account-orchestrator.test.ts
describe('MultiAccountOrchestrator', () => {
  it('should run pipeline for single account');
  it('should skip inactive accounts');
  it('should handle account failures gracefully');
  it('should respect posting schedule');
});
```

### Integration Tests

```typescript
// tests/integration/multi-account.test.ts
describe('Multi-Account Pipeline', () => {
  it('should create content linked to account');
  it('should use account-specific content strategy');
  it('should post to correct Instagram account');
  it('should record metrics after posting');
});
```

### Manual Testing Checklist

- [ ] Create test account via CLI
- [ ] Run pipeline for test account
- [ ] Verify content created with correct niche
- [ ] Verify video uses correct length
- [ ] Verify post appears on correct Instagram account
- [ ] Run analytics and verify metrics recorded
- [ ] Generate comparison report

---

## Rollback Plan

### If Phase 1 Fails
- Migration is additive (new tables, new columns)
- Existing content table unaffected
- Simply don't use new account features

### If Phase 2 Fails
- Keep old single-account code in place
- Add account parameter as optional
- Fall back to env vars if no account provided

### If Phase 3 Fails
- Keep original `orchestrator.ts`
- Use single-account mode as before

### Database Rollback Script

```sql
-- Emergency rollback if needed (data loss warning!)
DROP TABLE IF EXISTS account_metrics;
DROP TABLE IF EXISTS accounts;
ALTER TABLE content DROP COLUMN IF EXISTS account_id;
ALTER TABLE platform_posts DROP COLUMN IF EXISTS account_id;
```

---

## Timeline Summary

| Phase | Estimated Days | Dependencies |
|-------|---------------|--------------|
| Phase 1: Database | 1-2 | None |
| Phase 2: Components | 2-3 | Phase 1 |
| Phase 3: Orchestrator | 2-3 | Phase 2 |
| Phase 4: Scheduling | 2-3 | Phase 3 |
| Phase 5: Account Setup | 1-2 | Phase 1-4 |
| **Total** | **8-13 days** | |

---

## Next Steps

1. Review this plan
2. Start with Phase 1 (database migration)
3. Test each phase before moving to next
4. Set up Instagram accounts in parallel with development
5. Begin A/B testing once all phases complete

---

**Document Version:** 1.0
**Last Updated:** 2025-12-05
