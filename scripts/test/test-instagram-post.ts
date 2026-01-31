import 'dotenv/config';
import axios from 'axios';
import { Database } from '../src/core/database';
import { InstagramTokenManager } from '../src/utils/instagram-token-manager';

async function test() {
  const db = new Database();
  const tokenManager = new InstagramTokenManager(db);
  const accessToken = await tokenManager.getValidToken();
  const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  const videoUrl = 'https://pub-a30692f355b5421cb781d245d436d1a8.r2.dev/videos/6e4708b1-efc7-4008-8956-8ad99fc4c036.mp4';
  const caption = 'Glassy peach bliss 🍑 #kawaii #cute #asmr #satisfying';

  console.log('Testing Instagram post...');
  console.log('Business Account ID:', businessAccountId);
  console.log('Video URL:', videoUrl);

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${businessAccountId}/media`,
      {
        media_type: 'REELS',
        video_url: videoUrl,
        caption: caption,
        access_token: accessToken,
      }
    );
    console.log('Success! Container ID:', response.data.id);

    // Wait and publish
    console.log('Waiting for processing...');
    await new Promise(r => setTimeout(r, 10000));

    const publishResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${businessAccountId}/media_publish`,
      {
        creation_id: response.data.id,
        access_token: accessToken,
      }
    );
    console.log('Published! Media ID:', publishResponse.data.id);

  } catch (error: any) {
    console.error('Error status:', error.response?.status);
    console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
  }

  await db.close();
}

test();
