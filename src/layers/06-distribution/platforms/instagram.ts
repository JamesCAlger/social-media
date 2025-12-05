import axios from 'axios';
import { PlatformPost } from '../../../core/types';
import { logger } from '../../../core/logger';
import { InstagramTokenManager } from '../../../utils/instagram-token-manager';
import { Database } from '../../../core/database';

export class InstagramPlatform {
  private tokenManager: InstagramTokenManager;
  private businessAccountId: string;

  constructor(database: Database, businessAccountId: string) {
    this.tokenManager = new InstagramTokenManager(database);
    this.businessAccountId = businessAccountId;
  }

  async post(videoUrl: string, caption: string): Promise<PlatformPost> {
    logger.info('Posting to Instagram', { videoUrl });

    try {
      // Get valid access token (auto-refreshes if needed)
      const accessToken = await this.tokenManager.getValidToken();

      // Step 1: Use R2 URL (already uploaded in Layer 4)
      logger.info('Using R2 video URL for Instagram', { videoUrl });

      // Step 2: Create Instagram media container
      const containerResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${this.businessAccountId}/media`,
        {
          media_type: 'REELS',
          video_url: videoUrl,
          caption: caption,
          access_token: accessToken,
        }
      );

      const containerId = containerResponse.data.id;
      logger.info('Media container created', { containerId });

      // Step 3: Wait for Instagram to process the video
      await this.waitForProcessing(containerId, accessToken);

      // Step 4: Publish media
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${this.businessAccountId}/media_publish`,
        {
          creation_id: containerId,
          access_token: accessToken,
        }
      );

      const mediaId = publishResponse.data.id;
      const postUrl = `https://www.instagram.com/reel/${mediaId}`;

      logger.info('Posted to Instagram successfully', { mediaId, postUrl });

      return {
        platform: 'instagram',
        postId: mediaId,
        postUrl: postUrl,
        postedAt: new Date().toISOString(),
        status: 'posted',
      };
    } catch (error: any) {
      logger.error('Failed to post to Instagram', { error: error.message });
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
  private async waitForProcessing(containerId: string, accessToken: string, maxAttempts: number = 30): Promise<void> {
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
        logger.warn('Error checking Instagram status, retrying...', { error: error.message, attempt });
      }
    }

    throw new Error('Instagram processing timeout');
  }
}
