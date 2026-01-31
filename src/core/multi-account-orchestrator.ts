/**
 * Multi-Account Pipeline Orchestrator
 *
 * Coordinates content generation and distribution across multiple
 * Instagram accounts for A/B testing different content strategies.
 */

import { Database } from './database';
import { logger } from './logger';
import { getConfig } from '../config';
import { Account, PipelineResult, ContentType } from './types';
import { MultiAccountIdeaGenerationLayer } from '../layers/01-idea-generation/multi-account';
import { PromptEngineeringLayer } from '../layers/02-prompt-engineering';
import { VideoGenerationLayer } from '../layers/03-video-generation';
import { CompositionLayer } from '../layers/04-composition';
import { ReviewLayer } from '../layers/05-review';
import { MultiAccountDistributionLayer } from '../layers/06-distribution/multi-account';
import { selectContentType, convertContentTypeToStrategy } from '../utils/content-type-selector';

export class MultiAccountOrchestrator {
  private db: Database;
  private config = getConfig();

  constructor() {
    this.db = new Database();
  }

  /**
   * Run pipeline for a specific account by ID
   */
  async runForAccount(accountId: string): Promise<PipelineResult> {
    const account = await this.db.accounts.getAccountById(accountId);

    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    if (!account.isActive) {
      throw new Error(`Account is not active: ${account.name}`);
    }

    return this.executePipeline(account);
  }

  /**
   * Run pipeline for account by slug
   */
  async runForAccountBySlug(slug: string): Promise<PipelineResult> {
    const account = await this.db.accounts.getAccountBySlug(slug);

    if (!account) {
      throw new Error(`Account not found with slug: ${slug}`);
    }

    if (!account.isActive) {
      throw new Error(`Account is not active: ${account.name}`);
    }

    return this.executePipeline(account);
  }

  /**
   * Run pipeline for all active accounts
   */
  async runForAllAccounts(): Promise<PipelineResult[]> {
    const accounts = await this.db.accounts.getActiveAccounts();

    logger.info('Running pipeline for all active accounts', {
      count: accounts.length,
    });

    const results: PipelineResult[] = [];

    for (const account of accounts) {
      try {
        const result = await this.executePipeline(account);
        results.push(result);
      } catch (error: any) {
        logger.error('Pipeline failed for account', {
          accountId: account.id,
          accountName: account.name,
          error: error.message,
        });
        results.push({
          accountId: account.id,
          accountName: account.name,
          success: false,
          error: error.message,
          duration: 0,
        });
      }

      // Small delay between accounts to avoid rate limits
      await this.delay(5000);
    }

    return results;
  }

  /**
   * Run pipeline for accounts that are due based on their posting schedule
   */
  async runDueAccounts(): Promise<PipelineResult[]> {
    const accounts = await this.db.accounts.getAccountsDueForPosting();
    const now = new Date();

    // Filter to accounts that are actually due based on their schedule
    const dueAccounts: Account[] = [];
    for (const account of accounts) {
      if (await this.isAccountDueForPost(account, now)) {
        dueAccounts.push(account);
      }
    }

    logger.info('Found accounts due for posting', {
      totalActive: accounts.length,
      due: dueAccounts.length,
    });

    if (dueAccounts.length === 0) {
      logger.info('No accounts due for posting');
      return [];
    }

    const results: PipelineResult[] = [];

    for (const account of dueAccounts) {
      try {
        const result = await this.executePipeline(account);
        results.push(result);
      } catch (error: any) {
        logger.error('Pipeline failed for account', {
          accountId: account.id,
          accountName: account.name,
          error: error.message,
        });
        results.push({
          accountId: account.id,
          accountName: account.name,
          success: false,
          error: error.message,
          duration: 0,
        });
      }

      // Delay between accounts
      await this.delay(5000);
    }

    return results;
  }

