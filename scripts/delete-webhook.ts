import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function deleteWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not found in .env');
    process.exit(1);
  }

  const apiUrl = `https://api.telegram.org/bot${token}`;

  try {
    // Check current webhook
    console.log('📡 Checking webhook status...\n');
    const webhookInfo = await axios.get(`${apiUrl}/getWebhookInfo`);
    console.log('Current webhook:', JSON.stringify(webhookInfo.data.result, null, 2));

    // Delete webhook
    console.log('\n🗑️  Deleting webhook...\n');
    const deleteResult = await axios.post(`${apiUrl}/deleteWebhook`, {
      drop_pending_updates: true, // Also drop any pending updates
    });

    if (deleteResult.data.ok) {
      console.log('✅ Webhook deleted successfully!');
      console.log('   You can now use long polling.\n');
    } else {
      console.error('❌ Failed to delete webhook:', deleteResult.data);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

deleteWebhook();
