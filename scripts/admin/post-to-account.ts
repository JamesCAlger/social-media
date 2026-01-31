import 'dotenv/config';
import axios from 'axios';
import { Database } from '../src/core/database';
import { InstagramTokenManager } from '../src/utils/instagram-token-manager';

async function postToAccount() {
  const videoUrl = 'https://pub-a30692f355b5421cb781d245d436d1a8.r2.dev/videos/6e4708b1-efc7-4008-8956-8ad99fc4c036.mp4';
  const caption = 'Glassy peach bliss 🍑 #kawaii #cute #asmr #satisfying #trending #crystalfruit #glassfruit #oddlysatisfying #viral #pastel';

  // cute.fruits.asmr Business Account ID (correct)
  const businessAccountId = '17841478818271966';

  const db = new Database();
  const tokenManager = new InstagramTokenManager(db);
  const accessToken = await tokenManager.getValidToken();

  console.log('Posting to cute.fruits.asmr...');
  console.log('Business Account ID:', businessAccountId);
  console.log('Video URL:', videoUrl);

  try {
    // Step 1: Create container
    console.log('\n1. Creating media container...');
    const containerRes = await axios.post(
      `https://graph.facebook.com/v18.0/${businessAccountId}/media`,
      {
        media_type: 'REELS',
        video_url: videoUrl,
        caption: caption,
        access_token: accessToken,
      }
    );
    const containerId = containerRes.data.id;
    console.log('   Container ID:', containerId);

    // Step 2: Wait for processing
    console.log('\n2. Waiting for Instagram to process video...');
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await axios.get(
        `https://graph.facebook.com/v18.0/${containerId}`,
        { params: { fields: 'status_code,status', access_token: accessToken } }
      );

      if (statusRes.data.status_code === 'FINISHED') {
        console.log('   Processing complete!');
        break;
      } else if (statusRes.data.status_code === 'ERROR') {
        throw new Error('Processing failed: ' + statusRes.data.status);
      }

      if (i % 5 === 0) {
        console.log('   Still processing... (' + (i * 2) + 's)');
      }
    }

    // Step 3: Publish
    console.log('\n3. Publishing...');
    const publishRes = await axios.post(
      `https://graph.facebook.com/v18.0/${businessAccountId}/media_publish`,
      { creation_id: containerId, access_token: accessToken }
    );

    console.log('\n✅ Posted successfully!');
    console.log('   Media ID:', publishRes.data.id);
    console.log('   Account: cute.fruits.asmr');

  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }

  await db.close();
}

postToAccount();
