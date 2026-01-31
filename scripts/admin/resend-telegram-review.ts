import 'dotenv/config';
import axios from 'axios';
import { Database } from '../src/core/database';

async function resendWithVideo() {
  const contentId = process.argv[2];

  if (!contentId) {
    console.error('Usage: npx tsx scripts/resend-telegram-review.ts <content-id>');
    process.exit(1);
  }

  const db = new Database();
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const apiUrl = `https://api.telegram.org/bot${botToken}`;

  try {
    // Get content from database
    const content = await db.getContent(contentId);
    if (!content) {
      console.error('Content not found:', contentId);
      process.exit(1);
    }

    const r2Url = content.r2_url;
    if (!r2Url) {
      console.error('No R2 URL found for content');
      process.exit(1);
    }

    console.log('Sending video review message...');
    console.log('Content ID:', contentId);
    console.log('R2 URL:', r2Url);

    const caption = `🎬 *New Content Ready for Review*

📋 *ID:* \`${contentId.substring(0, 8)}...\`

💡 *Idea:* ${content.idea?.substring(0, 100) || 'Craft ASMR content'}

📝 *Caption:*
${content.caption?.substring(0, 200) || 'No caption'}

👇 *Choose an action:*`;

    const response = await axios.post(`${apiUrl}/sendVideo`, {
      chat_id: chatId,
      video: r2Url,
      caption: caption,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Approve', callback_data: `approve:${contentId}` },
            { text: '❌ Reject', callback_data: `reject:${contentId}` },
          ],
          [{ text: '✏️ Edit Caption', callback_data: `edit:${contentId}` }],
        ],
      },
    });

    console.log('\n✅ Video review message sent!');
    console.log('   Message ID:', response.data.result.message_id);

    // Update message ID in database
    await db.saveTelegramMessage(contentId, response.data.result.message_id, chatId!);

  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }

  await db.close();
}

resendWithVideo();
