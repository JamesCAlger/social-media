import { PipelineConfig } from '../core/types';

export const defaultConfig: PipelineConfig = {
  content: {
    videoDuration: 5,
    videoCount: 3,
    resolution: '720p',
    aspectRatio: '9:16',
  },

  storage: {
    type: 'local',
    path: process.env.STORAGE_PATH || './content',
  },

  layers: {
    ideaGeneration: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.8,
    },

    promptEngineering: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
    },

    videoGeneration: {
      provider: 'fal',
      model: 'fal-ai/wan-25-preview/text-to-video',
      enableAudio: true,
    },

    composition: {
      method: 'local',
      ffmpegPath: 'ffmpeg',
    },

    review: {
      channel: 'telegram', // 'telegram' or 'slack'
      timeout: 86400, // 24 hours
      telegram: {
        pollingInterval: 1000, // 1 second
      },
    },
  },

  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
  },
};
