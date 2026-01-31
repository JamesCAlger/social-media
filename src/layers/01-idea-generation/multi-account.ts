/**
 * Idea Generation Layer (Multi-Account Version)
 *
 * Generates content ideas based on account-specific content strategies.
 * Uses niche-specific prompts for A/B testing different content types.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { IdeaOutput, Account, PipelineConfig } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { IdeaOutputSchema } from './schema';
import { retry } from '../../utils/retry';
import { getNichePrompts, NichePrompts } from './niche-prompts';

export class MultiAccountIdeaGenerationLayer {
  private database: Database;
  private storage = createStorage();

  constructor(database: Database) {
    this.database = database;
  }

  /**
   * Execute idea generation for a specific account
   */
  async execute(config: PipelineConfig, account: Account): Promise<IdeaOutput> {
    logger.info('Starting Layer 1: Idea Generation (Multi-Account)', {
      accountId: account.id,
      accountName: account.name,
      niche: account.contentStrategy?.niche,
    });

    const startTime = Date.now();
    let contentId: string | null = null;

    try {
      // Get recent ideas for this account to avoid repetition
      const recentIdeas = await this.database.getRecentIdeasForAccount(account.id, 10);
      logger.debug('Fetched recent ideas for exclusion', {
        accountId: account.id,
        recentIdeaCount: recentIdeas.length,
      });

      // Get niche-specific prompts based on account's content strategy
      // Pass recent ideas to avoid repetition
      const prompts = getNichePrompts(account.contentStrategy!, { recentIdeas });

      // Generate idea using the appropriate provider
      const idea = await this.generateIdea(config, prompts, account);
      const cost = this.estimateCost(config.layers.ideaGeneration.provider);

      // Validate output
      validate(IdeaOutputSchema, idea);

      // Create database record linked to account
      contentId = await this.database.createContentForAccount(account.id, {
        idea: idea.idea,
        caption: idea.caption,
        cultural_context: idea.culturalContext,
        environment: idea.environment,
        sound_concept: idea.soundConcept,
        text_overlays: idea.textOverlays,
      });

      // Update costs
      await this.database.updateContent(contentId, {
        idea_cost: cost,
      });

      // Save to storage with account context
      await this.storage.saveJSON(`${contentId}/idea.json`, {
        ...idea,
        accountId: account.id,
        accountName: account.name,
        niche: account.contentStrategy?.niche,
      });

      // Log processing
      await this.database.logProcessing({
        content_id: contentId,
        layer: 'idea',
        status: 'completed',
        completed_at: new Date(),
        metadata: {
          ...idea,
          accountId: account.id,
          niche: account.contentStrategy?.niche,
        },
        cost,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Layer 1 completed', {
        contentId,
        accountId: account.id,
        accountName: account.name,
        niche: account.contentStrategy?.niche,
        duration,
        cost,
      });

      return { ...idea, id: contentId };
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Layer 1 failed', {
        error,
        duration,
        contentId,
        accountId: account.id,
      });

      if (contentId) {
        await this.database.updateContent(contentId, { status: 'failed' });
        await this.database.logProcessing({
          content_id: contentId,
          layer: 'idea',
          status: 'failed',
          completed_at: new Date(),
          error_message: (error as Error).message,
        });
      }

      throw error;
    }
  }

  /**
   * Generate idea using the configured provider with custom prompts
   */
  private async generateIdea(
    config: PipelineConfig,
    prompts: NichePrompts,
    account: Account
  ): Promise<IdeaOutput> {
    const provider = config.layers.ideaGeneration.provider;
    const model = config.layers.ideaGeneration.model;
    const temperature = config.layers.ideaGeneration.temperature;

    logger.info('Generating idea', {
      provider,
      model,
      accountId: account.id,
      niche: account.contentStrategy?.niche,
    });

    if (provider === 'anthropic') {
      return this.generateWithAnthropic(model, temperature, prompts);
    } else if (provider === 'openai') {
      return this.generateWithOpenAI(model, temperature, prompts);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Generate idea using Anthropic Claude
   */
  private async generateWithAnthropic(
    model: string,
    temperature: number,
    prompts: NichePrompts
  ): Promise<IdeaOutput> {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await retry(
      async () => {
        return client.messages.create({
          model,
          max_tokens: 1024,
          temperature,
          system: prompts.systemPrompt,
          messages: [
            {
              role: 'user',
              content: prompts.userPrompt,
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

    return this.parseIdeaResponse(content.text);
  }

  /**
   * Generate idea using OpenAI
   */
  private async generateWithOpenAI(
    model: string,
    temperature: number,
    prompts: NichePrompts
  ): Promise<IdeaOutput> {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await retry(
      async () => {
        return client.chat.completions.create({
          model,
          max_tokens: 1024,
          temperature,
          messages: [
            {
              role: 'system',
              content: prompts.systemPrompt,
            },
            {
              role: 'user',
              content: prompts.userPrompt,
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
      throw new Error('Empty response from OpenAI');
    }

    return this.parseIdeaResponse(content);
  }

  /**
   * Parse the LLM response into IdeaOutput
   */
  private parseIdeaResponse(text: string): IdeaOutput {
    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
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

    logger.info('Idea parsed successfully', {
      id: idea.id,
      textOverlays: parsedTextOverlays,
    });

    return idea;
  }

  /**
   * Estimate cost for idea generation
   */
  private estimateCost(provider: string): number {
    if (provider === 'anthropic') {
      // Claude 3.5 Sonnet: ~$0.006 per idea
      return 0.006;
    } else if (provider === 'openai') {
      // GPT-4: ~$0.01 per idea
      return 0.01;
    }
    return 0.01;
  }
}
