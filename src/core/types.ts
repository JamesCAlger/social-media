// Text overlay content for intro and segment labels
export interface TextOverlays {
  introText: string; // Main intro text (e.g., "your month your vase")
  introSubtext?: string; // Optional secondary text
  segmentLabels: string[]; // One label per segment (e.g., ["january", "february", "march"])
}

// Layer 1: Idea Generation
export interface IdeaOutput {
  id: string;
  timestamp: string;
  idea: string;
  caption: string;
  culturalContext: string;
  environment: string;
  soundConcept: string;
  textOverlays: TextOverlays; // Text overlay content
  status: 'for_production';
}

// Layer 2: Prompt Engineering
export interface VideoPrompt {
  sequence: 1 | 2 | 3;
  videoPrompt: string;
  audioPrompt: string;
  duration: 5;
  resolution: '720p';
  aspectRatio: '9:16';
}

export interface PromptOutput {
  contentId: string;
  prompts: VideoPrompt[];
}

// Layer 3: Video Generation
export interface GeneratedVideo {
  sequence: 1 | 2 | 3;
  storagePath: string;
  duration: number;
  resolution: string;
  aspectRatio: string;
  hasAudio: true;
  generatedAt: string;
  cost: number;
}

export interface VideoGenerationOutput {
  contentId: string;
  videos: GeneratedVideo[];
}

// Layer 4: Composition
export interface CompositionOutput {
  contentId: string;
  finalVideo: {
    storagePath: string;
    r2Url: string;
    duration: number;
    resolution: '720p';
    aspectRatio: '9:16';
    fileSize: number;
    processedAt: string;
    cost: number;
  };
}

// Layer 5: Review
export interface ReviewOutput {
  contentId: string;
  decision: 'approved' | 'rejected' | 'edited';
  reviewedAt: string;
  reviewedBy: string;
  notes?: string;
  editedCaption?: string;
}

// Layer 6: Distribution
export interface PlatformPost {
  platform: 'instagram' | 'tiktok' | 'youtube';
  postId: string;
  postUrl: string;
  postedAt: string;
  status: 'posted' | 'failed';
  error?: string;
}

export interface DistributionOutput {
  contentId: string;
  posts: PlatformPost[];
}

// Configuration
export interface PipelineConfig {
  content: {
    videoDuration: number;
    videoCount: number;
    resolution: string;
    aspectRatio: string;
  };
  storage: {
    type: 'local' | 'cloud';
    path: string;
  };
  layers: {
    ideaGeneration: {
      provider: 'anthropic' | 'openai';
      model: string;
      temperature: number;
    };
    promptEngineering: {
      provider: 'anthropic' | 'openai';
      model: string;
      temperature: number;
    };
    videoGeneration: {
      provider: 'fal';
      model: string;
      enableAudio: boolean;
    };
    composition: {
      method: 'local' | 'fal-api';
      ffmpegPath: string;
    };
    review: {
      channel: 'slack' | 'discord' | 'dashboard' | 'telegram';
      timeout: number;
      telegram?: {
        pollingInterval: number;
      };
    };
  };
  retry: {
    maxAttempts: number;
    backoffMs: number;
  };
}
