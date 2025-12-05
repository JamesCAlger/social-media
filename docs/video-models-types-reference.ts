/**
 * Type definitions for multi-model video generation system
 *
 * Add these types to your project to support Ray 2 Flash, Kling 2.5 Turbo, and WAN 2.5
 *
 * Suggested location: src/layers/03-video-generation/types.ts
 */

// ============================================================================
// Model Configuration Types
// ============================================================================

export interface ModelConfig {
  /** Unique identifier for the model */
  id: string;

  /** Human-readable name */
  name: string;

  /** Provider name (fal, kie, etc.) */
  provider: 'fal' | 'kie' | 'replicate' | 'runware';

  /** API endpoint or model identifier */
  apiEndpoint: string;

  /** Cost per second of generated video */
  costPerSecond: number;

  /** Maximum video duration in seconds */
  maxDuration: number;

  /** Supported output resolutions */
  supportedResolutions: string[];

  /** Default resolution to use */
  defaultResolution: string;

  /** Model capabilities */
  features: {
    textToVideo: boolean;
    imageToVideo: boolean;
    controlNet: boolean;
  };

  /** Pricing information */
  pricing: {
    perSecond: number;
    per5Second: number;
  };
}

// ============================================================================
// Video Provider Interface
// ============================================================================

export interface VideoProvider {
  /**
   * Generate a video from the given parameters
   * @throws Error if generation fails
   */
  generateVideo(params: GenerateVideoParams): Promise<GeneratedVideo>;
}

export interface GenerateVideoParams {
  /** Text prompt describing the desired video */
  prompt: string;

  /** Duration in seconds (typically 5 for ASMR clips) */
  duration?: number;

  /** Model configuration to use */
  modelConfig: ModelConfig;

  /** Optional image URL for image-to-video generation */
  imageUrl?: string;

  /** Optional aspect ratio (default: 9:16 for vertical) */
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';

  /** Optional resolution override */
  resolution?: string;
}

export interface GeneratedVideo {
  /** Public URL to the generated video */
  url: string;

  /** Actual duration of generated video in seconds */
  duration: number;

  /** File size in bytes */
  fileSize: number;

  /** Output resolution (e.g., "720p") */
  resolution: string;

  /** Cost to generate this video in USD */
  cost: number;

  /** Model ID used for generation */
  model: string;

  /** Provider used */
  provider: string;

  /** Additional metadata from the provider */
  metadata?: {
    taskId?: string;
    requestId?: string;
    generationTime?: number;
    [key: string]: any;
  };
}

// ============================================================================
// Layer 3 Input/Output Types
// ============================================================================

export interface VideoPrompt {
  segmentNumber: number;
  prompt: string;
  visualDescription: string;
  cameraMovement: 'static' | 'pan' | 'zoom' | 'dolly';
  duration: number;
}

export interface VideoSegment {
  segmentNumber: number;
  storagePath: string;
  url: string;
  duration: number;
  fileSize: number;
  cost: number;
  model: string;
}

export interface VideoGenerationOutput {
  contentId: string;
  videos: VideoSegment[];
  totalCost: number;
  model: string;
}

// ============================================================================
// Comparison Testing Types
// ============================================================================

export interface ComparisonTestConfig {
  /** Models to compare */
  models: string[];

  /** Test prompts */
  prompts: TestPrompt[];

  /** Number of videos to generate per model/prompt combination */
  iterations?: number;

  /** Output directory for results */
  outputDir?: string;
}

export interface TestPrompt {
  id: string;
  prompt: string;
  category: string;
}

export interface ComparisonResult {
  model: string;
  promptId: string;
  prompt: string;
  videoUrl: string;
  cost: number;
  generationTime: number;
  success: boolean;
  error?: string;
  metadata?: any;
}

export interface ComparisonReport {
  timestamp: string;
  totalTime: number;
  models: string[];
  results: ComparisonResult[];
  statistics: ModelStatistics[];
  recommendations: {
    cheapest: string;
    mostReliable: string;
    fastest: string;
  };
}

export interface ModelStatistics {
  model: string;
  successCount: number;
  totalTests: number;
  successRate: number;
  avgCost: number;
  avgTime: number;
  totalCost: number;
}

