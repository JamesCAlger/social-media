/**
 * Composer Agent
 *
 * Composes final video from:
 * - Static images (with Ken Burns effect)
 * - Voiceover audio
 * - Text overlays
 *
 * Uses FFmpeg for all video processing.
 */

import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { logger } from '../../core/logger';
import { Script } from '../generator/schema';
import { AssetOutput, GeneratedAsset } from '../asset/schema';
import { AudioOutput } from '../audio/schema';
import {
  ComposerInput,
  ComposerInputSchema,
  ComposerOutput,
  ComposerOutputSchema,
  VisualTiming,
  FinalVideo,
  CompositionDetails
} from './schema';

// ============================================================================
// Configuration
// ============================================================================

interface ComposerAgentConfig {
  outputBaseDir: string;
  mockMode?: boolean;
  resolution: { width: number; height: number };
  fps: number;
  kenBurnsZoom: number;    // e.g., 1.08 = 8% zoom
}

const DEFAULT_CONFIG: ComposerAgentConfig = {
  outputBaseDir: './content',
  mockMode: false,
  resolution: { width: 1080, height: 1920 },  // 9:16 vertical
  fps: 30,
  kenBurnsZoom: 1.08
};

// ============================================================================
// Composer Agent
// ============================================================================

export class ComposerAgent {
  private config: ComposerAgentConfig;

