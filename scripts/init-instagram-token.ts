import dotenv from 'dotenv';
import { Database } from '../src/core/database';
import { InstagramTokenManager } from '../src/utils/instagram-token-manager';

dotenv.config();

async function initInstagramToken() {
  console.log('\n🔑 Initializing Instagram Token Manager\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const database = new Database();

  try {
    const tokenManager = new InstagramTokenManager(database);

    // Get valid token (this will initialize from .env if needed)
    const token = await tokenManager.getValidToken();

    console.log('✅ Token initialized successfully!\n');

    // Get token info
    const info = await tokenManager.getTokenInfo();

    console.log('📋 Token Information:');
    console.log(`   Expires: ${info.expiresAt.toLocaleString()}`);
    console.log(`   Days remaining: ${info.daysRemaining} days`);
    console.log(`   Will auto-refresh when: < 7 days remaining\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 Setup complete! Your pipeline will automatically');
    console.log('   refresh the token when it gets close to expiry.\n');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\nPossible issues:');
    console.error('  1. INSTAGRAM_ACCESS_TOKEN not set in .env');
    console.error('  2. FACEBOOK_APP_ID or FACEBOOK_APP_SECRET missing');
    console.error('  3. Database connection error\n');
    process.exit(1);
  } finally {
    await database.close();
  }
}

initInstagramToken();
