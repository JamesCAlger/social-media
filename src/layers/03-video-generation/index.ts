import { VideoGenerationOutput, PromptOutput } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { VideoGenerationOutputSchema } from './schema';
import { createVideoProvider } from './providers';
import { PipelineConfig } from '../../core/types';

export class VideoGenerationLayer {
  private database: Database;
  private storage = createStorage();

  constructor(database: Database) {
    this.database = database;
  }

  async execute(
    prompts: PromptOutput,
    config: PipelineConfig
  ): Promise<VideoGenerationOutput> {
    logger.info('Starting Layer 3: Video Generation', { contentId: prompts.contentId });

    const startTime = Date.now();
    let totalCost = 0;

    try {
      // Create provider
      const provider = createVideoProvider(
        config.layers.videoGeneration.provider,
        config.layers.videoGeneration.model
      );

      // Generate videos for each prompt
      const videos = [];
      for (const prompt of prompts.prompts) {
        logger.info(`Generating video ${prompt.sequence}/3`);

        const video = await provider.generateVideo(prompt, prompt.sequence);
        totalCost += video.cost;

        // Download video from URL and save to local storage
        const localPath = `${prompts.contentId}/raw/video_${prompt.sequence}.mp4`;
        logger.info(`Downloading video ${prompt.sequence} to storage`);
        const savedPath = await this.storage.saveFromUrl(video.storagePath, localPath);

        // Update storage path to local path
        video.storagePath = localPath;

        videos.push(video);

        logger.info(`Video ${prompt.sequence}/3 completed`, {
          duration: video.duration,
          cost: video.cost,
        });
      }

      const output: VideoGenerationOutput = {
        contentId: prompts.contentId,
        videos,
      };

      // Validate output
      validate(VideoGenerationOutputSchema, output);

      // Update costs in database
      await this.database.updateContent(prompts.contentId, {
        video_cost: totalCost,
      });

      // Save metadata to storage
      await this.storage.saveJSON(`${prompts.contentId}/videos.json`, output);

      // Log processing
      await this.database.logProcessing({
        content_id: prompts.contentId,
        layer: 'video',
        status: 'completed',
        completed_at: new Date(),
        metadata: output,
        cost: totalCost,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Layer 3 completed', {
        contentId: prompts.contentId,
        duration,
        cost: totalCost,
        videosGenerated: videos.length,
      });

      return output;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Layer 3 failed', { error, duration, contentId: prompts.contentId });

      await this.database.updateContent(prompts.contentId, { status: 'failed' });
      await this.database.logProcessing({
        content_id: prompts.contentId,
        layer: 'video',
        status: 'failed',
        completed_at: new Date(),
        error_message: (error as Error).message,
      });

      throw error;
    }
  }
}
