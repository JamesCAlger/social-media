/**
 * Research Agent Schemas
 * Defines input/output types for topic research
 */

import { z } from 'zod';

// Input schema
export const ResearchInputSchema = z.object({
  niche: z.string().default('finance'),
  category: z.string().optional(),  // Specific category to focus on
  excludeTopics: z.array(z.string()).optional(),  // Recently used topics to avoid
  count: z.number().min(1).max(10).default(3)  // Number of topics to generate
});

export type ResearchInput = z.infer<typeof ResearchInputSchema>;

// Topic suggestion schema
export const TopicSuggestionSchema = z.object({
  topic: z.string(),
  whyNow: z.string(),  // Timeliness factor
  competitorGap: z.string(),  // What existing content misses
  suggestedAngle: z.string(),  // Our unique take
  emotionalTrigger: z.enum(['curiosity', 'outrage', 'surprise', 'aspiration', 'fear']),
  potentialHooks: z.array(z.string()).min(3).max(5),
  confidence: z.number().min(0).max(100),
  category: z.string()
});

export type TopicSuggestion = z.infer<typeof TopicSuggestionSchema>;

// Output schema
export const ResearchOutputSchema = z.object({
  topics: z.array(TopicSuggestionSchema).min(1),
  researchedAt: z.date(),
  niche: z.string(),
  cost: z.number()
});

export type ResearchOutput = z.infer<typeof ResearchOutputSchema>;

// Performance data for topic selection
export const TopicPerformanceSchema = z.object({
  topic: z.string(),
  category: z.string(),
  timesUsed: z.number(),
  avgSaveRate: z.number(),
  avgShareRate: z.number(),
  avgCompletion: z.number(),
  lastUsed: z.date().optional()
});

export type TopicPerformance = z.infer<typeof TopicPerformanceSchema>;
