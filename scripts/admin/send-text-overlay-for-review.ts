/**
 * Send the 4 text-overlay videos to Telegram for review
 */

import 'dotenv/config';
import path from 'path';
import axios from 'axios';
import { R2Uploader } from '../src/utils/r2-uploader';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const contentIds = [
  '376dedc7-29e7-43c7-ab5f-a303076ad861',
  '2f72c6d8-7ef5-4a1f-ad86-5e9b971f733f',
  '5a9a46fa-fda0-46a1-a1fa-7bdbbd48149a',
  'b0b0be06-c2db-4ef3-9d58-9240f94b68f0',
];

async function sendToTelegram(videoUrl: string, contentId: string, index: number) {
  const caption = `🎬 *Video ${index + 1}/4 - Text Overlay Test*

📋 *Content ID:* \`${contentId.substring(0, 8)}...\`

💡 *Text:* "guess the color" (3 seconds at top)

👇 *Approve to post or reject:*`;

  const response = await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`,
    {
      chat_id: TELEGRAM_CHAT_ID,
      video: videoUrl,
      caption: caption,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Approve', callback_data: `approve:${contentId}` },
            { text: '❌ Reject', callback_data: `reject:${contentId}` },
          ],
        ],
      },
    }
  );

  return response.data;
}

async function main() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env');
    process.exit(1);
  }

  const r2Uploader = new R2Uploader();

  console.log('Uploading and sending 4 videos to Telegram...\n');

  for (let i = 0; i < contentIds.length; i++) {
    const contentId = contentIds[i];
    const videoPath = path.resolve(`./content/${contentId}/video_1_with_text.mp4`);

    console.log(`[${i + 1}/4] Processing: ${contentId}`);

    try {
      // Upload to R2 with a unique key for the text overlay version
      console.log('  Uploading to R2...');
      const r2Key = `${contentId}-text-overlay`;
      const r2Url = await r2Uploader.uploadVideo(videoPath, r2Key);
      console.log(`  R2 URL: ${r2Url}`);

      // Send to Telegram
      console.log('  Sending to Telegram...');
      const result = await sendToTelegram(r2Url, contentId, i);

      if (result.ok) {
        console.log(`  ✓ Sent! Message ID: ${result.result.message_id}\n`);
      } else {
        console.error(`  ✗ Failed:`, result);
      }
    } catch (error: any) {
      console.error(`  ✗ Error:`, error.response?.data || error.message, '\n');
    }
  }

  console.log('Done! Check Telegram to review the videos.');
}

main();
