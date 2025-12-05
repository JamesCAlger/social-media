import { FalVideoProvider } from './fal';
import { GeneratedVideo, VideoPrompt } from '../../../core/types';

export interface IVideoProvider {
  generateVideo(prompt: VideoPrompt, sequence: 1 | 2 | 3): Promise<GeneratedVideo>;
  estimateCost(): number;
}

export function createVideoProvider(
  provider: 'fal',
  model: string
): IVideoProvider {
  if (!process.env.FAL_API_KEY) {
    throw new Error('FAL_API_KEY not found in environment');
  }

  if (provider === 'fal') {
    return new FalVideoProvider(model);
  }

  throw new Error(`Provider ${provider} not yet implemented`);
}