  /**
   * Check if an account is due for posting based on schedule
   */
  private async isAccountDueForPost(account: Account, now: Date): Promise<boolean> {
    const schedule = account.postingSchedule;

    if (!schedule || !schedule.postingTimes || schedule.postingTimes.length === 0) {
      logger.debug('No posting schedule defined', { accountId: account.id });
      return false;
    }

    // Check if today is an active day
    const dayOfWeek = now.getDay();
    if (schedule.activeDays && schedule.activeDays.length > 0) {
      if (!schedule.activeDays.includes(dayOfWeek)) {
        logger.debug('Today is not an active posting day', {
          accountId: account.id,
          dayOfWeek,
          activeDays: schedule.activeDays,
        });
        return false;
      }
    }

    // Check if we've already posted the required number of times today
    const todayPostCount = await this.db.accounts.getTodayPostCount(account.id);
    if (todayPostCount >= schedule.postsPerDay) {
      logger.debug('Already posted required times today', {
        accountId: account.id,
        todayPostCount,
        postsPerDay: schedule.postsPerDay,
      });
      return false;
    }

    // Check if current time matches any posting time (within 30 min window)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    for (const postingTime of schedule.postingTimes) {
      const [hour, minute] = postingTime.split(':').map(Number);
      const scheduledMinutes = hour * 60 + (minute || 0);

      // Check if within 30-minute window after scheduled time
      if (
        currentTimeMinutes >= scheduledMinutes &&
        currentTimeMinutes < scheduledMinutes + 30
      ) {
        logger.debug('Account is due for posting', {
          accountId: account.id,
          currentTime: `${currentHour}:${currentMinute}`,
          scheduledTime: postingTime,
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Execute the full pipeline for an account
   */
  private async executePipeline(account: Account): Promise<PipelineResult> {
    // Select content type (handles both new contentTypes array and legacy contentStrategy)
    const selectedType = selectContentType(account);

    if (!selectedType) {
      throw new Error(`No content type configured for account: ${account.name}`);
    }

    const { contentType, index } = selectedType;

    logger.info('Starting pipeline for account', {
      accountId: account.id,
      accountName: account.name,
      contentTypeName: contentType.name,
      niche: contentType.niche,
      segmentCount: contentType.segmentCount,
      segmentDuration: contentType.segmentDuration,
      platform: account.platform,
    });

    // Update last content type index for rotation mode
    if (account.contentTypes && account.contentTypes.length > 0) {
      await this.db.accounts.updateAccount(account.id, {
        lastContentTypeIndex: index,
      });
    }

    // Create account with effective content strategy from selected content type
    const accountWithStrategy: Account = {
      ...account,
      contentStrategy: convertContentTypeToStrategy(contentType),
    };

    const startTime = Date.now();

    try {
      // Layer 1: Idea Generation (with account context)
      logger.info('=== Starting Layer 1: Idea Generation ===', {
        accountName: account.name,
        contentType: contentType.name,
      });
      const ideaLayer = new MultiAccountIdeaGenerationLayer(this.db);
      const idea = await ideaLayer.execute(this.config, accountWithStrategy);
      logger.info(`Layer 1 completed. Content ID: ${idea.id}`);

      await this.db.updateContent(idea.id, { status: 'idea_generated' });

      // Layer 2: Prompt Engineering (with account context for segment config)
      logger.info('=== Starting Layer 2: Prompt Engineering ===', {
        accountName: account.name,
        contentType: contentType.name,
        segmentCount: contentType.segmentCount,
        segmentDuration: contentType.segmentDuration,
      });
      const promptLayer = new PromptEngineeringLayer(this.db);
      const prompts = await promptLayer.execute(idea, this.config, accountWithStrategy);
      logger.info(`Layer 2 completed. Generated ${prompts.prompts.length} prompts`);

      await this.db.updateContent(idea.id, { status: 'prompts_generated' });

      // Layer 3: Video Generation
      logger.info('=== Starting Layer 3: Video Generation ===', {
        accountName: account.name,
      });
      const videoLayer = new VideoGenerationLayer(this.db);
      const videos = await videoLayer.execute(prompts, this.config);
      logger.info(`Layer 3 completed. Generated ${videos.videos.length} videos`);

      await this.db.updateContent(idea.id, { status: 'videos_generated' });

      // Layer 4: Composition
      logger.info('=== Starting Layer 4: Composition ===', {
        accountName: account.name,
      });
      const compositionLayer = new CompositionLayer(this.db);
      const composition = await compositionLayer.execute(
        videos,
        this.config,
        idea.textOverlays
      );
      logger.info('Layer 4 completed. Final video composed and uploaded to R2');

      await this.db.updateContent(idea.id, { status: 'review_pending' });

      // Layer 5: Review
      logger.info('=== Starting Layer 5: Review ===', {
        accountName: account.name,
      });
      const reviewLayer = new ReviewLayer(this.db);
      const review = await reviewLayer.execute(idea, composition, this.config);
      logger.info(`Layer 5 completed. Decision: ${review.decision}`);

      if (review.decision !== 'approved') {
        const duration = (Date.now() - startTime) / 1000;
        logger.info('Content not approved, skipping distribution', {
          accountName: account.name,
          contentId: idea.id,
          decision: review.decision,
        });
        return {
          accountId: account.id,
          accountName: account.name,
          contentId: idea.id,
          success: true,
          duration,
        };
      }

      // Layer 6: Distribution (with account context)
      logger.info('=== Starting Layer 6: Distribution ===', {
        accountName: account.name,
      });
      const distributionLayer = new MultiAccountDistributionLayer(this.db);
      const distribution = await distributionLayer.execute(account, idea, composition);
      logger.info(`Layer 6 completed. Posted to ${distribution.posts.length} platforms`);

      // Calculate total cost
      const content = await this.db.getContent(idea.id);
      const totalCost =
        Number(content?.idea_cost || 0) +
        Number(content?.prompt_cost || 0) +
        Number(content?.video_cost || 0) +
        Number(content?.composition_cost || 0);

      await this.db.updateContent(idea.id, {
        total_cost: totalCost,
        completed_at: new Date(),
      });

      const duration = (Date.now() - startTime) / 1000;

      logger.info('Pipeline completed successfully for account', {
        accountId: account.id,
        accountName: account.name,
        contentId: idea.id,
        duration: duration.toFixed(2),
        totalCost: totalCost.toFixed(4),
      });

      return {
        accountId: account.id,
        accountName: account.name,
        contentId: idea.id,
        success: true,
        duration,
        cost: totalCost,
      };
    } catch (error: any) {
      const duration = (Date.now() - startTime) / 1000;

      logger.error('Pipeline failed for account', {
        accountId: account.id,
        accountName: account.name,
        error: error.message,
        duration: duration.toFixed(2),
      });

      // Record failure
      await this.db.accounts.recordFailedPost(account.id, error.message);

      return {
        accountId: account.id,
        accountName: account.name,
        success: false,
        error: error.message,
        duration,
      };
    }
  }

  /**
   * Get status of all accounts
   */
  async getAccountsStatus(): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      isActive: boolean;
      niche: string;
      postsPerDay: number;
      lastPostAt?: Date;
      consecutiveFailures: number;
      todayPostCount: number;
    }>
  > {
    const accounts = await this.db.accounts.getAllAccounts();
    const statuses = [];

    for (const account of accounts) {
      const todayPostCount = await this.db.accounts.getTodayPostCount(account.id);
      statuses.push({
        id: account.id,
        name: account.name,
        slug: account.slug,
        isActive: account.isActive,
        niche: account.contentStrategy?.niche || 'unknown',
        postsPerDay: account.postingSchedule?.postsPerDay || 1,
        lastPostAt: account.lastPostAt,
        consecutiveFailures: account.consecutiveFailures,
        todayPostCount,
      });
    }

    return statuses;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.db.close();
  }

  /**
   * Get database instance (for direct access if needed)
   */
  getDatabase(): Database {
    return this.db;
  }
}
