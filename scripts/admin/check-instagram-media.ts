import dotenv from 'dotenv';
dotenv.config();
import { Database } from '../src/core/database';
import { InstagramTokenManager } from '../src/utils/instagram-token-manager';

async function check() {
  const db = new Database();
  const tokenManager = new InstagramTokenManager(db);
  const accessToken = await tokenManager.getValidToken();

  const mediaId = process.argv[2] || '18009325421655638';

  console.log('Checking media ID:', mediaId);

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${mediaId}?fields=id,permalink,media_url,media_type,timestamp,caption&access_token=${accessToken}`
  );
  const data = await response.json();
  console.log('Media info:', JSON.stringify(data, null, 2));

  await db.close();
}
check();
