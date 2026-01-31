/**
 * Hook Variants Configuration for A/B Testing
 *
 * Based on viral ASMR content research, these hook types have been
 * identified as high-performers for glass fruit cutting content.
 */

import { HookStyle } from '../core/types';

export interface HookVariant {
  /** Hook style identifier */
  style: HookStyle;

  /** Display name for logging/UI */
  name: string;

  /** Description of the hook approach */
  description: string;

  /** Text overlay for intro (if applicable) */
  introText?: string;

  /** Secondary text overlay */
  introSubtext?: string;

  /** Whether this hook uses text overlays */
  usesTextOverlay: boolean;

  /** Recommended video duration (seconds) */
  recommendedDuration: number;

  /** Whether to start mid-action or with setup */
  startMidAction: boolean;

  /** Priority weight for A/B testing (higher = more likely to be selected) */
  weight: number;

  /** Notes on when this hook works best */
  bestFor: string;
}

/**
 * All available hook variants for A/B testing
 */
export const HOOK_VARIANTS: HookVariant[] = [
  {
    style: 'immediate_action',
    name: 'Immediate Action',
    description: 'Start mid-slice, no setup, pure visual/sound payoff',
    usesTextOverlay: false,
    recommendedDuration: 5,
    startMidAction: true,
    weight: 20,
    bestFor: 'Users who scroll quickly - instant gratification',
  },
  {
    style: 'wait_for_it',
    name: 'Wait For It',
    description: 'Build anticipation with hovering knife',
    introText: 'wait for it',
    introSubtext: '...',
    usesTextOverlay: true,
    recommendedDuration: 8,
    startMidAction: false,
    weight: 15,
    bestFor: 'Creating suspense and anticipation',
  },
  {
    style: 'question',
    name: 'Question Hook',
    description: 'Engagement hook that makes viewers think',
    introText: 'why is this',
    introSubtext: 'so satisfying?',
    usesTextOverlay: true,
    recommendedDuration: 8,
    startMidAction: false,
    weight: 15,
    bestFor: 'Driving comments and engagement',
  },
  {
    style: 'result_first',
    name: 'Result First',
    description: 'Show gems spilling out first, then the slice',
    introText: 'how did they',
    introSubtext: 'do this?',
    usesTextOverlay: true,
    recommendedDuration: 10,
    startMidAction: true, // Start with result
    weight: 10,
    bestFor: 'Curiosity-driven viewers who want to see "how"',
  },
  {
    style: 'mystery',
    name: 'Mystery',
    description: 'Create intrigue about what\'s hidden inside',
    introText: 'what\'s inside',
    introSubtext: '?',
    usesTextOverlay: true,
    recommendedDuration: 8,
    startMidAction: false,
    weight: 15,
    bestFor: 'Creating curiosity gap',
  },
  {
    style: 'sound_focus',
    name: 'Sound Focus',
    description: 'Audio-first hook for headphone users',
    introText: 'sound on',
    introSubtext: '🔊',
    usesTextOverlay: true,
    recommendedDuration: 8,
    startMidAction: false,
    weight: 10,
    bestFor: 'ASMR enthusiasts with headphones',
  },
  {
    style: 'guess_the_color',
    name: 'Guess The Color',
    description: 'Engagement hook asking viewers to predict',
    introText: 'guess the color',
    introSubtext: 'inside',
    usesTextOverlay: true,
    recommendedDuration: 8,
    startMidAction: false,
    weight: 15,
    bestFor: 'Driving comments with predictions',
  },
];

/**
 * Get a hook variant by style
 */
export function getHookVariant(style: HookStyle): HookVariant | undefined {
  return HOOK_VARIANTS.find(v => v.style === style);
}

/**
 * Select a random hook variant using weighted selection
 */
export function selectRandomHookVariant(): HookVariant {
  const totalWeight = HOOK_VARIANTS.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;

  for (const variant of HOOK_VARIANTS) {
    random -= variant.weight;
    if (random <= 0) {
      return variant;
    }
  }

  return HOOK_VARIANTS[0]; // Fallback
}

/**
 * Select a specific subset of hooks for A/B testing
 */
export function selectHooksForABTest(count: number = 3): HookVariant[] {
  // Shuffle and take top N
  const shuffled = [...HOOK_VARIANTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get text overlays for a specific hook style
 */
export function getHookTextOverlays(style: HookStyle): { introText: string; introSubtext?: string } | null {
  const variant = getHookVariant(style);
  if (!variant || !variant.usesTextOverlay) {
    return null;
  }

  return {
    introText: variant.introText || '',
    introSubtext: variant.introSubtext,
  };
}

/**
 * A/B Test Configuration
 */
export interface ABTestConfig {
  /** Test name for tracking */
  testName: string;

  /** Hook styles being tested */
  hookStyles: HookStyle[];

  /** Start date of test */
  startDate: Date;

  /** Number of videos per hook style */
  videosPerStyle: number;

  /** Metrics to track */
  metrics: ('views' | 'likes' | 'comments' | 'shares' | 'watch_time' | 'loop_rate')[];
}

/**
 * Create a new A/B test configuration
 */
export function createABTest(
  testName: string,
  hookStyles: HookStyle[],
  videosPerStyle: number = 5
): ABTestConfig {
  return {
    testName,
    hookStyles,
    startDate: new Date(),
    videosPerStyle,
    metrics: ['views', 'likes', 'comments', 'watch_time'],
  };
}

/**
 * Recommended A/B test for glass fruit content
 */
export const RECOMMENDED_AB_TEST: ABTestConfig = {
  testName: 'glass_fruit_hooks_v1',
  hookStyles: [
    'immediate_action',  // Pure visual - no text
    'wait_for_it',       // Anticipation builder
    'guess_the_color',   // Engagement driver
  ],
  startDate: new Date(),
  videosPerStyle: 5,
  metrics: ['views', 'likes', 'comments', 'watch_time'],
};

/**
 * Log hook variant usage for tracking
 */
export function logHookUsage(contentId: string, hookStyle: HookStyle): void {
  console.log(`[Hook Tracking] Content ${contentId} using hook: ${hookStyle}`);
}
