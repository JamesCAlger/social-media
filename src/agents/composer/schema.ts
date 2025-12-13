/**
 * Composer Agent Schemas
 * Defines input/output types for video composition
 */

import { z } from 'zod';
import { ScriptSchema } from '../generator/schema';
import { GeneratedAssetSchema, AssetOutputSchema } from '../asset/schema';
import { AudioOutputSchema, VoiceoverResultSchema, SegmentTimingSchema } from '../audio/schema';

// Visual timing for a single segment
export const VisualTimingSchema = z.object({
  segmentIndex: z.number(),
  assetPath: z.string(),
  startTime: z.number(),                  // Seconds from video start
  endTime: z.number(),
  duration: z.number(),
  textOverlay: z.string().nullable(),
  kenBurnsDirection: z.enum(['in', 'out']).default('in')
});

export type VisualTiming = z.infer<typeof VisualTimingSchema>;

// Input schema
export const ComposerInputSchema = z.object({
  script: ScriptSchema,
  assets: AssetOutputSchema,
  audio: AudioOutputSchema,
  contentId: z.string(),
  outputDir: z.string().optional()
});

export type ComposerInput = z.infer<typeof ComposerInputSchema>;

// Final video result
export const FinalVideoSchema = z.object({
  localPath: z.string(),
  r2Url: z.string().optional(),           // URL after R2 upload
  duration: z.number(),
  resolution: z.string(),
  aspectRatio: z.string(),
  fileSize: z.number(),
  processedAt: z.string()
});

export type FinalVideo = z.infer<typeof FinalVideoSchema>;

// Composition details
export const CompositionDetailsSchema = z.object({
  visualTimings: z.array(VisualTimingSchema),
  audioPath: z.string(),
  audioDuration: z.number(),
  hasTextOverlays: z.boolean(),
  ffmpegCommand: z.string().optional()    // For debugging
});

export type CompositionDetails = z.infer<typeof CompositionDetailsSchema>;

// Output schema
export const ComposerOutputSchema = z.object({
  contentId: z.string(),
  finalVideo: FinalVideoSchema,
  composition: CompositionDetailsSchema,
  outputDir: z.string(),
  generatedAt: z.date(),
  totalCost: z.number(),                  // FFmpeg is free, but tracking for consistency
  totalTimeMs: z.number()
});

export type ComposerOutput = z.infer<typeof ComposerOutputSchema>;
