/**
 * Audio Agent Schemas
 * Defines input/output types for voiceover and audio generation
 */

import { z } from 'zod';
import { ScriptSchema } from '../generator/schema';

// Input schema
export const AudioInputSchema = z.object({
  script: ScriptSchema,
  contentId: z.string(),
  niche: z.string().default('finance'),
  outputDir: z.string().optional()
});

export type AudioInput = z.infer<typeof AudioInputSchema>;

// Voice settings schema
export const VoiceSettingsSchema = z.object({
  stability: z.number().min(0).max(1).default(0.5),
  similarityBoost: z.number().min(0).max(1).default(0.85),
  style: z.number().min(0).max(1).default(0.3),
  useSpeakerBoost: z.boolean().default(true)
});

export type VoiceSettings = z.infer<typeof VoiceSettingsSchema>;

// Voiceover result
export const VoiceoverResultSchema = z.object({
  localPath: z.string(),
  duration: z.number(),                   // Duration in seconds
  provider: z.literal('elevenlabs'),
  voiceId: z.string(),
  isCustomClone: z.boolean(),
  speed: z.number(),
  cost: z.number(),
  characterCount: z.number()
});

export type VoiceoverResult = z.infer<typeof VoiceoverResultSchema>;

// Segment timing
export const SegmentTimingSchema = z.object({
  segmentIndex: z.number(),
  startTime: z.number(),                  // Seconds from start
  endTime: z.number(),                    // Seconds from start
  duration: z.number(),                   // Duration in seconds
  narration: z.string()
});

export type SegmentTiming = z.infer<typeof SegmentTimingSchema>;

// Output schema
export const AudioOutputSchema = z.object({
  contentId: z.string(),
  voiceover: VoiceoverResultSchema,
  segmentTimings: z.array(SegmentTimingSchema),
  outputDir: z.string(),
  generatedAt: z.date(),
  totalCost: z.number(),
  totalTimeMs: z.number()
});

export type AudioOutput = z.infer<typeof AudioOutputSchema>;
