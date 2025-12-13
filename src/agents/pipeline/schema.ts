/**
 * Educational Pipeline Schemas
 * Defines input/output types for the full pipeline orchestration
 */

import { z } from 'zod';
import { TopicSuggestionSchema } from '../research/schema';
import { ScriptSchema, ScriptMetadataSchema } from '../generator/schema';
import { CriticOutputSchema } from '../critic/schema';
import { AssetOutputSchema } from '../asset/schema';
import { AudioOutputSchema } from '../audio/schema';
import { ComposerOutputSchema, FinalVideoSchema } from '../composer/schema';

// Pipeline configuration
export const PipelineConfigSchema = z.object({
  niche: z.string().default('finance'),
  targetQualityScore: z.number().min(50).max(100).default(80),
  maxQualityIterations: z.number().min(1).max(5).default(3),
  mockMode: z.boolean().default(false),
  outputBaseDir: z.string().default('./content')
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

// Pipeline input
export const PipelineInputSchema = z.object({
  niche: z.string().default('finance'),
  topic: TopicSuggestionSchema.optional(),  // If not provided, Research Agent will find one
  config: PipelineConfigSchema.optional()
});

export type PipelineInput = z.infer<typeof PipelineInputSchema>;

// Stage result tracking
export const StageResultSchema = z.object({
  stage: z.string(),
  success: z.boolean(),
  durationMs: z.number(),
  cost: z.number(),
  error: z.string().optional()
});

export type StageResult = z.infer<typeof StageResultSchema>;

// Pipeline output
export const PipelineOutputSchema = z.object({
  contentId: z.string(),
  niche: z.string(),

  // Topic and Script
  topic: TopicSuggestionSchema,
  script: ScriptSchema,
  scriptMetadata: ScriptMetadataSchema,
  qualityScore: z.number(),
  qualityIterations: z.number(),

  // Generated content
  finalVideo: FinalVideoSchema,
  videoR2Url: z.string().optional(),

  // Stage results
  stageResults: z.array(StageResultSchema),

  // Costs and timing
  totalCost: z.number(),
  totalDurationMs: z.number(),
  generatedAt: z.date(),

  // Review status
  status: z.enum(['pending_review', 'approved', 'rejected', 'posted']).default('pending_review'),
  reviewFlags: z.array(z.string()).optional()
});

export type PipelineOutput = z.infer<typeof PipelineOutputSchema>;

// Review request (sent to Telegram)
export const ReviewRequestSchema = z.object({
  contentId: z.string(),
  title: z.string(),
  hook: z.string(),
  duration: z.number(),
  qualityScore: z.number(),
  videoUrl: z.string(),
  thumbnailUrl: z.string().optional(),
  flags: z.array(z.string()),
  priority: z.enum(['high', 'medium', 'low'])
});

export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;
