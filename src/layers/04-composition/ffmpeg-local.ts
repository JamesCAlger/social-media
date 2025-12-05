import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { CompositionOutput, VideoGenerationOutput, TextOverlays } from '../../core/types';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { getTextOverlayConfig } from '../../config/text-overlay';
import {
  composeWithTextOverlays,
  concatenateWithIntro,
} from './text-overlay';
import fs from 'fs/promises';

// Output from composer before R2 upload
type ComposerOutput = Omit<CompositionOutput, 'finalVideo'> & {
  finalVideo: Omit<CompositionOutput['finalVideo'], 'r2Url'>;
};

export class LocalFFmpegComposer {
  private storage = createStorage();

  async compose(
    videoOutput: VideoGenerationOutput,
    textOverlays?: TextOverlays
  ): Promise<ComposerOutput> {
    logger.info('Starting video composition with local FFmpeg', {
      contentId: videoOutput.contentId,
      hasTextOverlays: !!textOverlays,
    });

    const contentId = videoOutput.contentId;
    const inputFiles = videoOutput.videos.map((v) => this.storage.getFullPath(v.storagePath));
    const outputPath = `${contentId}/final_video.mp4`;
    const outputFullPath = this.storage.getFullPath(outputPath);
    const workDir = this.storage.getFullPath(contentId);

    const config = getTextOverlayConfig();

    // If text overlays are enabled and provided, use enhanced composition
    if (config.enabled && textOverlays) {
      logger.info('Composing with text overlays', {
        introText: textOverlays.introText,
        segmentLabels: textOverlays.segmentLabels,
      });

      try {
        // Process videos with text overlays
        const { processedVideos, introClip } = await composeWithTextOverlays(
          inputFiles,
          textOverlays,
          workDir,
          config
        );

        // Concatenate intro + processed videos
        await concatenateWithIntro(introClip, processedVideos, outputFullPath);

        // Calculate duration (intro + 3 segments)
        const introDuration = config.intro.enabled ? config.intro.duration : 0;
        const totalDuration = introDuration + 15; // 15 seconds for 3 × 5 second clips

        // Get file size
        const stats = await fs.stat(outputFullPath);
        const fileSize = stats.size;

        // Clean up intermediate files
        await this.cleanupIntermediateFiles(workDir, processedVideos, introClip);

        const output: ComposerOutput = {
          contentId,
          finalVideo: {
            storagePath: outputPath,
            duration: totalDuration,
            resolution: '720p',
            aspectRatio: '9:16',
            fileSize,
            processedAt: new Date().toISOString(),
            cost: 0,
          },
        };

        logger.info('Composition with text overlays completed', {
          duration: totalDuration,
          hasIntro: !!introClip,
        });

        return output;
      } catch (error) {
        logger.error('Text overlay composition failed, falling back to simple concat', {
          error: (error as Error).message,
        });
        // Fall through to simple composition
      }
    }

    // Simple composition without text overlays (original behavior)
    return this.simpleCompose(contentId, inputFiles, outputPath, outputFullPath);
  }

  private async simpleCompose(
    contentId: string,
    inputFiles: string[],
    outputPath: string,
    outputFullPath: string
  ): Promise<ComposerOutput> {
    logger.info('Using simple composition (no text overlays)');

    // Create concat file for FFmpeg
    const concatFilePath = this.storage.getFullPath(`${contentId}/concat.txt`);
    const concatContent = inputFiles.map((file) => `file '${file.replace(/\\/g, '/')}'`).join('\n');
    await fs.writeFile(concatFilePath, concatContent);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          '-c copy', // Copy streams without re-encoding (faster)
        ])
        .output(outputFullPath)
        .on('start', (commandLine) => {
          logger.debug('FFmpeg command:', { commandLine });
        })
        .on('progress', (progress) => {
          logger.debug('Processing', { percent: progress.percent });
        })
        .on('end', async () => {
          logger.info('FFmpeg composition completed');

          // Get file size
          const stats = await fs.stat(outputFullPath);
          const fileSize = stats.size;

          // Clean up concat file
          await fs.unlink(concatFilePath);

          const output: ComposerOutput = {
            contentId,
            finalVideo: {
              storagePath: outputPath,
              duration: 15, // 3 × 5 seconds
              resolution: '720p',
              aspectRatio: '9:16',
              fileSize,
              processedAt: new Date().toISOString(),
              cost: 0, // Local FFmpeg is free
            },
          };

          resolve(output);
        })
        .on('error', (err) => {
          logger.error('FFmpeg error', { error: err });
          reject(err);
        })
        .run();
    });
  }

  private async cleanupIntermediateFiles(
    workDir: string,
    processedVideos: string[],
    introClip: string | null
  ): Promise<void> {
    try {
      // Clean up labeled segment files
      for (const video of processedVideos) {
        if (video.includes('_labeled.mp4')) {
          await fs.unlink(video).catch(() => {});
        }
      }

      // Clean up intro clip
      if (introClip) {
        await fs.unlink(introClip).catch(() => {});
      }

      // Clean up concat file
      const concatFile = path.join(workDir, 'concat_with_intro.txt');
      await fs.unlink(concatFile).catch(() => {});
    } catch (error) {
      logger.debug('Cleanup of intermediate files failed (non-critical)', { error });
    }
  }

  estimateCost(): number {
    return 0; // Local FFmpeg is free
  }
}
