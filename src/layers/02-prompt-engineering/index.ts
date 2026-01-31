import { PromptOutput, IdeaOutput, Account } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { PromptOutputSchema } from './schema';
import { createPromptProvider } from './providers';
import { PipelineConfig } from '../../core/types';
import { getPromptConfigFromStrategy } from './templates';

export class PromptEngineeringLayer {
  private database: Database;
  private storage = createStorage();

  constructor(database: Database) {
    this.database = database;
  }

  async execute(idea: IdeaOutput, config: PipelineConfig, account?: Account): Promise<PromptOutput> {
    // Get prompt config from account's content strategy
    const promptConfig = getPromptConfigFromStrategy(account?.contentStrategy);

    logger.info('Starting Layer 2: Prompt Engineering', {
      contentId: idea.id,
      segmentCount: promptConfig.segmentCount,
      segmentDuration: promptConfig.segmentDuration,
    });

    const startTime = Date.now();

    try {
      // Create provider
      const provider = createPromptProvider(
        config.layers.promptEngineering.provider,
        config.layers.promptEngineering.model,
        config.layers.promptEngineering.temperature
      );

      // Generate prompts with config
      const prompts = await provider.generatePrompts(idea, promptConfig);
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
