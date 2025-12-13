/**
 * Shared types for all Educational Pipeline agents
 */

import { z } from 'zod';

// Base agent interface
export interface Agent<TInput, TOutput> {
  name: string;
  execute(input: TInput): Promise<TOutput>;
}

// Cost tracking
export interface CostEntry {
  component: string;
  provider: string;
  cost: number;
  timestamp: Date;
}

// Common segment structure for 30-second videos
export const ScriptSegmentSchema = z.object({
  timestamp: z.string(),           // e.g., "0:00-0:03"
  duration: z.number(),            // seconds
  narration: z.string(),           // exact words to say
  visualDescription: z.string(),   // what viewer sees
  visualType: z.enum(['ai_image', 'stock', 'text_card']),
  textOverlay: z.string().nullable(),
  pacing: z.enum(['slow', 'medium', 'fast']),
  energy: z.enum(['calm', 'building', 'peak', 'resolution'])
});

export type ScriptSegment = z.infer<typeof ScriptSegmentSchema>;

// Full script structure
export const ScriptSchema = z.object({
  title: z.string(),
  hook: z.string(),
  segments: z.array(ScriptSegmentSchema).min(4).max(6),
  cta: z.string(),
  estimatedDuration: z.number().min(28).max(32),
  hookStyle: z.enum(['contrarian', 'curiosity', 'shocking_stat', 'story_start'])
});

export type Script = z.infer<typeof ScriptSchema>;

// Script metadata
export const ScriptMetadataSchema = z.object({
  targetEmotion: z.string(),
  polarityElement: z.string(),
  shareWorthiness: z.enum(['low', 'medium', 'high']),
  saveWorthiness: z.enum(['low', 'medium', 'high'])
});

export type ScriptMetadata = z.infer<typeof ScriptMetadataSchema>;

// Topic categories
export type TopicCategory =
  | 'savings_budgeting'
  | 'investing_basics'
  | 'money_psychology'
  | 'myth_busting'
  | 'timely_news';

// Hook styles
export type HookStyle = 'contrarian' | 'curiosity' | 'shocking_stat' | 'story_start';

// Quality scores
export interface QualityScores {
  hook: number;
  pacing: number;
  uniqueAngle: number;
  engagement: number;
  clarity: number;
  overall: number;
}

// Safety flags
export interface SafetyFlag {
  rule: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

// Pipeline result
export interface PipelineResult {
  contentId: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'posted' | 'failed';
  qualityScore: number;
  iterations: number;
  safetyFlags: SafetyFlag[];
  totalCost: number;
  videoUrl?: string;
}
