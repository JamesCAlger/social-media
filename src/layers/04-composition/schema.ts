import { z } from 'zod';

export const CompositionOutputSchema = z.object({
  contentId: z.string().uuid(),
  finalVideo: z.object({
    storagePath: z.string(),
    r2Url: z.string().url(),
    duration: z.number().min(5).max(35), // Supports 1-3 segments x 5-10 seconds each + optional intro
    resolution: z.literal('720p'),
    aspectRatio: z.literal('9:16'),
    fileSize: z.number(),
    processedAt: z.string(),
    cost: z.number(),
  }),
});

export type CompositionOutput = z.infer<typeof CompositionOutputSchema>;
