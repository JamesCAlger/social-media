import axios from 'axios';
import { Database } from '../core/database';
import { logger } from '../core/logger';

interface TokenInfo {
  access_token: string;
  expires_at: Date;
}

export class InstagramTokenManager {
  private database: Database;
  private appId: string;
  private appSecret: string;
  private tokenInfo: TokenInfo | null = null;

  constructor(database: Database) {
    this.database = database;

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('FACEBOOK_APP_ID and FACEBOOK_APP_SECRET must be set in .env');
    }

    this.appId = appId;
    this.appSecret = appSecret;
  }

  /**
   * Get a valid Instagram access token, refreshing if necessary
   */
  async getValidToken(): Promise<string> {
    // Load token info from database if not in memory
    if (!this.tokenInfo) {
      await this.loadTokenInfo();
    }

    // Check if token is expired or will expire soon (within 7 days)
    if (this.isTokenExpiringSoon()) {
      logger.info('Instagram token expiring soon, refreshing...');
      await this.refreshToken();
    }

    return this.tokenInfo!.access_token;
  }

  /**
   * Load token info from database
   */
  private async loadTokenInfo(): Promise<void> {
    const client = await this.database.getClient();
    try {
      const result = await client.query(
        `SELECT value FROM config WHERE key = 'instagram_token_info'`
      );

      if (result.rows.length > 0) {
        const data = result.rows[0].value;
        this.tokenInfo = {
          access_token: data.access_token,
          expires_at: new Date(data.expires_at),
        };
        logger.info('Instagram token loaded from database', {
          expiresAt: this.tokenInfo.expires_at,
        });
      } else {
        // No token in database, use from .env
        await this.initializeFromEnv();
      }
    } finally {
      client.release();
    }
  }

  /**
   * Initialize token from environment variable (first time setup)
   */
  private async initializeFromEnv(): Promise<void> {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!token) {
      throw new Error('INSTAGRAM_ACCESS_TOKEN not set in .env');
    }

    // Calculate expiry date (60 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    this.tokenInfo = {
      access_token: token,
      expires_at: expiresAt,
    };

    // Save to database
    await this.saveTokenInfo();

    logger.info('Instagram token initialized from .env', {
      expiresAt: this.tokenInfo.expires_at,
    });
  }

  /**
   * Check if token will expire within 7 days
   */
  private isTokenExpiringSoon(): boolean {
    if (!this.tokenInfo) {
      return true;
    }

    const now = new Date();
    const daysUntilExpiry = (this.tokenInfo.expires_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    logger.debug('Token expiry check', {
      expiresAt: this.tokenInfo.expires_at,
      daysUntilExpiry: daysUntilExpiry.toFixed(2),
    });

    // Refresh if less than 7 days remaining
    return daysUntilExpiry < 7;
  }

  /**
   * Refresh the access token by exchanging for a new long-lived token
   */
  private async refreshToken(): Promise<void> {
    try {
      logger.info('Refreshing Instagram access token...');

      const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: this.tokenInfo!.access_token,
        },
      });

      const newToken = response.data.access_token;
      const expiresIn = response.data.expires_in; // seconds

      // Calculate new expiry date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

      this.tokenInfo = {
        access_token: newToken,
        expires_at: expiresAt,
      };

      // Save to database
      await this.saveTokenInfo();

      logger.info('Instagram token refreshed successfully', {
        expiresAt: this.tokenInfo.expires_at,
        expiresInDays: (expiresIn / 86400).toFixed(2),
      });
    } catch (error: any) {
      logger.error('Failed to refresh Instagram token', { error: error.message });
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Save token info to database
   */
  private async saveTokenInfo(): Promise<void> {
    const client = await this.database.getClient();
    try {
      await client.query(
        `INSERT INTO config (key, value, updated_at)
         VALUES ('instagram_token_info', $1, NOW())
         ON CONFLICT (key)
         DO UPDATE SET value = $1, updated_at = NOW()`,
        [
          JSON.stringify({
            access_token: this.tokenInfo!.access_token,
            expires_at: this.tokenInfo!.expires_at.toISOString(),
          }),
        ]
      );

      logger.info('Instagram token info saved to database');
    } finally {
      client.release();
    }
  }

  /**
   * Force refresh token (for testing or manual refresh)
   */
  async forceRefresh(): Promise<void> {
    logger.info('Force refreshing Instagram token...');
    await this.refreshToken();
  }

  /**
   * Get token expiry info
   */
  async getTokenInfo(): Promise<{ expiresAt: Date; daysRemaining: number }> {
    if (!this.tokenInfo) {
      await this.loadTokenInfo();
    }

    const now = new Date();
    const daysRemaining = (this.tokenInfo!.expires_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    return {
      expiresAt: this.tokenInfo!.expires_at,
      daysRemaining: Math.floor(daysRemaining),
    };
  }
}
