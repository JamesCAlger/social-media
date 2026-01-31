import 'dotenv/config';
import axios from 'axios';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendForReview() {
  const contentId = '6e4708b1-efc7-4008-8956-8ad99fc4c036';
  const videoUrl = 'https://pub-a30692f355b5421cb781d245d436d1a8.r2.dev/videos/6e4708b1-efc7-4008-8956-8ad99fc4c036.mp4';
  const caption = `🍑 Glassy peach bliss

#kawaii #cute #asmr #satisfying #trending #crystalfruit #glassfruit

Content ID: ${contentId}
Account: cute.fruits.asmr`;

  console.log('Sending to Telegram...');
  console.log('Video URL:', videoUrl);

  try {
    // Send video with inline keyboard for approval
    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        video: videoUrl,
        caption: caption,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Approve', callback_data: `approve:${contentId}` },
              { text: '❌ Reject', callback_data: `reject:${contentId}` }
            ]
          ]
        }
      }
    );

    if (response.data.ok) {
      console.log('✅ Sent to Telegram successfully!');
      console.log('Message ID:', response.data.result.message_id);
      console.log('\nCheck Telegram to approve or reject the video.');
    } else {
      console.error('Failed to send:', response.data);
    }
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

sendForReview();
