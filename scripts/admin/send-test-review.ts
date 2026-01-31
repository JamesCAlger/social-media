import dotenv from 'dotenv';
import { Database } from '../src/core/database';
import { TelegramProvider } from '../src/layers/05-review/telegram';
import { IdeaOutput, CompositionOutput } from '../src/core/types';
import fs from 'fs';
import path from 'path';

dotenv.config();

/**
 * Send Test Review
 *
 * Sends a test content item to Telegram for review.
 * This tests the entire review flow including button interactions.
 */

async function sendTestReview() {
  const contentId = '24ad4a85-c303-4041-a957-cd847a1ff8ff';
  const contentPath = path.join(process.cwd(), 'content', contentId);

  console.log('\n🧪 Sending Test Review to Telegram\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if content exists
  if (!fs.existsSync(contentPath)) {
    console.error(`❌ Content directory not found: ${contentPath}`);
    process.exit(1);
  }

  // Read idea and composition data
  const ideaPath = path.join(contentPath, 'idea.json');
  const compositionPath = path.join(contentPath, 'composition.json');

  if (!fs.existsSync(ideaPath) || !fs.existsSync(compositionPath)) {
    console.error('❌ Missing idea.json or composition.json');
    process.exit(1);
  }

  const ideaData = JSON.parse(fs.readFileSync(ideaPath, 'utf-8'));
  const compositionData = JSON.parse(fs.readFileSync(compositionPath, 'utf-8'));

  // Create IdeaOutput and CompositionOutput objects
  const idea: IdeaOutput = {
    id: contentId, // Use folder name as ID
    timestamp: ideaData.timestamp || new Date().toISOString(),
    idea: ideaData.idea,
    caption: ideaData.caption,
    culturalContext: ideaData.culturalContext,
    environment: ideaData.environment,
    soundConcept: ideaData.soundConcept,
    status: 'for_production',
  };

  const composition: CompositionOutput = {
    contentId: compositionData.contentId,
    finalVideo: compositionData.finalVideo,
  };

  console.log('📋 Content Details:');
  console.log(`   ID: ${idea.id}`);
  console.log(`   Idea: ${idea.idea}`);
  console.log(`   Caption: ${idea.caption}`);
  console.log(`   Video: ${composition.finalVideo.storagePath}`);
  console.log(`   Size: ${(composition.finalVideo.fileSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Duration: ${composition.finalVideo.duration}s`);
  console.log('');

  // Initialize Telegram provider
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('❌ TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    process.exit(1);
  }

  const database = new Database();
  const telegram = new TelegramProvider(botToken, chatId, database);

  try {
    // Test connection first
    console.log('🔌 Testing Telegram connection...');
    const connectionTest = await telegram.testConnection();

    if (!connectionTest.ok) {
      console.error('❌ Telegram connection failed:', connectionTest.error);
      await database.close();
      process.exit(1);
    }

    console.log('✅ Connection successful!');
    console.log(`   Bot: ${connectionTest.botInfo.username}`);
    console.log('');

    // Send review request
    console.log('📤 Sending review request to Telegram...');
    const messageId = await telegram.sendReviewRequest(idea, composition);

    console.log('✅ Review request sent!');
    console.log(`   Message ID: ${messageId}`);
    console.log(`   Chat ID: ${chatId}`);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📱 Check your Telegram app for the review message!');
    console.log('');
    console.log('👆 Click one of the buttons:');
    console.log('   ✅ Approve - Approve the content');
    console.log('   ❌ Reject - Reject the content');
    console.log('   ✏️ Edit Caption - Edit the caption (not yet implemented)');
    console.log('');
    console.log('🤖 The poller service will detect your button press');
    console.log('   and update the database accordingly.');
    console.log('');
    console.log('📊 Monitor the poller logs to see the interaction.');
    console.log('   Logs: logs/combined.log');
    console.log('   Or watch in real-time: tail -f logs/combined.log');
    console.log('');

    await database.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await database.close();
    process.exit(1);
  }
}

sendTestReview();
