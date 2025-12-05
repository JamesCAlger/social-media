import { PromptOutput, IdeaOutput } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { PromptOutputSchema } from './schema';
import { createPromptProvider } from './providers';
import { PipelineConfig } from '../../core/types';

export class PromptEngineeringLayer {
  private database: Database;
  private storage = createStorage();

  constructor(database: Database) {
    this.database = database;
  }

  async execute(idea: IdeaOutput, config: PipelineConfig): Promise<PromptOutput> {
    logger.info('Starting Layer 2: Prompt Engineering', { contentId: idea.id });

    const startTime = Date.now();

    try {
      // Create provider
      const provider = createPromptProvider(
        config.layers.promptEngineering.provider,
        config.layers.promptEngineering.model,
        config.layers.promptEngineering.temperature
      );

      // Generate prompts
      const prompts = await provider.generatePrompts(idea);
      const cost = provider.estimateCost();

      // Validate output
      validate(PromptOutputSchema, prompts);

      // Update costs
      await this.database.updateContent(idea.id, {
        prompt_cost: cost,
      });

      // Save to storage
      await this.storage.saveJSON(`${idea.id}/prompts.json`, prompts);

      // Log processing
      await this.database.logProcessing({
        content_id: idea.id,
        layer: 'prompt',
        status: 'completed',
        completed_at: new Date(),
        metadata: prompts,
        cost,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Layer 2 completed', { contentId: idea.id, duration, cost });

      return prompts;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Layer 2 failed', { error, duration, contentId: idea.id });

      await this.database.updateContent(idea.id, { status: 'failed' });
      await this.database.logProcessing({
        content_id: idea.id,
        layer: 'prompt',
        status: 'failed',
        completed_at: new Date(),
        error_message: (error as Error).message,
      });

      throw error;
    }
  }
}
