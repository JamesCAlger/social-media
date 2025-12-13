/**
 * Quality Loop Schemas
 * Defines input/output types for the quality loop orchestration
 */

import { z } from 'zod';
import { TopicSuggestionSchema } from '../research/schema';
import { ScriptSchema, ScriptMetadataSchema } from '../generator/schema';
import { CriticOutputSchema } from '../critic/schema';
import { ChangeLogSchema } from '../refiner/schema';

// Input schema
export const QualityLoopInputSchema = z.object({
  topic: TopicSuggestionSchema,
  niche: z.string().default('finance'),
  targetScore: z.number().min(50).max(100).default(80),
  maxIterations: z.number().min(1).max(5).default(3)
});

export type QualityLoopInput = z.infer<typeof QualityLoopInputSchema>;

// Track each iteration
export const IterationRecordSchema = z.object({
  iteration: z.number(),
  script: ScriptSchema,
  metadata: ScriptMetadataSchema,
  criticOutput: CriticOutputSchema,
  changesMade: z.array(ChangeLogSchema).optional(),  // Only for iterations > 1
  durationMs: z.number()
});

export type IterationRecord = z.infer<typeof IterationRecordSchema>;

// Output schema
export const QualityLoopOutputSchema = z.object({
  finalScript: ScriptSchema,
  finalMetadata: ScriptMetadataSchema,
  finalScore: z.number(),
  passed: z.boolean(),
  iterations: z.array(IterationRecordSchema),
  totalIterations: z.number(),
  scoreProgression: z.array(z.number()),          // Score at each iteration
  totalCost: z.number(),
  totalDurationMs: z.number(),
  completedAt: z.date()
});

export type QualityLoopOutput = z.infer<typeof QualityLoopOutputSchema>;
