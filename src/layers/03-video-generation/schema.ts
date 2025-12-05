import { z } from 'zod';

export const GeneratedVideoSchema = z.object({
  sequence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  storagePath: z.string(),
  duration: z.number().min(4).max(6),
  resolution: z.string(),
  aspectRatio: z.string(),
  hasAudio: z.literal(true),
  generatedAt: z.string(),
  cost: z.number(),
});

export const VideoGenerationOutputSchema = z.object({
  contentId: z.string().uuid(),
  videos: z.array(GeneratedVideoSchema).length(3),
});

export type GeneratedVideo = z.infer<typeof GeneratedVideoSchema>;
export type VideoGenerationOutput = z.infer<typeof VideoGenerationOutputSchema>;
