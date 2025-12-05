import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { IdeaOutput } from '../../../core/types';
import { logger } from '../../../core/logger';
import { retry } from '../../../utils/retry';
import {
  IDEA_GENERATION_SYSTEM_PROMPT,
  IDEA_GENERATION_USER_PROMPT,
} from '../prompts';

export class AnthropicIdeaProvider {
  private client: Anthropic;
  private model: string;
  private temperature: number;

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022', temperature: number = 0.8) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.temperature = temperature;
  }

  async generateIdea(): Promise<IdeaOutput> {
    logger.info('Generating idea with Anthropic', { model: this.model });

    const response = await retry(
      async () => {
        return this.client.messages.create({
          model: this.model,
          max_tokens: 1024,
          temperature: this.temperature,
          system: IDEA_GENERATION_SYSTEM_PROMPT,
          messages: [
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

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
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
    // Approximate cost for Claude 3.5 Sonnet
    // Input: ~500 tokens @ $3/MTok = $0.0015
    // Output: ~300 tokens @ $15/MTok = $0.0045
    return 0.006; // ~$0.01 with buffer
  }
}
