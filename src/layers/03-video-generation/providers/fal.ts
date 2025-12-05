import * as fal from '@fal-ai/serverless-client';
import { GeneratedVideo, VideoPrompt } from '../../../core/types';
import { logger } from '../../../core/logger';
import { retry } from '../../../utils/retry';

fal.config({
  credentials: process.env.FAL_API_KEY,
});

export class FalVideoProvider {
  private model: string;

  constructor(model: string = 'fal-ai/wan') {
    this.model = model;
  }

  async generateVideo(
    prompt: VideoPrompt,
    sequence: 1 | 2 | 3
  ): Promise<GeneratedVideo> {
    logger.info('Generating video with Fal.ai', { model: this.model, sequence });

    // WAN 2.5 generates audio automatically from the prompt
    // Combine video and audio prompts for better audio generation
    const combinedPrompt = `${prompt.videoPrompt}\n\nAudio: ${prompt.audioPrompt}`;

    const result = await retry(
      async () => {
        return fal.subscribe(this.model, {
          input: {
            prompt: combinedPrompt,
            duration: prompt.duration,
            resolution: '720p',
            aspect_ratio: '9:16',
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === 'IN_PROGRESS') {
              logger.debug('Video generation in progress', { sequence });
            }
          },
        });
      },
      {
        maxAttempts: 3,
        backoffMs: 2000,
      }
    );

    const resultData = result as any;

    // Log the response for debugging
    logger.debug('Fal.ai response:', { response: JSON.stringify(resultData, null, 2) });

    // Try different response structures
    let videoUrl: string | undefined;

    if (resultData.data?.video?.url) {
      videoUrl = resultData.data.video.url;
    } else if (resultData.video?.url) {
      videoUrl = resultData.video.url;
    } else if (resultData.data?.url) {
      videoUrl = resultData.data.url;
    } else if (typeof resultData.data === 'string') {
      videoUrl = resultData.data;
    }

    if (!videoUrl) {
      logger.error('Could not find video URL in response', {
        response: JSON.stringify(resultData, null, 2)
      });
      throw new Error('No video URL in Fal.ai response');
    }
    const generatedAt = new Date().toISOString();

    // Cost: WAN 2.5 at 720p = $0.10 per second
    const cost = 5 * 0.10; // 5 seconds = $0.50

    return {
      sequence,
      storagePath: videoUrl, // Will be updated after download
      duration: 5,
      resolution: '720p',
      aspectRatio: '9:16',
      hasAudio: true,
      generatedAt,
      cost,
    };
  }

  estimateCost(): number {
    // 3 videos × 5 seconds × $0.10/sec (WAN 2.5 @ 720p)
    return 3 * 5 * 0.10; // $1.50
  }
}
