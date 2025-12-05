import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { IdeaOutput } from '../../../core/types';
import { logger } from '../../../core/logger';
import { retry } from '../../../utils/retry';
import {
  IDEA_GENERATION_SYSTEM_PROMPT,
  IDEA_GENERATION_USER_PROMPT,
} from '../prompts';

export class OpenAIIdeaProvider {
  private client: OpenAI;
  private model: string;
  private temperature: number;

  constructor(apiKey: string, model: string = 'gpt-4', temperature: number = 0.8) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.temperature = temperature;
  }

  async generateIdea(): Promise<IdeaOutput> {
    logger.info('Generating idea with OpenAI', { model: this.model });

    const response = await retry(
      async () => {
        return this.client.chat.completions.create({
          model: this.model,
          max_tokens: 1024,
          temperature: this.temperature,
          messages: [
            {
              role: 'system',
              content: IDEA_GENERATION_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: IDEA_GENERATION_USER_PROMPT,
            },
          ],
        });
      },
      {
        maxAttempts: 3,
        backoffMs: 1000,
      }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Parse text overlays with fallback defaults
    const textOverlays = parsed.TextOverlays || {};
    const parsedTextOverlays = {
      introText: textOverlays.IntroText || 'the journey begins',
      introSubtext: textOverlays.IntroSubtext || undefined,
      segmentLabels: Array.isArray(textOverlays.SegmentLabels) && textOverlays.SegmentLabels.length === 3
        ? textOverlays.SegmentLabels
        : ['begin', 'reveal', 'complete'],
    };

    // Transform to our schema
    const idea: IdeaOutput = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      idea: parsed.Idea,
      caption: parsed.Caption,
      culturalContext: parsed.CulturalContext || 'Unknown',
      environment: parsed.Environment,
      soundConcept: parsed.Sound,
      textOverlays: parsedTextOverlays,
      status: 'for_production',
    };

    logger.info('Idea generated successfully', { id: idea.id, textOverlays: parsedTextOverlays });
    return idea;
  }

  estimateCost(): number {
    // Approximate cost for GPT-4
    // Input: ~500 tokens @ $30/MTok = $0.015
    // Output: ~300 tokens @ $60/MTok = $0.018
    return 0.033; // ~$0.03 with buffer
  }
}
