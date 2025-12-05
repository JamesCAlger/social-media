import { PlatformPost } from '../../../core/types';
import { logger } from '../../../core/logger';

export class YouTubePlatform {
  async post(videoUrl: string, caption: string): Promise<PlatformPost> {
    logger.warn('YouTube integration not yet implemented', { videoUrl });
    return {
      platform: 'youtube',
      postId: '',
      postUrl: '',
      postedAt: new Date().toISOString(),
      status: 'failed',
      error: 'Not yet implemented',
    };
  }
}
