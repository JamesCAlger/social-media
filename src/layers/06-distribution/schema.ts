import { z } from 'zod';

export const PlatformPostSchema = z.object({
  platform: z.enum(['instagram', 'tiktok', 'youtube']),
  postId: z.string(),
  postUrl: z.string(),
  postedAt: z.string(),
  status: z.enum(['posted', 'failed']),
  error: z.string().optional(),
});

export const DistributionOutputSchema = z.object({
  contentId: z.string().uuid(),
  posts: z.array(PlatformPostSchema),
});

export type PlatformPost = z.infer<typeof PlatformPostSchema>;
export type DistributionOutput = z.infer<typeof DistributionOutputSchema>;
