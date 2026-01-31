/**
 * Account Repository
 *
 * Handles all database operations for multi-account management.
 * Provides CRUD operations for accounts and metrics tracking.
 */

import { Pool, PoolClient } from 'pg';
import { Account, ContentStrategy, ContentType, ContentTypeSelectionMode, PostingSchedule, AccountMetrics } from './types';
import { logger } from './logger';

export class AccountRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  // =============================================================================
  // Account CRUD Operations
  // =============================================================================

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
   * Get all accounts (including inactive)
   */
  async getAllAccounts(): Promise<Account[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM accounts ORDER BY name`
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
   * Get account by business account ID (platform-specific ID)
   */
  async getAccountByBusinessId(platform: string, businessAccountId: string): Promise<Account | null> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM accounts WHERE platform = $1 AND business_account_id = $2`,
        [platform, businessAccountId]
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
    businessAccountId?: string;
    accessToken?: string;
    tokenExpiresAt?: Date;
    facebookAppId?: string;
    facebookAppSecret?: string;
    contentStrategy?: ContentStrategy;
    contentTypes?: ContentType[];
    contentTypeSelectionMode?: ContentTypeSelectionMode;
    postingSchedule: PostingSchedule;
    isActive?: boolean;
  }): Promise<Account> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `INSERT INTO accounts (
          name, slug, description, platform, business_account_id,
          access_token, token_expires_at, facebook_app_id, facebook_app_secret,
          content_strategy, content_types, content_type_selection_mode,
          posting_schedule, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          data.name,
          data.slug,
          data.description || null,
          data.platform,
          data.businessAccountId || null,
          data.accessToken || null,
          data.tokenExpiresAt || null,
          data.facebookAppId || null,
          data.facebookAppSecret || null,
          data.contentStrategy ? JSON.stringify(data.contentStrategy) : null,
          data.contentTypes ? JSON.stringify(data.contentTypes) : null,
          data.contentTypeSelectionMode || null,
          JSON.stringify(data.postingSchedule),
          data.isActive ?? true,
        ]
      );

      const account = this.mapRowToAccount(result.rows[0]);
      logger.info('Account created', { accountId: account.id, name: data.name, slug: data.slug });
      return account;
    } finally {
      client.release();
    }
  }

  /**
   * Update account fields
   */
  async updateAccount(id: string, updates: Partial<{
    name: string;
    slug: string;
    description: string;
    accessToken: string;
    tokenExpiresAt: Date;
    contentStrategy: ContentStrategy;
    contentTypes: ContentType[];
    contentTypeSelectionMode: ContentTypeSelectionMode;
    lastContentTypeIndex: number;
    postingSchedule: PostingSchedule;
    isActive: boolean;
    lastPostAt: Date;
    lastError: string | null;
    consecutiveFailures: number;
  }>): Promise<void> {
    const client = await this.getClient();
    try {
      const fieldMap: Record<string, string> = {
        name: 'name',
        slug: 'slug',
        description: 'description',
        accessToken: 'access_token',
        tokenExpiresAt: 'token_expires_at',
        contentStrategy: 'content_strategy',
        contentTypes: 'content_types',
        contentTypeSelectionMode: 'content_type_selection_mode',
        lastContentTypeIndex: 'last_content_type_index',
        postingSchedule: 'posting_schedule',
        isActive: 'is_active',
        lastPostAt: 'last_post_at',
        lastError: 'last_error',
        consecutiveFailures: 'consecutive_failures',
      };

      const jsonFields = ['contentStrategy', 'contentTypes', 'postingSchedule'];

      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        const dbField = fieldMap[key];
        if (dbField) {
          fields.push(`${dbField} = $${paramCount}`);
          // JSON fields need to be stringified
          if (jsonFields.includes(key)) {
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

      logger.debug('Account updated', { accountId: id, fields: Object.keys(updates) });
    } finally {
      client.release();
    }
  }

  /**
   * Delete an account (soft delete by setting is_active = false)
   */
  async deactivateAccount(id: string): Promise<void> {
    await this.updateAccount(id, { isActive: false });
    logger.info('Account deactivated', { accountId: id });
  }

  /**
   * Permanently delete an account (use with caution!)
   */
  async deleteAccount(id: string): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query(`DELETE FROM accounts WHERE id = $1`, [id]);
      logger.info('Account permanently deleted', { accountId: id });
    } finally {
      client.release();
    }
  }

  // =============================================================================
  // Token Management
  // =============================================================================

  /**
   * Update account access token
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
   * Get accounts with expiring tokens (within N days)
   */
  async getAccountsWithExpiringTokens(daysUntilExpiry: number = 7): Promise<Account[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM accounts
         WHERE is_active = true
         AND token_expires_at IS NOT NULL
         AND token_expires_at < NOW() + INTERVAL '${daysUntilExpiry} days'
         ORDER BY token_expires_at ASC`
      );
      return result.rows.map(this.mapRowToAccount);
    } finally {
      client.release();
    }
  }

  // =============================================================================
  // Posting Status
  // =============================================================================

  /**
   * Record successful post for an account
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
      logger.debug('Recorded successful post', { accountId: id });
    } finally {
      client.release();
    }
  }

  /**
   * Record failed post for an account
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
      logger.warn('Recorded failed post', { accountId: id, error });
    } finally {
      client.release();
    }
  }

  /**
   * Get accounts due for posting based on their schedule
   * Returns accounts that are active and haven't exceeded failure threshold
   */
  async getAccountsDueForPosting(maxFailures: number = 5): Promise<Account[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM accounts
         WHERE is_active = true
         AND consecutive_failures < $1
         ORDER BY last_post_at ASC NULLS FIRST`,
        [maxFailures]
      );
      return result.rows.map(this.mapRowToAccount);
    } finally {
      client.release();
    }
  }

  /**
   * Get count of posts made today for an account
   */
  async getTodayPostCount(accountId: string): Promise<number> {
    const client = await this.getClient();
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

  // =============================================================================
  // Metrics
  // =============================================================================

  /**
   * Record daily metrics for an account
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
          followers = COALESCE(EXCLUDED.followers, account_metrics.followers),
          followers_gained = COALESCE(EXCLUDED.followers_gained, account_metrics.followers_gained),
          followers_lost = COALESCE(EXCLUDED.followers_lost, account_metrics.followers_lost),
          posts_published = account_metrics.posts_published + COALESCE(EXCLUDED.posts_published, 0),
          total_reach = account_metrics.total_reach + COALESCE(EXCLUDED.total_reach, 0),
          total_impressions = account_metrics.total_impressions + COALESCE(EXCLUDED.total_impressions, 0),
          total_engagement = account_metrics.total_engagement + COALESCE(EXCLUDED.total_engagement, 0),
          engagement_rate = COALESCE(EXCLUDED.engagement_rate, account_metrics.engagement_rate),
          growth_rate = COALESCE(EXCLUDED.growth_rate, account_metrics.growth_rate)`,
        [
          accountId,
          metrics.followers || 0,
          metrics.followersGained || 0,
          metrics.followersLost || 0,
          metrics.postsPublished || 0,
          metrics.totalReach || 0,
          metrics.totalImpressions || 0,
          metrics.totalEngagement || 0,
          metrics.engagementRate || null,
          metrics.growthRate || null,
        ]
      );
      logger.debug('Recorded metrics', { accountId, followers: metrics.followers });
    } finally {
      client.release();
    }
  }

  /**
   * Increment today's post count for an account
   */
  async incrementPostCount(accountId: string): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query(
        `INSERT INTO account_metrics (account_id, posts_published)
         VALUES ($1, 1)
         ON CONFLICT (account_id, recorded_at)
         DO UPDATE SET posts_published = account_metrics.posts_published + 1`,
        [accountId]
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
      return result.rows.map(this.mapRowToMetrics);
    } finally {
      client.release();
    }
  }

  /**
   * Get latest metrics for an account
   */
  async getLatestMetrics(accountId: string): Promise<AccountMetrics | null> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM account_metrics
         WHERE account_id = $1
         ORDER BY recorded_at DESC
         LIMIT 1`,
        [accountId]
      );
      return result.rows[0] ? this.mapRowToMetrics(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Get aggregated metrics for all accounts over a period
   */
  async getAggregatedMetrics(days: number = 30): Promise<{
    accountId: string;
    accountName: string;
    totalFollowersGained: number;
    avgEngagementRate: number;
    totalPosts: number;
  }[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT
          a.id as account_id,
          a.name as account_name,
          COALESCE(SUM(m.followers_gained), 0) as total_followers_gained,
          COALESCE(AVG(m.engagement_rate), 0) as avg_engagement_rate,
          COALESCE(SUM(m.posts_published), 0) as total_posts
        FROM accounts a
        LEFT JOIN account_metrics m ON a.id = m.account_id
          AND m.recorded_at >= CURRENT_DATE - INTERVAL '${days} days'
        WHERE a.is_active = true
        GROUP BY a.id, a.name
        ORDER BY total_followers_gained DESC`
      );
      return result.rows.map(row => ({
        accountId: row.account_id,
        accountName: row.account_name,
        totalFollowersGained: parseInt(row.total_followers_gained, 10),
        avgEngagementRate: parseFloat(row.avg_engagement_rate),
        totalPosts: parseInt(row.total_posts, 10),
      }));
    } finally {
      client.release();
    }
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  /**
   * Map database row to Account object
   */
  private mapRowToAccount(row: any): Account {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description || undefined,
      platform: row.platform,
      businessAccountId: row.business_account_id,
      accessToken: row.access_token,
      tokenExpiresAt: row.token_expires_at ? new Date(row.token_expires_at) : undefined,
      facebookAppId: row.facebook_app_id || undefined,
      facebookAppSecret: row.facebook_app_secret || undefined,
      contentStrategy: row.content_strategy || undefined,
      contentTypes: row.content_types || undefined,
      contentTypeSelectionMode: row.content_type_selection_mode || undefined,
      lastContentTypeIndex: row.last_content_type_index ?? undefined,
      postingSchedule: row.posting_schedule || {},
      isActive: row.is_active,
      lastPostAt: row.last_post_at ? new Date(row.last_post_at) : undefined,
      lastError: row.last_error || undefined,
      consecutiveFailures: row.consecutive_failures || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to AccountMetrics object
   */
  private mapRowToMetrics(row: any): AccountMetrics {
    return {
      id: row.id,
      accountId: row.account_id,
      recordedAt: new Date(row.recorded_at),
      followers: parseInt(row.followers, 10) || 0,
      followersGained: parseInt(row.followers_gained, 10) || 0,
      followersLost: parseInt(row.followers_lost, 10) || 0,
      postsPublished: parseInt(row.posts_published, 10) || 0,
      totalReach: parseInt(row.total_reach, 10) || 0,
      totalImpressions: parseInt(row.total_impressions, 10) || 0,
      totalEngagement: parseInt(row.total_engagement, 10) || 0,
      engagementRate: row.engagement_rate ? parseFloat(row.engagement_rate) : undefined,
      growthRate: row.growth_rate ? parseFloat(row.growth_rate) : undefined,
    };
  }
}
