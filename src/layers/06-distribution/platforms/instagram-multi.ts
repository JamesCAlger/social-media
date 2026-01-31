/**
 * Instagram Platform (Multi-Account Version)
 *
 * Handles posting to Instagram using account-specific credentials
 * from the database instead of environment variables.
 */

import axios from 'axios';
import { PlatformPost, Account } from '../../../core/types';
import { logger } from '../../../core/logger';
import { MultiAccountTokenManager } from '../../../utils/multi-account-token-manager';
import { AccountRepository } from '../../../core/account-repository';

export class InstagramMultiAccountPlatform {
  private tokenManager: MultiAccountTokenManager;
  private accountRepo: AccountRepository;

  constructor(accountRepo: AccountRepository) {
    this.accountRepo = accountRepo;
    this.tokenManager = new MultiAccountTokenManager(accountRepo);
  }

  /**
   * Post content to Instagram for a specific account
   */
  async post(account: Account, videoUrl: string, caption: string): Promise<PlatformPost> {
    logger.info('Posting to Instagram', {
      accountId: account.id,
      accountName: account.name,
      businessAccountId: account.businessAccountId,
      videoUrl,
    });

    try {
      // Get valid access token (auto-refreshes if needed)
      const accessToken = await this.tokenManager.getValidToken(account);

      // Step 1: Create Instagram media container
      logger.info('Creating media container...', { accountId: account.id });
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
        containerId,
      });

      // Step 2: Wait for Instagram to process the video
      await this.waitForProcessing(containerId, accessToken, account);

      // Step 3: Publish media
      logger.info('Publishing media...', { accountId: account.id, containerId });
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

      // Increment post count for today's metrics
      await this.accountRepo.incrementPostCount(account.id);

      logger.info('Posted to Instagram successfully', {
        accountId: account.id,
        accountName: account.name,
        mediaId,
        postUrl,
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
        error: error.message,
        response: error.response?.data,
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
    account: Account,
    maxAttempts: number = 30
  ): Promise<void> {
    logger.info('Waiting for Instagram to process video', {
      accountId: account.id,
      containerId,
    });

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

        logger.debug('Instagram processing status', {
          accountId: account.id,
          containerId,
          status_code,
          attempt,
        });

        if (status_code === 'FINISHED') {
          logger.info('Instagram video processing complete', {
            accountId: account.id,
            containerId,
          });
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
          accountId: account.id,
          error: error.message,
          attempt,
        });
      }
    }

    throw new Error('Instagram processing timeout');
  }

  /**
   * Get account insights from Instagram API
   */
  async getAccountInsights(account: Account): Promise<{
    followers: number;
    mediaCount: number;
  }> {
    try {
      const accessToken = await this.tokenManager.getValidToken(account);

      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${account.businessAccountId}`,
        {
          params: {
            fields: 'followers_count,media_count',
            access_token: accessToken,
          },
        }
      );

      return {
        followers: response.data.followers_count || 0,
        mediaCount: response.data.media_count || 0,
      };
    } catch (error: any) {
      logger.error('Failed to get account insights', {
        accountId: account.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get recent media insights for an account
   */
  async getMediaInsights(account: Account, limit: number = 10): Promise<{
    totalReach: number;
    totalImpressions: number;
    totalEngagement: number;
  }> {
    try {
      const accessToken = await this.tokenManager.getValidToken(account);

      // Get recent media
      const mediaResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${account.businessAccountId}/media`,
        {
          params: {
            fields: 'id,timestamp',
            limit,
            access_token: accessToken,
          },
        }
      );

      let totalReach = 0;
      let totalImpressions = 0;
      let totalEngagement = 0;

      // Get insights for each media item
      for (const media of mediaResponse.data.data || []) {
        try {
          const insightsResponse = await axios.get(
            `https://graph.facebook.com/v18.0/${media.id}/insights`,
            {
              params: {
                metric: 'reach,impressions,engagement',
                access_token: accessToken,
              },
            }
          );

          for (const insight of insightsResponse.data.data || []) {
            if (insight.name === 'reach') {
              totalReach += insight.values[0]?.value || 0;
            } else if (insight.name === 'impressions') {
              totalImpressions += insight.values[0]?.value || 0;
            } else if (insight.name === 'engagement') {
              totalEngagement += insight.values[0]?.value || 0;
            }
          }
        } catch (error: any) {
          // Some media types don't support insights
          logger.debug('Could not get insights for media', {
            mediaId: media.id,
            error: error.message,
          });
        }
      }

      return {
        totalReach,
        totalImpressions,
        totalEngagement,
      };
    } catch (error: any) {
      logger.error('Failed to get media insights', {
        accountId: account.id,
        error: error.message,
      });
      return {
        totalReach: 0,
        totalImpressions: 0,
        totalEngagement: 0,
      };
    }
  }
}
