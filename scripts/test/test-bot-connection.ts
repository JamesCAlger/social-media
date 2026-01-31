import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not found');
    process.exit(1);
  }

  const apiUrl = `https://api.telegram.org/bot${token}`;

  console.log('🔍 Testing Telegram Bot Connection...\n');

  try {
    // Try to get updates (will fail with 409 if another instance is polling)
    console.log('📡 Attempting to poll updates...');
    const response = await axios.get(`${apiUrl}/getUpdates`, {
      params: {
        offset: 0,
        timeout: 1, // Short timeout
      },
    });

    if (response.data.ok) {
      console.log('✅ SUCCESS! Bot can connect to Telegram');
      console.log('   No conflicts detected.\n');
      console.log(`   Found ${response.data.result.length} pending updates`);
    } else {
      console.log('❌ Failed:', response.data);
    }
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      console.log('❌ CONFLICT (409 Error)');
      console.log('   Another instance is already polling this bot.\n');
      console.log('Possible causes:');
      console.log('  1. Another terminal/process is running npm run telegram-poller');
      console.log('  2. The bot is connected in another application');
      console.log('  3. A previous instance didn\'t shut down cleanly\n');
      console.log('🔧 Solutions:');
      console.log('  - Close ALL other terminals/processes using this bot');
      console.log('  - Wait 10-15 seconds for Telegram to disconnect old sessions');
      console.log('  - Run this test again to verify\n');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testConnection();
