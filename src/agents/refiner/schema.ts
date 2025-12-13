/**
 * Refiner Agent Schemas
 * Defines input/output types for script refinement
 */

import { z } from 'zod';
import { ScriptSchema, ScriptMetadataSchema } from '../generator/schema';
import { CriticOutputSchema } from '../critic/schema';

// Input schema - combines original script with critic feedback
export const RefinerInputSchema = z.object({
  script: ScriptSchema,
  metadata: ScriptMetadataSchema,
  criticFeedback: CriticOutputSchema,
  niche: z.string().default('finance'),
  iterationNumber: z.number().min(1).default(1),
  maxIterations: z.number().min(1).max(5).default(3)
});

export type RefinerInput = z.infer<typeof RefinerInputSchema>;

// Track what changes were made
export const ChangeLogSchema = z.object({
  segmentIndex: z.number().optional(),           // Which segment was changed (if applicable)
  field: z.string(),                             // What field was modified
  before: z.string(),                            // Original value (truncated)
  after: z.string(),                             // New value (truncated)
  reason: z.string()                             // Why this change was made
});

export type ChangeLog = z.infer<typeof ChangeLogSchema>;

// Output schema
export const RefinerOutputSchema = z.object({
  refinedScript: ScriptSchema,
  refinedMetadata: ScriptMetadataSchema,
  changesMade: z.array(ChangeLogSchema),
  addressedIssues: z.array(z.string()),          // Which critical issues were addressed
  remainingConcerns: z.array(z.string()),        // Issues that couldn't be fully resolved
  iterationNumber: z.number(),
  refinedAt: z.date(),
  cost: z.number()
});

export type RefinerOutput = z.infer<typeof RefinerOutputSchema>;
