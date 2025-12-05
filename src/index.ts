import dotenv from 'dotenv';
import { PipelineOrchestrator } from './core/orchestrator';
import { logger } from './core/logger';

// Load environment variables
dotenv.config();

async function main() {
  logger.info('Social Media Content Pipeline Starting...');
  logger.info('Environment:', {
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  });

  const orchestrator = new PipelineOrchestrator();

  try {
    await orchestrator.runPipeline();
    logger.info('Pipeline completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Pipeline failed with error:', error);
    process.exit(1);
  } finally {
    await orchestrator.close();
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the pipeline
main();
