import { DistributionOutput, IdeaOutput, CompositionOutput } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { DistributionOutputSchema } from './schema';
import { InstagramPlatform } from './platforms/instagram';
import { TikTokPlatform } from './platforms/tiktok';
import { YouTubePlatform } from './platforms/youtube';

export class DistributionLayer {
  private database: Database;
  private storage = createStorage();

  constructor(database: Database) {
    this.database = database;
  }

  async execute(
    idea: IdeaOutput,
    composition: CompositionOutput
  ): Promise<DistributionOutput> {
    logger.info('Starting Layer 6: Distribution', { contentId: idea.id });

    const startTime = Date.now();

    try {
      const videoUrl = composition.finalVideo.r2Url;
      const caption = idea.caption;

      const posts = [];

      // Check if distribution is enabled
      if (process.env.ENABLE_DISTRIBUTION === 'true') {
        // Instagram
        if (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
          logger.info('Posting to Instagram with R2 URL', { videoUrl });
          const instagram = new InstagramPlatform(
            this.database,
            process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
          );
          const instagramPost = await instagram.post(videoUrl, caption);
          posts.push(instagramPost);
        }

        // TikTok
        if (process.env.TIKTOK_ACCESS_TOKEN) {
          const tiktok = new TikTokPlatform();
          const tiktokPost = await tiktok.post(videoUrl, caption);
          posts.push(tiktokPost);
        }

        // YouTube
        if (process.env.YOUTUBE_CLIENT_ID) {
          const youtube = new YouTubePlatform();
          const youtubePost = await youtube.post(videoUrl, caption);
          posts.push(youtubePost);
        }
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

      // Save platform posts to database
      for (const post of posts) {
        if (post.status === 'posted') {
          await this.database.getClient().then((client) => {
            client.query(
              `INSERT INTO platform_posts (content_id, platform, post_id, post_url, status)
               VALUES ($1, $2, $3, $4, $5)`,
              [idea.id, post.platform, post.postId, post.postUrl, post.status]
            );
            client.release();
          });
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
        metadata: output,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Layer 6 completed', {
        contentId: idea.id,
        duration,
        platforms: posts.length,
        successful: posts.filter((p) => p.status === 'posted').length,
      });

      return output;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Layer 6 failed', { error, duration, contentId: idea.id });

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
