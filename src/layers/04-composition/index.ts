import { CompositionOutput, VideoGenerationOutput, TextOverlays } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { CompositionOutputSchema } from './schema';
import { LocalFFmpegComposer } from './ffmpeg-local';
import { PipelineConfig } from '../../core/types';
import { R2Uploader } from '../../utils/r2-uploader';

export class CompositionLayer {
  private database: Database;
  private storage = createStorage();
  private r2Uploader: R2Uploader;

  constructor(database: Database) {
    this.database = database;
    this.r2Uploader = new R2Uploader();
  }

  async execute(
    videoOutput: VideoGenerationOutput,
    config: PipelineConfig,
    textOverlays?: TextOverlays
  ): Promise<CompositionOutput> {
    logger.info('Starting Layer 4: Composition', {
      contentId: videoOutput.contentId,
      hasTextOverlays: !!textOverlays,
    });

    const startTime = Date.now();

    try {
      // Create composer
      const composer = new LocalFFmpegComposer();

      // Compose videos (with optional text overlays)
      const composedOutput = await composer.compose(videoOutput, textOverlays);
      const cost = composer.estimateCost();

      // Upload final video to R2
      logger.info('Uploading final video to R2', { contentId: videoOutput.contentId });
      const videoPath = this.storage.getFullPath(composedOutput.finalVideo.storagePath);
      const r2Url = await this.r2Uploader.uploadVideo(videoPath, videoOutput.contentId);
      logger.info('Video uploaded to R2', { contentId: videoOutput.contentId, r2Url });

      // Add R2 URL to output
      const output: CompositionOutput = {
        ...composedOutput,
        finalVideo: {
          ...composedOutput.finalVideo,
          r2Url,
        },
      };

      // Validate output
      validate(CompositionOutputSchema, output);

      // Update database
      await this.database.updateContent(videoOutput.contentId, {
        composition_cost: cost,
        final_video_path: output.finalVideo.storagePath,
        r2_url: r2Url,
        storage_path: videoOutput.contentId,
      });

      // Save metadata
      await this.storage.saveJSON(`${videoOutput.contentId}/composition.json`, output);

      // Log processing
      await this.database.logProcessing({
        content_id: videoOutput.contentId,
        layer: 'composition',
        status: 'completed',
        completed_at: new Date(),
        metadata: output,
        cost,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Layer 4 completed', {
        contentId: videoOutput.contentId,
        duration,
        fileSize: output.finalVideo.fileSize,
      });

      return output;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Layer 4 failed', { error, duration, contentId: videoOutput.contentId });

      await this.database.updateContent(videoOutput.contentId, { status: 'failed' });
      await this.database.logProcessing({
        content_id: videoOutput.contentId,
        layer: 'composition',
        status: 'failed',
        completed_at: new Date(),
        error_message: (error as Error).message,
      });

      throw error;
    }
  }
}