  constructor(config: Partial<ComposerAgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Compose final video from assets and audio
   */
  async execute(input: ComposerInput): Promise<ComposerOutput> {
    const startTime = Date.now();

    // Validate input
    const validatedInput = ComposerInputSchema.parse(input);
    const { script, assets, audio, contentId, outputDir } = validatedInput;

    // Determine output directory
    const videoDir = outputDir || path.join(this.config.outputBaseDir, contentId);

    // Ensure directory exists
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    logger.info('Composer Agent starting', {
      contentId,
      assetCount: assets.assets.length,
      audioDuration: audio.voiceover.duration
    });

    try {
      // Build visual timings
      const visualTimings = this.buildVisualTimings(assets, audio);

      // Use mock mode for testing
      if (this.config.mockMode) {
        return this.generateMockOutput(
          contentId,
          videoDir,
          visualTimings,
          audio,
          startTime
        );
      }

      // Compose video
      const outputPath = path.join(videoDir, 'final_video.mp4');
      const finalVideo = await this.composeVideo(
        assets,
        audio,
        visualTimings,
        outputPath
      );

      const totalTimeMs = Date.now() - startTime;

      logger.info('Composer Agent complete', {
        contentId,
        duration: finalVideo.duration,
        fileSize: finalVideo.fileSize,
        totalTimeMs
      });

      const composition: CompositionDetails = {
        visualTimings,
        audioPath: audio.voiceover.localPath,
        audioDuration: audio.voiceover.duration,
        hasTextOverlays: script.segments.some(s => s.textOverlay !== null)
      };

      const output: ComposerOutput = {
        contentId,
        finalVideo,
        composition,
        outputDir: videoDir,
        generatedAt: new Date(),
        totalCost: 0,  // FFmpeg is free
        totalTimeMs
      };

      return ComposerOutputSchema.parse(output);

    } catch (error) {
      logger.error('Composer Agent failed', {
        error: (error as Error).message,
        contentId
      });
      throw error;
    }
  }

  /**
   * Build visual timings from assets and audio
   */
  private buildVisualTimings(
    assets: AssetOutput,
    audio: AudioOutput
  ): VisualTiming[] {
    const timings: VisualTiming[] = [];

    for (let i = 0; i < assets.assets.length; i++) {
      const asset = assets.assets[i];
      const audioTiming = audio.segmentTimings[i];

      if (!audioTiming) {
        logger.warn(`No audio timing for segment ${i}, using asset duration`);
      }

      timings.push({
        segmentIndex: i,
        assetPath: asset.localPath,
        startTime: audioTiming?.startTime ?? (i * 5),
        endTime: audioTiming?.endTime ?? ((i + 1) * 5),
        duration: audioTiming?.duration ?? asset.duration,
        textOverlay: null,  // Would come from script
        kenBurnsDirection: 'in'
      });
    }

    return timings;
  }

  /**
   * Compose video using FFmpeg
   */
  private async composeVideo(
    assets: AssetOutput,
    audio: AudioOutput,
    timings: VisualTiming[],
    outputPath: string
  ): Promise<FinalVideo> {
    const { width, height } = this.config.resolution;
    const fps = this.config.fps;
    const totalDuration = timings.reduce((sum, t) => Math.max(sum, t.endTime), 0);

    logger.info('Composing video', {
      segments: timings.length,
      totalDuration,
      resolution: `${width}x${height}`,
      fps
    });

    // Create segment videos from images
    const segmentVideos: string[] = [];
    for (let i = 0; i < timings.length; i++) {
      const timing = timings[i];
      const segmentPath = outputPath.replace('.mp4', `_segment_${i}.mp4`);

      await this.createSegmentVideo(
        timing.assetPath,
        segmentPath,
        timing.duration
      );

      segmentVideos.push(segmentPath);
    }

    // Concatenate segments
    const concatPath = outputPath.replace('.mp4', '_concat.mp4');
    await this.concatenateVideos(segmentVideos, concatPath);

    // Add audio
    await this.addAudio(concatPath, audio.voiceover.localPath, outputPath);

    // Cleanup intermediate files
    for (const seg of segmentVideos) {
      fs.unlinkSync(seg);
    }
    fs.unlinkSync(concatPath);

    // Get file stats
    const stats = fs.statSync(outputPath);

    return {
      localPath: outputPath,
      duration: totalDuration,
      resolution: `${width}x${height}`,
      aspectRatio: '9:16',
      fileSize: stats.size,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Create video segment from static image with Ken Burns effect
   */
  private createSegmentVideo(
    imagePath: string,
    outputPath: string,
    duration: number
  ): Promise<void> {
    const { width, height } = this.config.resolution;
    const fps = this.config.fps;
    const zoom = this.config.kenBurnsZoom;

    // Ken Burns effect using zoompan filter
    // Slowly zoom in over the duration
    const frames = Math.floor(duration * fps);
    const zoomPerFrame = (zoom - 1) / frames;

    return new Promise((resolve, reject) => {
      ffmpeg(imagePath)
        .inputOptions(['-loop 1'])
        .outputOptions([
          `-t ${duration}`,
          '-pix_fmt yuv420p',
          `-r ${fps}`,
          `-vf scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},zoompan=z='1+${zoomPerFrame}*on':d=${frames}:s=${width}x${height}:fps=${fps}`,
          '-c:v libx264',
          '-preset fast',
          '-crf 23'
        ])
        .output(outputPath)
        .on('start', (cmd) => {
          logger.debug('FFmpeg segment command', { cmd: cmd.substring(0, 200) });
        })
        .on('end', () => {
          logger.debug('Segment created', { outputPath });
          resolve();
        })
        .on('error', (err) => {
          logger.error('FFmpeg segment error', { error: err.message });
          reject(err);
        })
        .run();
    });
  }

  /**
   * Concatenate video segments
   */
  private concatenateVideos(
    inputPaths: string[],
    outputPath: string
  ): Promise<void> {
    // Create concat file
    const concatListPath = outputPath.replace('.mp4', '_list.txt');
    const concatContent = inputPaths
      .map(p => `file '${p.replace(/\\/g, '/')}'`)
      .join('\n');
    fs.writeFileSync(concatListPath, concatContent);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy'])
        .output(outputPath)
        .on('end', () => {
          fs.unlinkSync(concatListPath);
          logger.debug('Videos concatenated', { outputPath });
          resolve();
        })
        .on('error', (err) => {
          fs.unlinkSync(concatListPath);
          logger.error('FFmpeg concat error', { error: err.message });
          reject(err);
        })
        .run();
    });
  }

  /**
   * Add audio track to video
   */
  private addAudio(
    videoPath: string,
    audioPath: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions([
          '-c:v copy',
          '-c:a aac',
          '-b:a 192k',
          '-shortest'  // End when shortest stream ends
        ])
        .output(outputPath)
        .on('end', () => {
          logger.debug('Audio added', { outputPath });
          resolve();
        })
        .on('error', (err) => {
          logger.error('FFmpeg audio error', { error: err.message });
          reject(err);
        })
        .run();
    });
  }

  /**
   * Generate mock output for testing
   */
  private generateMockOutput(
    contentId: string,
    videoDir: string,
    visualTimings: VisualTiming[],
    audio: AudioOutput,
    startTime: number
  ): ComposerOutput {
    const outputPath = path.join(videoDir, 'final_video.mp4');

    // Create a minimal MP4 placeholder
    // This is a valid but minimal MP4 file
    const minimalMp4 = Buffer.from([
      0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70,  // ftyp box
      0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00,
      0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
      0x6D, 0x70, 0x34, 0x31,
      0x00, 0x00, 0x00, 0x08, 0x6D, 0x64, 0x61, 0x74   // mdat box (empty)
    ]);

    fs.writeFileSync(outputPath, minimalMp4);

    const totalDuration = visualTimings.reduce((sum, t) => Math.max(sum, t.endTime), 0);
    const totalTimeMs = Date.now() - startTime;

    const finalVideo: FinalVideo = {
      localPath: outputPath,
      duration: totalDuration,
      resolution: `${this.config.resolution.width}x${this.config.resolution.height}`,
      aspectRatio: '9:16',
      fileSize: minimalMp4.length,
      processedAt: new Date().toISOString()
    };

    const composition: CompositionDetails = {
      visualTimings,
      audioPath: audio.voiceover.localPath,
      audioDuration: audio.voiceover.duration,
      hasTextOverlays: false
    };

    return {
      contentId,
      finalVideo,
      composition,
      outputDir: videoDir,
      generatedAt: new Date(),
      totalCost: 0,
      totalTimeMs
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createComposerAgent(config?: Partial<ComposerAgentConfig>): ComposerAgent {
  return new ComposerAgent(config);
}

// Re-export types
export * from './schema';