// ============================================================================
// Provider-Specific Types
// ============================================================================

// Fal.ai specific types
export namespace FalTypes {
  export interface SubscribeOptions {
    input: {
      prompt: string;
      duration?: number;
      resolution?: string;
      aspect_ratio?: string;
    };
    logs?: boolean;
    onQueueUpdate?: (update: QueueUpdate) => void;
  }

  export interface QueueUpdate {
    status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    position?: number;
    logs?: string[];
  }

  export interface VideoResult {
    video: {
      url: string;
      duration: number;
      file_size: number;
      width: number;
      height: number;
    };
    requestId: string;
  }
}

// Kie.ai specific types
export namespace KieTypes {
  export interface CreateGenerationRequest {
    model: string;
    prompt: string;
    duration: number;
    aspect_ratio: '1:1' | '16:9' | '9:16';
    mode: 'standard' | 'professional';
  }

  export interface CreateGenerationResponse {
    id: string;
    status: 'pending' | 'processing' | 'succeeded' | 'failed';
    created_at: string;
  }

  export interface GenerationStatus {
    id: string;
    status: 'pending' | 'processing' | 'succeeded' | 'failed';
    url?: string;
    duration?: number;
    file_size?: number;
    generation_time?: number;
    error?: string;
    created_at: string;
    completed_at?: string;
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface VideoGenerationConfig {
  /** Default model to use */
  defaultModel: string;

  /** Whether to enable multi-model comparison */
  enableComparison: boolean;

  /** Models to use in comparison mode */
  comparisonModels: string[];

  /** Maximum cost threshold per video (abort if exceeded) */
  maxCostPerVideo: number;

  /** Default duration for video clips */
  defaultDuration: number;

  /** Default aspect ratio */
  defaultAspectRatio: '1:1' | '16:9' | '9:16';

  /** Retry configuration */
  retry: {
    maxAttempts: number;
    backoffMs: number;
  };

  /** Timeout configuration */
  timeout: {
    generationMs: number;
    pollIntervalMs: number;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export class VideoGenerationError extends Error {
  constructor(
    message: string,
    public readonly model: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly originalError?: any
  ) {
    super(message);
    this.name = 'VideoGenerationError';
  }
}

export class ModelNotFoundError extends Error {
  constructor(public readonly modelId: string) {
    super(`Video model not found: ${modelId}`);
    this.name = 'ModelNotFoundError';
  }
}

export class ProviderAuthError extends Error {
  constructor(
    public readonly provider: string,
    message?: string
  ) {
    super(message || `Authentication failed for provider: ${provider}`);
    this.name = 'ProviderAuthError';
  }
}

export class GenerationTimeoutError extends Error {
  constructor(
    public readonly taskId: string,
    public readonly timeoutMs: number
  ) {
    super(`Video generation timeout after ${timeoutMs}ms (task: ${taskId})`);
    this.name = 'GenerationTimeoutError';
  }
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example: Using the video provider
 *
 * ```typescript
 * import { createVideoProvider } from './providers';
 *
 * const { provider, config } = createVideoProvider('ray2-flash');
 *
 * const video = await provider.generateVideo({
 *   prompt: 'Close-up of hands cutting soap',
 *   duration: 5,
 *   modelConfig: config,
 * });
 *
 * console.log(`Video generated: ${video.url}`);
 * console.log(`Cost: $${video.cost.toFixed(2)}`);
 * ```
 */

/**
 * Example: Model configuration
 *
 * ```typescript
 * import { ray2FlashConfig } from './models/ray2-flash';
 *
 * console.log(`Model: ${ray2FlashConfig.name}`);
 * console.log(`Cost per 5sec: $${ray2FlashConfig.pricing.per5Second}`);
 * console.log(`Provider: ${ray2FlashConfig.provider}`);
 * ```
 */

/**
 * Example: Running comparison test
 *
 * ```typescript
 * import { compareModels } from '../scripts/compare-video-models';
 *
 * await compareModels({
 *   models: ['ray2-flash', 'kling-turbo', 'wan25'],
 *   prompts: [
 *     { id: 'test-1', prompt: 'Soap cutting', category: 'ASMR' }
 *   ],
 *   outputDir: './test-output',
 * });
 * ```
 */
