/**
 * Multi-Account Token Manager
 *
 * Handles token management for multiple Instagram accounts.
 * Each account stores its own token in the accounts table.
 */

import axios from 'axios';
import { Account } from '../core/types';
import { AccountRepository } from '../core/account-repository';
import { logger } from '../core/logger';

export class MultiAccountTokenManager {
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
        accountName: account.name,
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
      // If no expiry date set, assume it's okay but log a warning
      logger.warn('Account has no token expiry date set', {
        accountId: account.id,
        accountName: account.name,
      });
      return false;
    }

    const now = new Date();
    const daysUntilExpiry = (account.tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    logger.debug('Token expiry check', {
      accountId: account.id,
      accountName: account.name,
      expiresAt: account.tokenExpiresAt,
      daysUntilExpiry: daysUntilExpiry.toFixed(2),
    });

    // Refresh if less than 7 days remaining
    return daysUntilExpiry < 7;
  }

  /**
   * Refresh the access token for an account
   */
  private async refreshToken(account: Account): Promise<string> {
    // Get Facebook App credentials - prefer account-specific, fall back to shared
    const appId = account.facebookAppId || process.env.FACEBOOK_APP_ID;
    const appSecret = account.facebookAppSecret || process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error(
        `Account ${account.name} missing Facebook App credentials for token refresh. ` +
        `Set either account-specific credentials or FACEBOOK_APP_ID/FACEBOOK_APP_SECRET in .env`
      );
    }

    try {
      logger.info('Refreshing access token...', {
        accountId: account.id,
        accountName: account.name,
      });

      const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
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
        accountName: account.name,
        error: error.message,
      });
      throw new Error(`Token refresh failed for ${account.name}: ${error.message}`);
    }
  }

  /**
   * Force refresh token for an account (for testing or manual refresh)
   */
  async forceRefresh(account: Account): Promise<string> {
    logger.info('Force refreshing token...', {
      accountId: account.id,
      accountName: account.name,
    });
    return await this.refreshToken(account);
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

  /**
   * Refresh tokens for all accounts that are expiring soon
   */
  async refreshExpiringTokens(daysUntilExpiry: number = 7): Promise<{
    refreshed: string[];
    failed: { accountId: string; error: string }[];
  }> {
    const expiringAccounts = await this.accountRepo.getAccountsWithExpiringTokens(daysUntilExpiry);

    logger.info('Found accounts with expiring tokens', {
      count: expiringAccounts.length,
      daysUntilExpiry,
    });

    const refreshed: string[] = [];
    const failed: { accountId: string; error: string }[] = [];

    for (const account of expiringAccounts) {
      try {
        await this.refreshToken(account);
        refreshed.push(account.id);
      } catch (error: any) {
        failed.push({
          accountId: account.id,
          error: error.message,
        });
      }
    }

    return { refreshed, failed };
  }
}
