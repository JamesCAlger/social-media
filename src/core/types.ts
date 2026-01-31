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

// =============================================================================
// Multi-Account Types
// =============================================================================

/** Available niche types */
export type NicheType = 'asmr_pottery' | 'oddly_satisfying' | 'nature_sounds' | 'craft_process' | 'cute_fruits_asmr' | 'custom';

/**
 * Hook styles for the first few seconds of video
 * Based on viral ASMR content research
 */
export type HookStyle =
  | 'immediate_action'    // No text, start mid-slice, pure visual/sound
  | 'wait_for_it'         // "Wait for it..." text, build anticipation
  | 'question'            // "Why is this so satisfying?" engagement hook
  | 'result_first'        // Show gems spilling out first, then the slice
  | 'mystery'             // "What's inside this crystal fruit?"
  | 'sound_focus'         // "Turn your sound on" text overlay
  | 'guess_the_color'     // "Guess the color inside" - engagement hook
  | 'visual'              // Pure visual hook (legacy)
  | 'text_overlay';       // Generic text overlay (legacy)

/**
 * Content Type - A reusable content configuration
 * Each account can have multiple content types for variety
 */
export interface ContentType {
  /** Unique name for this content type (e.g., "glass-fruit-cutting") */
  name: string;

  /** Weight for weighted selection (higher = more likely). Default: 1 */
  weight?: number;

  /** Content niche/theme */
  niche: NicheType;

  /** Custom niche description (used when niche is 'custom') */
  nicheDescription?: string;

  /** Number of video segments to generate (default: 3) */
  segmentCount: 1 | 2 | 3;

  /** Duration per segment in seconds (default: 5) */
  segmentDuration: 5 | 7 | 10;

  /** Hook style for first few seconds */
  hookStyle: 'visual' | 'text_overlay' | 'question';

  /** Audio type for videos */
  audioType: 'asmr_native' | 'trending_audio' | 'silent';

  /** Hashtag strategy */
  hashtagStrategy: 'niche_specific' | 'trending' | 'mixed';

  /** Custom hashtags to always include */
  customHashtags?: string[];
}

/** How to select which content type to use */
export type ContentTypeSelectionMode = 'random' | 'rotation' | 'weighted';

/**
 * Content strategy configuration for A/B testing
 * @deprecated Use contentTypes array instead for new accounts
 */
export interface ContentStrategy {
  /** Content niche/theme */
  niche: NicheType;

  /** Custom niche description (used when niche is 'custom') */
  nicheDescription?: string;

  /** Content format type */
  contentType: 'reels_only' | 'carousels_only' | 'mixed';

  /** Ratio of reels to carousels (0.0 - 1.0, e.g., 0.7 = 70% reels) */
  reelsToCarouselRatio?: number;

  /** Video length in seconds (total duration) */
  videoLength: 7 | 10 | 15 | 30;

  /** Number of video segments to generate (default: 3) */
  segmentCount?: 1 | 2 | 3;

  /** Duration per segment in seconds (default: 5) */
  segmentDuration?: 5 | 7 | 10;

  /** Hook style for first few seconds */
  hookStyle: 'visual' | 'text_overlay' | 'question';

  /** Audio type for videos */
  audioType: 'asmr_native' | 'trending_audio' | 'silent';

  /** Optional overrides for idea generation prompts */
  ideaPromptOverrides?: Record<string, string>;

  /** Hashtag strategy */
  hashtagStrategy: 'niche_specific' | 'trending' | 'mixed';

  /** Custom hashtags to always include */
  customHashtags?: string[];
}

/**
 * Posting schedule configuration
 */
export interface PostingSchedule {
  /** Number of posts per day */
  postsPerDay: 1 | 2 | 3;

  /** Posting times in 24h format UTC (e.g., ["09:00", "15:00", "21:00"]) */
  postingTimes: string[];

  /** Days of week to post (0 = Sunday, 6 = Saturday) */
  activeDays: number[];

  /** Timezone for the schedule (e.g., "America/New_York") */
  timezone: string;
}

/**
 * Instagram/Social media account
 */
export interface Account {
  id: string;
  name: string;
  slug: string;
  description?: string;

  /** Platform type */
  platform: 'instagram' | 'tiktok' | 'youtube';

  /** Platform-specific account ID */
  businessAccountId: string;

  /** Access token for API calls */
  accessToken: string;

  /** Token expiration date */
  tokenExpiresAt?: Date;

  /** Facebook App ID for token refresh */
  facebookAppId?: string;

  /** Facebook App Secret for token refresh */
  facebookAppSecret?: string;

  /**
   * Content strategy for A/B testing
   * @deprecated Use contentTypes array instead
   */
  contentStrategy?: ContentStrategy;

  /**
   * Multiple content types for variety
   * Pipeline will select one based on contentTypeSelectionMode
   */
  contentTypes?: ContentType[];

  /**
   * How to select which content type to use
   * - 'random': Pick randomly (optionally weighted)
   * - 'rotation': Cycle through in order
   * - 'weighted': Pick based on weight values
   */
  contentTypeSelectionMode?: ContentTypeSelectionMode;

  /**
   * Index of last used content type (for rotation mode)
   */
  lastContentTypeIndex?: number;

  /** Posting schedule */
  postingSchedule: PostingSchedule;

  /** Whether the account is active */
  isActive: boolean;

  /** Last successful post timestamp */
  lastPostAt?: Date;

  /** Last error message */
  lastError?: string;

  /** Number of consecutive failures */
  consecutiveFailures: number;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Daily metrics snapshot for an account
 */
export interface AccountMetrics {
  id: string;
  accountId: string;

  /** Date of the metrics snapshot */
  recordedAt: Date;

  /** Current follower count */
  followers: number;

  /** Followers gained since last snapshot */
  followersGained: number;

  /** Followers lost since last snapshot */
  followersLost: number;

  /** Number of posts published on this day */
  postsPublished: number;

  /** Total reach for the day */
  totalReach: number;

  /** Total impressions for the day */
  totalImpressions: number;

  /** Total engagement (likes, comments, shares, saves) */
  totalEngagement: number;

  /** Engagement rate (engagement / followers) */
  engagementRate?: number;

  /** Growth rate ((new - old) / old) */
  growthRate?: number;
}

/**
 * Result of a pipeline run for an account
 */
export interface PipelineResult {
  accountId: string;
  accountName: string;
  contentId?: string;
  success: boolean;
  error?: string;
  duration: number;
  cost?: number;
}

/**
 * Account comparison data for analytics
 */
export interface AccountComparison {
  accountId: string;
  accountName: string;
  niche: string;
  videoLength: number;
  hookStyle: string;
  postsPerDay: number;
  startFollowers: number;
  endFollowers: number;
  totalFollowersGained: number;
  avgDailyGrowthRate: number;
  avgEngagementRate: number;
  totalPosts: number;
  daysTracked: number;
}
