/**
 * Generator Agent Schemas
 * Defines input/output types for script generation
 */

import { z } from 'zod';
import { TopicSuggestionSchema } from '../research/schema';

// Input schema
export const GeneratorInputSchema = z.object({
  topic: TopicSuggestionSchema,
  niche: z.string().default('finance'),
  targetDuration: z.number().min(25).max(35).default(30),
  hookStyleOverride: z.enum(['contrarian', 'curiosity', 'shocking_stat', 'story_start']).optional()
});

export type GeneratorInput = z.infer<typeof GeneratorInputSchema>;

// Script segment schema
export const ScriptSegmentSchema = z.object({
  timestamp: z.string(),                    // e.g., "0:00-0:03"
  duration: z.number().min(1).max(15),      // seconds
  narration: z.string().min(1),             // exact words to speak
  visualDescription: z.string().min(1),      // what viewer sees
  visualType: z.enum(['ai_image', 'stock', 'text_card']),
  textOverlay: z.string().nullable(),        // text shown on screen
  pacing: z.enum(['slow', 'medium', 'fast']),
  energy: z.enum(['calm', 'building', 'peak', 'resolution'])
});

export type ScriptSegment = z.infer<typeof ScriptSegmentSchema>;

// Full script schema
export const ScriptSchema = z.object({
  title: z.string().min(1).max(100),
  hook: z.string().min(1).max(200),          // First 3 seconds
  segments: z.array(ScriptSegmentSchema).min(4).max(7),
  cta: z.string().min(1).max(50),            // Call to action
  estimatedDuration: z.number().min(25).max(35),
  hookStyle: z.enum(['contrarian', 'curiosity', 'shocking_stat', 'story_start'])
});

export type Script = z.infer<typeof ScriptSchema>;

// Script metadata
export const ScriptMetadataSchema = z.object({
  targetEmotion: z.string(),
  polarityElement: z.string(),
  shareWorthiness: z.enum(['low', 'medium', 'high']),
  saveWorthiness: z.enum(['low', 'medium', 'high']),
  hasNumberInHook: z.boolean(),
  hasClearTakeaway: z.boolean()
});

export type ScriptMetadata = z.infer<typeof ScriptMetadataSchema>;

// Output schema
export const GeneratorOutputSchema = z.object({
  script: ScriptSchema,
  metadata: ScriptMetadataSchema,
  topicUsed: z.string(),
  category: z.string(),
  generatedAt: z.date(),
  cost: z.number()
});

export type GeneratorOutput = z.infer<typeof GeneratorOutputSchema>;
