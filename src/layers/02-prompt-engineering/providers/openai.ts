import OpenAI from 'openai';
import { PromptOutput } from '../../../core/types';
import { IdeaOutput } from '../../../core/types';
import { logger } from '../../../core/logger';
import { retry } from '../../../utils/retry';
import {
  createPromptEngineeringSystemPrompt,
  createPromptEngineeringUserPrompt,
  PromptConfig,
} from '../templates';

export class OpenAIPromptProvider {
  private client: OpenAI;
  private model: string;
  private temperature: number;

  constructor(apiKey: string, model: string = 'gpt-4', temperature: number = 0.7) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.temperature = temperature;
  }

  async generatePrompts(idea: IdeaOutput, promptConfig?: PromptConfig): Promise<PromptOutput> {
    const config = promptConfig || { segmentCount: 3, segmentDuration: 5 };

    logger.info('Generating prompts with OpenAI', {
      model: this.model,
      ideaId: idea.id,
      segmentCount: config.segmentCount,
      segmentDuration: config.segmentDuration,
    });

    const response = await retry(
      async () => {
        return this.client.chat.completions.create({
          model: this.model,
          temperature: this.temperature,
          messages: [
            {
              role: 'system',
              content: createPromptEngineeringSystemPrompt(config),
            },
            {
              role: 'user',
              content: createPromptEngineeringUserPrompt(idea, config),
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

    const promptOutput: PromptOutput = {
      contentId: idea.id,
      prompts: parsed.prompts.map((p: any, index: number) => ({
        sequence: (index + 1) as 1 | 2 | 3,
        videoPrompt: p.videoPrompt,
        audioPrompt: p.audioPrompt,
        duration: config.segmentDuration,
        resolution: '720p',
        aspectRatio: '9:16',
      })),
    };

    logger.info('Prompts generated successfully', {
      contentId: idea.id,
      promptCount: promptOutput.prompts.length,
    });
    return promptOutput;
  }

  estimateCost(): number {
    // Approximate cost for GPT-4
    // Input: ~1000 tokens @ $30/MTok = $0.03
    // Output: ~600 tokens @ $60/MTok = $0.036
    return 0.07; // ~$0.07 with buffer
  }
}
