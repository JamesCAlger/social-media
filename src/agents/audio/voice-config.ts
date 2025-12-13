/**
 * Voice Configuration for ElevenLabs
 * Custom voice clone settings and niche-specific adjustments
 */

import { VoiceSettings } from './schema';

// Voice clone ID from environment or default
export const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'default-voice-id';

// Base voice settings optimized for educational content
export const baseVoiceSettings: VoiceSettings = {
  stability: 0.5,           // Balance between expressiveness and consistency
  similarityBoost: 0.85,    // High similarity to cloned voice
  style: 0.3,               // Some style variation for natural feel
  useSpeakerBoost: true     // Enhance voice clarity
};

// Speed adjustments by niche/topic
export const speedByNiche: Record<string, number> = {
  finance: 1.08,            // Slightly fast - confident, urgent
  investing: 1.05,          // Slightly fast - dynamic
  budgeting: 1.0,           // Normal - practical, clear
  psychology: 1.0,          // Normal - thoughtful, measured
  history: 0.98,            // Slightly slower - storytelling pace
  science: 1.05,            // Slightly fast - enthusiastic
  health: 1.0,              // Normal - clear, trustworthy
  productivity: 1.05,       // Slightly fast - energetic
  default: 1.05             // Default to slightly fast
};

/**
 * Get voice speed for a given niche
 */
export function getVoiceSpeed(niche: string): number {
  return speedByNiche[niche.toLowerCase()] || speedByNiche.default;
}

/**
 * ElevenLabs model configuration
 */
export const elevenlabsConfig = {
  // Model to use - eleven_turbo_v2 is fast and high quality
  modelId: 'eleven_turbo_v2',

  // Output format
  outputFormat: 'mp3_44100_128',

  // Cost per character (approximate)
  costPerCharacter: 0.0001  // ~$0.10 per 1000 characters
};

/**
 * Calculate estimated cost for voiceover
 */
export function estimateVoiceoverCost(text: string): number {
  return text.length * elevenlabsConfig.costPerCharacter;
}

/**
 * Post-processing configuration
 * Applied after ElevenLabs generation
 */
export const postProcessingConfig = {
  normalize: true,            // Consistent volume levels
  compression: {
    threshold: -18,           // dB
    ratio: 3,
    attack: 10,               // ms
    release: 100              // ms
  },
  eq: {
    lowCut: 80,               // Hz - remove rumble
    presence: {
      frequency: 3000,        // Hz - clarity boost
      gain: 2                 // dB
    }
  }
};

/**
 * Silence detection settings
 * Used to calculate segment timings from audio
 */
export const silenceDetectionConfig = {
  minSilenceDuration: 0.3,    // Minimum silence to consider a pause
  silenceThreshold: -40,      // dB threshold for silence
  paddingMs: 50               // Padding around detected segments
};
