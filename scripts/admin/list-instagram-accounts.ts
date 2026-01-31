import 'dotenv/config';
import axios from 'axios';
import { Database } from '../src/core/database';
import { InstagramTokenManager } from '../src/utils/instagram-token-manager';

async function listAccounts() {
  const db = new Database();
  const tokenManager = new InstagramTokenManager(db);
  const accessToken = await tokenManager.getValidToken();

  console.log('Fetching Instagram accounts linked to your token...\n');

  try {
    // Get Facebook pages
    const pagesRes = await axios.get(
      'https://graph.facebook.com/v18.0/me/accounts',
      { params: { fields: 'id,name,instagram_business_account', access_token: accessToken } }
    );

    console.log('Linked Instagram Business Accounts:');
    console.log('=' .repeat(60));

    for (const page of pagesRes.data.data) {
      if (page.instagram_business_account) {
        // Get Instagram account details
        const igRes = await axios.get(
          `https://graph.facebook.com/v18.0/${page.instagram_business_account.id}`,
          { params: { fields: 'id,username,name', access_token: accessToken } }
        );

        console.log(`\nFacebook Page: ${page.name}`);
        console.log(`  Instagram Username: @${igRes.data.username}`);
        console.log(`  Instagram Business ID: ${igRes.data.id}`);
      }
    }

  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }

  await db.close();
}

listAccounts();
