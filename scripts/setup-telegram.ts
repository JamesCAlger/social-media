import dotenv from 'dotenv';
import axios from 'axios';
import { logger } from '../src/core/logger';

dotenv.config();

/**
 * Setup script for Telegram bot integration
 *
 * This script helps you:
 * 1. Test your bot token
 * 2. Get your chat ID
 * 3. Verify bot permissions
 */

async function setupTelegram() {
  console.log('\n🤖 Telegram Bot Setup\n');
  console.log('This script will help you configure your Telegram bot for the review system.\n');

  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in .env file\n');
    console.log('📝 To create a Telegram bot:');
    console.log('1. Open Telegram and search for @BotFather');
    console.log('2. Send /newbot command');
    console.log('3. Follow the instructions to create your bot');
    console.log('4. Copy the bot token');
    console.log('5. Add to your .env file: TELEGRAM_BOT_TOKEN=your_token_here\n');
    process.exit(1);
  }

  const apiUrl = `https://api.telegram.org/bot${botToken}`;

  // Step 1: Test bot token
  console.log('📡 Step 1: Testing bot token...');
  try {
    const response = await axios.get(`${apiUrl}/getMe`);
    const bot = response.data.result;

    console.log('✅ Bot token is valid!\n');
    console.log(`Bot Information:`);
    console.log(`  Name: ${bot.first_name}`);
    console.log(`  Username: @${bot.username}`);
    console.log(`  ID: ${bot.id}`);
    console.log(`  Can Join Groups: ${bot.can_join_groups}`);
    console.log(`  Can Read Messages: ${bot.can_read_all_group_messages}\n`);
  } catch (error: any) {
    console.error('❌ Invalid bot token!\n');
    console.error(`Error: ${error.response?.data?.description || error.message}\n`);
    console.log('Please check your TELEGRAM_BOT_TOKEN in .env file\n');
    process.exit(1);
  }

  // Step 2: Get chat ID
  console.log('💬 Step 2: Getting your chat ID...\n');

  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (chatId) {
    console.log(`✅ TELEGRAM_CHAT_ID already set: ${chatId}`);

    // Test sending a message
    console.log('\n📤 Testing message sending...');
    try {
      await axios.post(`${apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: '✅ *Test Successful!*\n\nYour Telegram bot is configured correctly and ready to send review notifications.\n\nYou can now use the review system!',
        parse_mode: 'Markdown',
      });
      console.log('✅ Test message sent successfully!\n');
      console.log('Check your Telegram to see the test message.\n');
    } catch (error: any) {
      console.error('❌ Failed to send test message!\n');
      console.error(`Error: ${error.response?.data?.description || error.message}\n`);

      if (error.response?.data?.description?.includes('chat not found')) {
        console.log('💡 Tip: Make sure you have started a conversation with your bot.');
        console.log('   Open Telegram, search for your bot, and send /start\n');
      }
    }
  } else {
    console.log('❌ TELEGRAM_CHAT_ID not set in .env file\n');
    console.log('📝 To get your chat ID:');
    console.log('1. Open Telegram');
    console.log('2. Search for your bot (check bot username above)');
    console.log('3. Send /start to your bot');
    console.log('4. Run this command to see recent messages:\n');
    console.log(`   curl "https://api.telegram.org/bot${botToken}/getUpdates"\n`);
    console.log('5. Look for "chat":{"id": YOUR_CHAT_ID in the response');
    console.log('6. Add to your .env file: TELEGRAM_CHAT_ID=your_chat_id_here\n');

    // Try to get updates
    console.log('🔍 Checking for recent messages...\n');
    try {
      const response = await axios.get(`${apiUrl}/getUpdates`);
      const updates = response.data.result;

      if (updates.length > 0) {
        const lastUpdate = updates[updates.length - 1];
        const chat = lastUpdate.message?.chat || lastUpdate.callback_query?.message?.chat;

        if (chat) {
          console.log('✅ Found recent message!\n');
          console.log(`Your Chat ID: ${chat.id}`);
          console.log(`Chat Type: ${chat.type}`);
          if (chat.username) {
            console.log(`Username: @${chat.username}`);
          }
          console.log(`\nAdd this to your .env file:`);
          console.log(`TELEGRAM_CHAT_ID=${chat.id}\n`);
        } else {
          console.log('⚠️  No messages found. Please send /start to your bot first.\n');
        }
      } else {
        console.log('⚠️  No messages found. Please send /start to your bot first.\n');
      }
    } catch (error: any) {
      console.error('❌ Failed to get updates\n');
      console.error(`Error: ${error.response?.data?.description || error.message}\n`);
    }
  }

  // Step 3: Configuration summary
  console.log('\n📋 Configuration Summary:\n');

  const config = {
    'TELEGRAM_BOT_TOKEN': botToken ? '✅ Set' : '❌ Not set',
    'TELEGRAM_CHAT_ID': chatId ? `✅ Set (${chatId})` : '❌ Not set',
  };

  Object.entries(config).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  console.log('\n');

  if (botToken && chatId) {
    console.log('🎉 Setup complete! Your Telegram bot is ready to use.\n');
    console.log('Next steps:');
    console.log('1. Start the Telegram poller: npm run telegram-poller');
    console.log('2. Test the review system: npm run test-telegram\n');
  } else {
    console.log('⚠️  Setup incomplete. Please complete the steps above.\n');
  }
}

setupTelegram().catch((error) => {
  logger.error('Setup failed', { error });
  console.error('\n❌ Setup failed:', error.message, '\n');
  process.exit(1);
});
