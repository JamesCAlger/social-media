import dotenv from 'dotenv';
import http from 'http';
import { Database } from '../src/core/database';
import { TelegramPoller } from '../src/layers/05-review/telegram-poller';
import { logger } from '../src/core/logger';

dotenv.config();

/**
 * Telegram Poller Service
 *
 * This service runs continuously and listens for Telegram updates (button presses).
 * It processes approval/rejection decisions and updates the database.
 *
 * Run this in a separate terminal window or as a background service.
 */

async function startPollerService() {
  logger.info('Starting Telegram Poller Service');

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken) {
    logger.error('TELEGRAM_BOT_TOKEN not found in environment');
    console.error('❌ TELEGRAM_BOT_TOKEN not set in .env file');
    console.error('Please run: npm run setup-telegram\n');
    process.exit(1);
  }

  if (!chatId) {
    logger.error('TELEGRAM_CHAT_ID not found in environment');
    console.error('❌ TELEGRAM_CHAT_ID not set in .env file');
    console.error('Please run: npm run setup-telegram\n');
    process.exit(1);
  }

  const database = new Database();

  // Parse authorized chat IDs (comma-separated)
  const authorizedChatIds = chatId
    .split(',')
    .map((id) => parseInt(id.trim()))
    .filter((id) => !isNaN(id));

  logger.info('Telegram poller configured', {
    authorizedChatIds,
  });

  console.log('\n🤖 Telegram Poller Service');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ Connected to Telegram');
  console.log(`✅ Authorized Chat IDs: ${authorizedChatIds.join(', ')}`);
  console.log('\n👂 Listening for button presses...');
  console.log('   (Press Ctrl+C to stop)\n');

  const poller = new TelegramPoller(botToken, database, authorizedChatIds);

  // Health check server
  const startTime = Date.now();
  const healthServer = http.createServer((req, res) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          status: 'running',
          service: 'telegram-poller',
          pid: process.pid,
          uptime: uptimeFormatted,
          uptimeSeconds: uptime,
          startedAt: new Date(startTime).toISOString(),
          authorizedChatIds,
        },
        null,
        2
      )
    );
  });

  const HEALTH_CHECK_PORT = 3001;
  healthServer.listen(HEALTH_CHECK_PORT, () => {
    console.log(`🏥 Health check: http://localhost:${HEALTH_CHECK_PORT}`);
    console.log(`   Check status: curl http://localhost:${HEALTH_CHECK_PORT}\n`);
  });

  // Cleanup function
  const cleanup = async () => {
    console.log('\n\n⏹️  Stopping Telegram poller...');
    poller.stop();
    healthServer.close();
    await database.close();
    console.log('✅ Poller stopped gracefully\n');
  };

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });

  // Handle uncaught errors
  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught exception in poller service', { error });
    console.error('\n❌ Uncaught exception:', error);
    await cleanup();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    logger.error('Unhandled rejection in poller service', { reason, promise });
    console.error('\n❌ Unhandled rejection:', reason);
    await cleanup();
    process.exit(1);
  });

  // Start polling
  try {
    await poller.start();
  } catch (error) {
    logger.error('Poller service crashed', { error });
    console.error('\n❌ Poller service crashed:', error);
    await database.close();
    process.exit(1);
  }
}

startPollerService();
