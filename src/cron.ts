import cron from 'node-cron';
import { PipelineOrchestrator } from './core/orchestrator';
import { logger } from './core/logger';

const schedule = process.env.CRON_SCHEDULE || '0 9 * * *'; // 9 AM daily

logger.info('Starting cron scheduler', { schedule });

cron.schedule(schedule, async () => {
  logger.info('Cron job triggered, starting pipeline');

  const orchestrator = new PipelineOrchestrator();

  try {
    await orchestrator.runPipeline();
    logger.info('Pipeline completed successfully via cron');
  } catch (error) {
    logger.error('Pipeline failed via cron', { error });
  } finally {
    await orchestrator.close();
  }
});

logger.info('Cron scheduler running. Press Ctrl+C to stop.');

// Keep process alive
process.on('SIGINT', () => {
  logger.info('Stopping cron scheduler');
  process.exit(0);
});
