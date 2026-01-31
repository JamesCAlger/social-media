/**
 * Multi-Account Scheduler Service
 *
 * Runs pipelines for accounts based on their posting schedules.
 * Uses node-cron for scheduling with timezone support.
 */

import * as cron from 'node-cron';
import { MultiAccountOrchestrator } from '../core/multi-account-orchestrator';
import { logger } from '../core/logger';
import { Database } from '../core/database';
import { Account, PipelineResult } from '../core/types';

interface ScheduledTask {
  accountId: string;
  cronExpression: string;
  task: cron.ScheduledTask;
}

export class SchedulerService {
  private orchestrator: MultiAccountOrchestrator;
  private db: Database;
  private scheduledTasks: Map<string, ScheduledTask[]> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.orchestrator = new MultiAccountOrchestrator();
    this.db = this.orchestrator.getDatabase();
  }

  /**
   * Start the scheduler service
   * Creates cron jobs for all active accounts based on their posting schedules
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info('Starting scheduler service');
    this.isRunning = true;

    // Load all active accounts and create schedules
    await this.refreshSchedules();

    // Also set up a job to refresh schedules periodically (every hour)
    cron.schedule('0 * * * *', async () => {
      logger.info('Refreshing account schedules');
      await this.refreshSchedules();
    });

    logger.info('Scheduler service started successfully');
  }

  /**
   * Stop the scheduler service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping scheduler service');

    // Stop all scheduled tasks
    for (const [accountId, tasks] of this.scheduledTasks) {
      for (const task of tasks) {
        task.task.stop();
      }
      logger.debug('Stopped tasks for account', { accountId, taskCount: tasks.length });
    }

    this.scheduledTasks.clear();
    this.isRunning = false;

    await this.orchestrator.close();
    logger.info('Scheduler service stopped');
  }

  /**
   * Refresh schedules from database
   * Called on startup and periodically to pick up config changes
   */
  async refreshSchedules(): Promise<void> {
    const accounts = await this.db.accounts.getActiveAccounts();

    logger.info('Refreshing schedules', { activeAccounts: accounts.length });

    // Stop existing tasks
    for (const [, tasks] of this.scheduledTasks) {
      for (const task of tasks) {
        task.task.stop();
      }
    }
    this.scheduledTasks.clear();

    // Create new tasks for each active account
    for (const account of accounts) {
      await this.scheduleAccount(account);
    }

    logger.info('Schedules refreshed', {
      totalAccounts: accounts.length,
      scheduledTasks: Array.from(this.scheduledTasks.values()).flat().length,
    });
  }

  /**
   * Schedule jobs for a specific account
   */
  private async scheduleAccount(account: Account): Promise<void> {
    const schedule = account.postingSchedule;

    if (!schedule || !schedule.postingTimes || schedule.postingTimes.length === 0) {
      logger.warn('Account has no posting schedule', {
        accountId: account.id,
        accountName: account.name,
      });
      return;
    }

    const tasks: ScheduledTask[] = [];

    for (const postingTime of schedule.postingTimes) {
      const [hour, minute] = postingTime.split(':').map(Number);

      // Build cron expression based on active days
      // Format: minute hour * * dayOfWeek
      let dayOfWeek = '*';
      if (schedule.activeDays && schedule.activeDays.length > 0 && schedule.activeDays.length < 7) {
        dayOfWeek = schedule.activeDays.join(',');
      }

      const cronExpression = `${minute || 0} ${hour} * * ${dayOfWeek}`;

      try {
        const task = cron.schedule(
          cronExpression,
          async () => {
            await this.runPipelineForAccount(account);
          },
          {
            timezone: schedule.timezone || 'America/New_York',
          }
        );

        tasks.push({
          accountId: account.id,
          cronExpression,
          task,
        });

        logger.debug('Scheduled task for account', {
          accountId: account.id,
          accountName: account.name,
          cronExpression,
          timezone: schedule.timezone,
        });
      } catch (error: any) {
        logger.error('Failed to schedule task', {
          accountId: account.id,
          accountName: account.name,
          cronExpression,
          error: error.message,
        });
      }
    }

    if (tasks.length > 0) {
      this.scheduledTasks.set(account.id, tasks);
    }
  }

  /**
   * Run pipeline for a specific account
   */
  private async runPipelineForAccount(account: Account): Promise<void> {
    logger.info('Running scheduled pipeline', {
      accountId: account.id,
      accountName: account.name,
    });

    try {
      // Check if we've already posted enough times today
      const todayCount = await this.db.accounts.getTodayPostCount(account.id);
      const maxPosts = account.postingSchedule?.postsPerDay || 1;

      if (todayCount >= maxPosts) {
        logger.info('Already posted max times today, skipping', {
          accountId: account.id,
          accountName: account.name,
          todayCount,
          maxPosts,
        });
        return;
      }

      // Run the pipeline
      const result = await this.orchestrator.runForAccount(account.id);

      if (result.success) {
        logger.info('Scheduled pipeline completed successfully', {
          accountId: account.id,
          accountName: account.name,
          contentId: result.contentId,
          cost: result.cost,
        });
      } else {
        logger.error('Scheduled pipeline failed', {
          accountId: account.id,
          accountName: account.name,
          error: result.error,
        });
      }
    } catch (error: any) {
      logger.error('Error running scheduled pipeline', {
        accountId: account.id,
        accountName: account.name,
        error: error.message,
      });
    }
  }

  /**
   * Run pipelines for all accounts due right now
   * Useful for testing or manual triggers
   */
  async runDueNow(): Promise<PipelineResult[]> {
    logger.info('Running all due accounts');
    return this.orchestrator.runDueAccounts();
  }

  /**
   * Manually trigger pipeline for a specific account
   */
  async triggerAccount(accountSlug: string): Promise<PipelineResult> {
    logger.info('Manually triggering account', { slug: accountSlug });
    return this.orchestrator.runForAccountBySlug(accountSlug);
  }

  /**
   * Get status of scheduled tasks
   */
  getScheduleStatus(): Array<{
    accountId: string;
    taskCount: number;
    cronExpressions: string[];
  }> {
    const status = [];
    for (const [accountId, tasks] of this.scheduledTasks) {
      status.push({
        accountId,
        taskCount: tasks.length,
        cronExpressions: tasks.map((t) => t.cronExpression),
      });
    }
    return status;
  }

  /**
   * Check if scheduler is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Standalone scheduler runner
export async function runScheduler(): Promise<void> {
  const scheduler = new SchedulerService();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down scheduler...');
    await scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down scheduler...');
    await scheduler.stop();
    process.exit(0);
  });

  try {
    await scheduler.start();
    console.log('Scheduler running. Press Ctrl+C to stop.');
  } catch (error: any) {
    logger.error('Failed to start scheduler', { error: error.message });
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runScheduler();
}
