import 'dotenv/config';
import axios from 'axios';
import { Database } from '../src/core/database';
import { InstagramTokenManager } from '../src/utils/instagram-token-manager';

async function publish() {
  const containerId = process.argv[2] || '17850852081601160';

  const db = new Database();
  const tokenManager = new InstagramTokenManager(db);
  const accessToken = await tokenManager.getValidToken();
  const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  try {
    // Check status
    console.log('Checking container status for:', containerId);
    const statusRes = await axios.get(
      `https://graph.facebook.com/v18.0/${containerId}`,
      { params: { fields: 'status_code,status', access_token: accessToken } }
    );
    console.log('Status:', JSON.stringify(statusRes.data, null, 2));

    if (statusRes.data.status_code === 'FINISHED') {
      console.log('\nPublishing...');
      const publishRes = await axios.post(
        `https://graph.facebook.com/v18.0/${businessAccountId}/media_publish`,
        { creation_id: containerId, access_token: accessToken }
      );
      console.log('Published! Media ID:', publishRes.data.id);
      console.log('View at: https://www.instagram.com/p/' + publishRes.data.id);
    } else if (statusRes.data.status_code === 'IN_PROGRESS') {
      console.log('\nStill processing... try again in a few seconds.');
    } else {
      console.log('\nUnexpected status:', statusRes.data.status_code);
    }
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }

  await db.close();
}

publish();
