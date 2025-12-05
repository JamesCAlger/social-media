import { z } from 'zod';

// Text overlay schema for intro and segment labels
export const TextOverlaysSchema = z.object({
  introText: z.string().max(25), // Main intro text - keep short to fit on screen (e.g., "history unmasked")
  introSubtext: z.string().max(30).optional(), // Optional secondary text
  segmentLabels: z.array(z.string().max(20)).length(3), // One label per segment (e.g., ["january", "february", "march"])
});

export type TextOverlays = z.infer<typeof TextOverlaysSchema>;

export const IdeaOutputSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string(),
  idea: z.string().min(10).max(200),
  caption: z.string().min(10).max(300),
  culturalContext: z.string(),
  environment: z.string().max(300),
  soundConcept: z.string().max(200),
  textOverlays: TextOverlaysSchema, // New: text overlay content
  status: z.literal('for_production'),
});

export type IdeaOutput = z.infer<typeof IdeaOutputSchema>;
