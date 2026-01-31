import dotenv from 'dotenv';
import { Database } from '../src/core/database';
import { InstagramTokenManager } from '../src/utils/instagram-token-manager';

dotenv.config();

async function testTokenManager() {
  console.log('\n🧪 Testing Instagram Token Manager\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const database = new Database();

  try {
    const tokenManager = new InstagramTokenManager(database);

    // Test 1: Get valid token
    console.log('Test 1: Getting valid token...');
    const token = await tokenManager.getValidToken();
    console.log(`✅ Token retrieved: ${token.substring(0, 20)}...\n`);

    // Test 2: Check token info
    console.log('Test 2: Checking token info...');
    const info = await tokenManager.getTokenInfo();
    console.log(`✅ Token expires: ${info.expiresAt.toLocaleString()}`);
    console.log(`✅ Days remaining: ${info.daysRemaining} days\n`);

    // Test 3: Verify token works with Instagram API
    console.log('Test 3: Verifying token with Instagram API...');
    const axios = require('axios');
    const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${accountId}`,
      {
        params: {
          fields: 'id,username',
          access_token: token,
        },
      }
    );

    console.log(`✅ Instagram API responded:`, response.data);
    console.log(`   Account: ${response.data.username}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 All tests passed!');
    console.log('\n📋 Summary:');
    console.log(`   ✅ Token is valid`);
    console.log(`   ✅ Auto-refresh will trigger in ${info.daysRemaining - 7} days`);
    console.log(`   ✅ Token expires in ${info.daysRemaining} days`);
    console.log(`   ✅ Instagram API accepts the token\n`);

    console.log('Your pipeline is ready to automatically post to Instagram! 🚀\n');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   API Error:', error.response.data);
    }
    process.exit(1);
  } finally {
    await database.close();
  }
}

testTokenManager();
