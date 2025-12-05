import { Database } from './database';
import { logger } from './logger';
import { getConfig } from '../config';
import { IdeaGenerationLayer } from '../layers/01-idea-generation';
import { PromptEngineeringLayer } from '../layers/02-prompt-engineering';
import { VideoGenerationLayer } from '../layers/03-video-generation';
import { CompositionLayer } from '../layers/04-composition';
import { ReviewLayer } from '../layers/05-review';
import { DistributionLayer } from '../layers/06-distribution';

export class PipelineOrchestrator {
  private db: Database;
  private config = getConfig();

  constructor() {
    this.db = new Database();
  }

  async runPipeline(): Promise<void> {
    logger.info('Starting pipeline execution');
    const pipelineStartTime = Date.now();

    try {
      // Layer 1: Idea Generation
      logger.info('=== Starting Layer 1: Idea Generation ===');
      const ideaLayer = new IdeaGenerationLayer(this.db);
      const idea = await ideaLayer.execute(this.config);
      const contentId = idea.id;
      logger.info(`Layer 1 completed. Content ID: ${contentId}`);

      await this.db.updateContent(contentId, { status: 'idea_generated' });

      // Layer 2: Prompt Engineering
      logger.info('=== Starting Layer 2: Prompt Engineering ===');
      const promptLayer = new PromptEngineeringLayer(this.db);
      const prompts = await promptLayer.execute(idea, this.config);
      logger.info(`Layer 2 completed. Generated ${prompts.prompts.length} prompts`);

      await this.db.updateContent(contentId, { status: 'prompts_generated' });

      // Layer 3: Video Generation
      logger.info('=== Starting Layer 3: Video Generation ===');
      const videoLayer = new VideoGenerationLayer(this.db);
      const videos = await videoLayer.execute(prompts, this.config);
      logger.info(`Layer 3 completed. Generated ${videos.videos.length} videos`);

      await this.db.updateContent(contentId, { status: 'videos_generated' });

      // Layer 4: Composition
      logger.info('=== Starting Layer 4: Composition ===');
      const compositionLayer = new CompositionLayer(this.db);
      const composition = await compositionLayer.execute(videos, this.config, idea.textOverlays);
      logger.info('Layer 4 completed. Final video composed and uploaded to R2');

      await this.db.updateContent(contentId, { status: 'review_pending' });

      // Layer 5: Review
      logger.info('=== Starting Layer 5: Review ===');
      const reviewLayer = new ReviewLayer(this.db);
      const review = await reviewLayer.execute(idea, composition, this.config);
      logger.info(`Layer 5 completed. Decision: ${review.decision}`);

      if (review.decision !== 'approved') {
        logger.info('Content not approved, skipping distribution', {
          contentId,
          decision: review.decision,
        });
        return;
      }

      // Layer 6: Distribution
      logger.info('=== Starting Layer 6: Distribution ===');
      const distributionLayer = new DistributionLayer(this.db);
      const distribution = await distributionLayer.execute(idea, composition);
      logger.info(`Layer 6 completed. Posted to ${distribution.posts.length} platforms`);

      // Calculate total cost (all layers)
      const content = await this.db.getContent(contentId);
      const totalCost =
        Number(content?.idea_cost || 0) +
        Number(content?.prompt_cost || 0) +
        Number(content?.video_cost || 0) +
        Number(content?.composition_cost || 0);

      await this.db.updateContent(contentId, {
        total_cost: totalCost,
        completed_at: new Date(),
      });

      const totalDuration = ((Date.now() - pipelineStartTime) / 1000).toFixed(2);
      logger.info('Pipeline execution completed successfully (ALL LAYERS)', {
        contentId,
        duration: totalDuration,
        totalCost: totalCost.toFixed(4),
        layersCompleted: 6,
        postsCreated: distribution.posts.length,
      });

    } catch (error) {
      const totalDuration = ((Date.now() - pipelineStartTime) / 1000).toFixed(2);
      logger.error('Pipeline execution failed', { error, duration: totalDuration });
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}
