import dotenv from 'dotenv';
import { Database } from '../src/core/database';
import { TelegramProvider } from '../src/layers/05-review/telegram';
import { logger } from '../src/core/logger';
import { createStorage } from '../src/core/storage';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

/**
 * Test script for Telegram integration
 *
 * This script tests:
 * 1. Connection to Telegram bot
 * 2. Sending a review notification
 * 3. Inline keyboard buttons
 *
 * Note: You need to manually press the buttons in Telegram to test the full flow.
 * Make sure the telegram-poller service is running!
 */

async function testTelegram() {
  console.log('\n🧪 Testing Telegram Integration\n');

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('❌ Missing required environment variables:');
    if (!botToken) console.error('  - TELEGRAM_BOT_TOKEN');
    if (!chatId) console.error('  - TELEGRAM_CHAT_ID');
    console.error('\nPlease run: npm run setup-telegram\n');
    process.exit(1);
  }

  const database = new Database();
  const storage = createStorage();
  const telegram = new TelegramProvider(botToken, chatId, database);

  try {
    // Test 1: Connection test
    console.log('📡 Test 1: Testing connection to Telegram bot...');
    const connectionTest = await telegram.testConnection();

    if (!connectionTest.ok) {
      console.error(`❌ Connection failed: ${connectionTest.error}\n`);
      process.exit(1);
    }

    console.log('✅ Connection successful!');
    console.log(`   Bot: ${connectionTest.botInfo.first_name} (@${connectionTest.botInfo.username})\n`);

    // Test 2: Send a test review notification
    console.log('📤 Test 2: Sending test review notification...\n');

    // Create mock data
    const testContentId = uuidv4();
    const mockIdea = {
      id: testContentId,
      idea: 'Test ASMR video with satisfying slime mixing and color transitions',
      caption: '🌈 Watch this satisfying slime transformation! #ASMR #Satisfying #SlimeASMR',
      culturalContext: 'ASMR and satisfying content are extremely popular on short-form video platforms',
      environment: 'Clean studio setup with good lighting',
      soundConcept: 'Soft slime sounds with gentle mixing audio',
      timestamp: new Date().toISOString(),
      status: 'for_production' as const,
    };

    // Check if we have any existing content with videos
    console.log('🔍 Looking for existing content with videos to use as example...');

    const contentDirs = await storage.listDirectories('');
    let finalVideoPath = null;

    for (const dir of contentDirs) {
      try {
        const compositionPath = `${dir}/composition.json`;
        const exists = await storage.exists(compositionPath);

        if (exists) {
          const composition = await storage.getJSON<any>(compositionPath);
          if (composition.finalVideo) {
            finalVideoPath = composition.finalVideo.storagePath;
            console.log(`✅ Found existing video: ${finalVideoPath}\n`);
            break;
          }
        }
      } catch (error) {
        // Skip this directory
      }
    }

    const mockComposition = {
      contentId: mockIdea.id,
      finalVideo: {
        storagePath: finalVideoPath || 'test/final_video.mp4',
        duration: 15,
        resolution: '720p' as const,
        aspectRatio: '9:16' as const,
        fileSize: 6329802, // ~6MB
        processedAt: new Date().toISOString(),
        cost: 0,
      },
    };

    // Create the content in database first (returns auto-generated ID, but we'll use our UUID)
    const dbId = await database.createContent({
      idea: mockIdea.idea,
      caption: mockIdea.caption,
      cultural_context: mockIdea.culturalContext,
      environment: mockIdea.environment,
      sound_concept: mockIdea.soundConcept,
    });

    // Update the mock idea with the real DB ID
    mockIdea.id = dbId;
    mockComposition.contentId = dbId;

    // Send the review request
    const messageId = await telegram.sendReviewRequest(mockIdea, mockComposition);

    console.log(`✅ Test notification sent successfully!`);
    console.log(`   Message ID: ${messageId}`);
    console.log(`   Content ID: ${mockIdea.id}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📱 Check your Telegram now!');
    console.log('   You should see a message with buttons:\n');
    console.log('   [✅ Approve] [❌ Reject] [✏️ Edit Caption]\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Test 3: Wait for response
    console.log('⏳ Test 3: Waiting for your response (60 seconds)...');
    console.log('   Press one of the buttons in Telegram to test the callback.\n');
    console.log('   Make sure the telegram-poller service is running!');
    console.log('   (Run in another terminal: npm run telegram-poller)\n');

    try {
      const review = await telegram.waitForReview(mockIdea.id, 60000); // 60 second timeout

      console.log('\n✅ Review received!');
      console.log(`   Decision: ${review.decision}`);
      console.log(`   Reviewed by: ${review.reviewedBy}`);
      if (review.notes) {
        console.log(`   Notes: ${review.notes}`);
      }
      console.log('\n🎉 All tests passed!\n');
    } catch (error: any) {
      if (error.message.includes('timeout')) {
        console.log('\n⏱️  Timeout: No response received within 60 seconds.');
        console.log('   This is expected if you didn\'t press a button.');
        console.log('   The notification is still valid - you can press the button anytime.\n');
        console.log('ℹ️  Partial success: Message sent, but no response yet.\n');
      } else {
        throw error;
      }
    }

    // Cleanup test content from database
    console.log('🧹 Cleaning up test data...');
    await database.updateContent(mockIdea.id, { status: 'failed' });
    console.log('✅ Cleanup complete\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    logger.error('Telegram test failed', { error });
    process.exit(1);
  } finally {
    await database.close();
  }
}

testTelegram();
