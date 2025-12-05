import { z } from 'zod';

export const ReviewOutputSchema = z.object({
  contentId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected', 'edited']),
  reviewedAt: z.string(),
  reviewedBy: z.string(),
  notes: z.string().optional(),
  editedCaption: z.string().optional(),
});

export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;
