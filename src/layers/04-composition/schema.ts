import { z } from 'zod';

export const CompositionOutputSchema = z.object({
  contentId: z.string().uuid(),
  finalVideo: z.object({
    storagePath: z.string(),
    r2Url: z.string().url(),
    duration: z.number().min(14).max(20), // Extended to allow intro (up to ~17.5s with 2.5s intro)
    resolution: z.literal('720p'),
    aspectRatio: z.literal('9:16'),
    fileSize: z.number(),
    processedAt: z.string(),
    cost: z.number(),
  }),
});

export type CompositionOutput = z.infer<typeof CompositionOutputSchema>;
