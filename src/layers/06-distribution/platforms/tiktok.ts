import { PlatformPost } from '../../../core/types';
import { logger } from '../../../core/logger';

export class TikTokPlatform {
  async post(videoUrl: string, caption: string): Promise<PlatformPost> {
    logger.warn('TikTok integration not yet implemented', { videoUrl });
    return {
      platform: 'tiktok',
      postId: '',
      postUrl: '',
      postedAt: new Date().toISOString(),
      status: 'failed',
      error: 'Not yet implemented',
    };
  }
}
