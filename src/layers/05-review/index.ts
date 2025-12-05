import { ReviewOutput, IdeaOutput, CompositionOutput } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { ReviewOutputSchema } from './schema';
import { SlackReviewChannel } from './slack';
import { TelegramProvider } from './telegram';
import { PipelineConfig } from '../../core/types';

export class ReviewLayer {
  private database: Database;
  private storage = createStorage();

  constructor(database: Database) {
    this.database = database;
  }

  async execute(
    idea: IdeaOutput,
    composition: CompositionOutput,
    config: PipelineConfig
  ): Promise<ReviewOutput> {
    logger.info('Starting Layer 5: Review', { contentId: idea.id });

    const startTime = Date.now();

    try {
      // Determine which review channel to use
      const reviewChannel = config.layers.review.channel || 'telegram';

      let review: {
        decision: 'approved' | 'rejected';
        reviewedBy: string;
        notes?: string;
      };

      if (reviewChannel === 'telegram') {
        // Use Telegram for review
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!botToken || !chatId) {
          throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in environment');
        }

        const telegram = new TelegramProvider(botToken, chatId, this.database);

        // Send review request
        await telegram.sendReviewRequest(idea, composition);

        // Wait for review (with timeout)
        review = await telegram.waitForReview(
          idea.id,
          config.layers.review.timeout * 1000
        );
      } else {
        // Use Slack for review (legacy)
        const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (!slackWebhookUrl) {
          throw new Error('SLACK_WEBHOOK_URL not found in environment');
        }

        const slack = new SlackReviewChannel(slackWebhookUrl, this.database);

        // Send review request
        await slack.sendReviewRequest(idea, composition);

        // Wait for review (with timeout)
        review = await slack.waitForReview(
          idea.id,
          config.layers.review.timeout * 1000
        );
      }

      const output: ReviewOutput = {
        contentId: idea.id,
        decision: review.decision,
        reviewedAt: new Date().toISOString(),
        reviewedBy: review.reviewedBy,
        notes: review.notes,
      };

      // Validate output
      validate(ReviewOutputSchema, output);

      // Save metadata
      await this.storage.saveJSON(`${idea.id}/review.json`, output);

      // Log processing
      await this.database.logProcessing({
        content_id: idea.id,
        layer: 'review',
        status: 'completed',
        completed_at: new Date(),
        metadata: output,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Layer 5 completed', {
        contentId: idea.id,
        duration,
        decision: review.decision,
      });

      return output;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Layer 5 failed', { error, duration, contentId: idea.id });

      await this.database.logProcessing({
        content_id: idea.id,
        layer: 'review',
        status: 'failed',
        completed_at: new Date(),
        error_message: (error as Error).message,
      });

      throw error;
    }
  }
}
