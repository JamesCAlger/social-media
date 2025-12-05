import { IdeaOutput } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { IdeaOutputSchema } from './schema';
import { createIdeaProvider } from './providers';
import { PipelineConfig } from '../../core/types';

export class IdeaGenerationLayer {
  private database: Database;
  private storage = createStorage();

  constructor(database: Database) {
    this.database = database;
  }

  async execute(config: PipelineConfig): Promise<IdeaOutput> {
    logger.info('Starting Layer 1: Idea Generation');

    const startTime = Date.now();
    let contentId: string | null = null;

    try {
      // Create provider
      const provider = createIdeaProvider(
        config.layers.ideaGeneration.provider,
        config.layers.ideaGeneration.model,
        config.layers.ideaGeneration.temperature
      );

      // Generate idea
      const idea = await provider.generateIdea();
      const cost = provider.estimateCost();

      // Validate output
      validate(IdeaOutputSchema, idea);

      // Create database record
      contentId = await this.database.createContent({
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

      // Save to storage
      await this.storage.saveJSON(`${contentId}/idea.json`, idea);

      // Log processing
      await this.database.logProcessing({
        content_id: contentId,
        layer: 'idea',
        status: 'completed',
        completed_at: new Date(),
        metadata: idea,
        cost,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Layer 1 completed', { contentId, duration, cost });

      return { ...idea, id: contentId };
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Layer 1 failed', { error, duration, contentId });

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
}
