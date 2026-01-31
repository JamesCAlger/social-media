import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

/**
 * Check Poller Status
 *
 * This script checks if a Telegram poller is already running by:
 * 1. Checking for lock file
 * 2. Testing health check endpoint
 * 3. Testing Telegram API for conflicts
 */

const HEALTH_CHECK_PORT = 3001;
const LOCK_FILE = path.join(process.cwd(), '.telegram-poller.lock');

async function checkPoller() {
  console.log('\n🔍 Checking for existing Telegram poller...\n');

  let hasIssues = false;

  // Check 1: Lock file
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const lockContent = fs.readFileSync(LOCK_FILE, 'utf-8');
      const lockData = JSON.parse(lockContent);

      console.log('⚠️  Lock file detected:');
      console.log(`   File: ${LOCK_FILE}`);
      console.log(`   PID: ${lockData.pid}`);
      console.log(`   Started: ${new Date(lockData.startTime).toLocaleString()}`);
      console.log('');

      hasIssues = true;
    } catch (error) {
      console.log('⚠️  Corrupted lock file detected');
      console.log(`   File: ${LOCK_FILE}`);
      console.log('   Consider deleting it: npm run clean-poller-lock\n');
      hasIssues = true;
    }
  } else {
    console.log('✅ No lock file found');
  }

  // Check 2: Health check endpoint
  try {
    const response = await axios.get(`http://localhost:${HEALTH_CHECK_PORT}`, {
      timeout: 2000,
    });

    console.log('⚠️  Health check endpoint responding:');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   PID: ${response.data.pid}`);
    console.log(`   Uptime: ${response.data.uptime}`);
    console.log('');

    hasIssues = true;
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
      console.log('✅ No health check endpoint responding');
    } else {
      console.log('❓ Health check endpoint check inconclusive');
    }
  }

  // Check 3: Telegram API conflict test
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.log('⚠️  TELEGRAM_BOT_TOKEN not set - skipping API check\n');
  } else {
    try {
      const apiUrl = `https://api.telegram.org/bot${botToken}`;
      await axios.get(`${apiUrl}/getUpdates`, {
        params: { timeout: 0, offset: 0, limit: 1 },
        timeout: 5000,
      });

      console.log('✅ Telegram API available (no conflicts detected)');
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log('❌ Telegram API returning 409 CONFLICT!');
        console.log('   Another poller is actively polling the bot.');
        console.log('');
        hasIssues = true;
      } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        console.log('⚠️  Telegram API timeout (network issue?)');
      } else {
        console.log('❓ Telegram API check inconclusive');
        console.log(`   Error: ${error.message}`);
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (hasIssues) {
    console.log('❌ POLLER ALREADY RUNNING OR CONFLICT DETECTED\n');
    console.log('Actions:');
    console.log('  1. Stop existing poller (Ctrl+C in its terminal)');
    console.log('  2. Or kill process: taskkill /PID <pid> /F');
    console.log('  3. Clean lock file: npm run clean-poller-lock');
    console.log('  4. Wait 5 seconds');
    console.log('  5. Try again\n');
    process.exit(1);
  } else {
    console.log('✅ No existing poller detected - safe to start!\n');
    process.exit(0);
  }
}

// Run the check
checkPoller().catch((error) => {
  console.error('\n❌ Error during poller check:', error.message);
  process.exit(1);
});
