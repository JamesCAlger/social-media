/**
 * Critic Agent Schemas
 * Defines input/output types for script evaluation
 */

import { z } from 'zod';
import { ScriptSchema, ScriptMetadataSchema } from '../generator/schema';

// Quality dimensions to evaluate
export const QualityDimensionSchema = z.object({
  dimension: z.enum([
    'hook_strength',
    'educational_value',
    'pacing_rhythm',
    'save_worthiness',
    'structural_compliance',
    'emotional_resonance',
    'clarity_simplicity'
  ]),
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  feedback: z.string(),
  examples: z.array(z.string()).optional()
});

export type QualityDimension = z.infer<typeof QualityDimensionSchema>;

// Critical issue that must be fixed
export const CriticalIssueSchema = z.object({
  type: z.enum([
    'duration_violation',      // Total duration outside 25-35 seconds
    'hook_too_long',           // Hook segment > 3 seconds
    'no_specific_numbers',     // Missing concrete statistics/numbers
    'weak_hook',               // Hook doesn't create curiosity gap
    'no_takeaway',             // Missing clear actionable insight
    'pacing_issue',            // Visual changes too slow
    'generic_advice',          // Content is too generic/known
    'compliance_risk'          // Potential financial advice issue
  ]),
  description: z.string(),
  segment: z.number().optional(),   // Which segment has the issue (0-indexed)
  severity: z.enum(['critical', 'major', 'minor'])
});

export type CriticalIssue = z.infer<typeof CriticalIssueSchema>;

// Input schema
export const CriticInputSchema = z.object({
  script: ScriptSchema,
  metadata: ScriptMetadataSchema,
  niche: z.string().default('finance'),
  iterationNumber: z.number().min(1).default(1)
});

export type CriticInput = z.infer<typeof CriticInputSchema>;

// Output schema
export const CriticOutputSchema = z.object({
  overallScore: z.number().min(0).max(100),
  passed: z.boolean(),                          // Score >= 80
  dimensions: z.array(QualityDimensionSchema),
  criticalIssues: z.array(CriticalIssueSchema),
  strengths: z.array(z.string()),               // What's working well
  improvementAreas: z.array(z.string()),        // What needs work
  specificSuggestions: z.array(z.string()),     // Concrete improvement ideas
  evaluatedAt: z.date(),
  cost: z.number()
});

export type CriticOutput = z.infer<typeof CriticOutputSchema>;
