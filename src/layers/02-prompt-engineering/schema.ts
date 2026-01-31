import { z } from 'zod';

export const VideoPromptSchema = z.object({
  sequence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  videoPrompt: z.string().min(50).max(1500),
  audioPrompt: z.string().min(10).max(500),
  duration: z.union([z.literal(5), z.literal(7), z.literal(10)]),
  resolution: z.literal('720p'),
  aspectRatio: z.literal('9:16'),
});

export const PromptOutputSchema = z.object({
  contentId: z.string().uuid(),
  prompts: z.array(VideoPromptSchema).min(1).max(3),
});

export type VideoPrompt = z.infer<typeof VideoPromptSchema>;
export type PromptOutput = z.infer<typeof PromptOutputSchema>;
