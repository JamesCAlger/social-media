/**
 * Asset Agent Schemas
 * Defines input/output types for visual asset generation
 */

import { z } from 'zod';
import { ScriptSchema } from '../generator/schema';

// Input schema
export const AssetInputSchema = z.object({
  script: ScriptSchema,
  contentId: z.string(),
  niche: z.string().default('finance'),
  outputDir: z.string().optional()  // Base directory for storing assets
});

export type AssetInput = z.infer<typeof AssetInputSchema>;

// Individual asset result
export const GeneratedAssetSchema = z.object({
  segmentIndex: z.number(),
  timestamp: z.string(),
  type: z.enum(['ai_image', 'text_card', 'stock']),
  localPath: z.string(),
  width: z.number(),
  height: z.number(),
  duration: z.number(),             // Duration in seconds for this segment
  prompt: z.string().optional(),    // Prompt used for AI images
  seed: z.number().optional(),      // Seed for reproducibility
  generationTimeMs: z.number().optional()
});

export type GeneratedAsset = z.infer<typeof GeneratedAssetSchema>;

// Output schema
export const AssetOutputSchema = z.object({
  contentId: z.string(),
  assets: z.array(GeneratedAssetSchema),
  totalImages: z.number(),
  textCards: z.number(),
  outputDir: z.string(),
  generatedAt: z.date(),
  totalCost: z.number(),
  totalTimeMs: z.number()
});

export type AssetOutput = z.infer<typeof AssetOutputSchema>;
