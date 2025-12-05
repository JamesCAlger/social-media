import dotenv from 'dotenv';
import { InstagramPlatform } from '../src/layers/06-distribution/platforms/instagram';
import path from 'path';
import fs from 'fs';

dotenv.config();

async function testInstagram() {
  console.log('\n🧪 Testing Instagram Distribution\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check credentials
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!accessToken || accessToken === 'xxx') {
    console.error('❌ INSTAGRAM_ACCESS_TOKEN not set in .env file');
    console.error('\nPlease set your Instagram access token:');
    console.error('  1. Go to https://developers.facebook.com/tools/explorer/');
    console.error('  2. Generate token with instagram_basic and instagram_content_publish permissions');
    console.error('  3. Add to .env: INSTAGRAM_ACCESS_TOKEN=your_token\n');
    process.exit(1);
  }

  if (!businessAccountId || businessAccountId === 'xxx') {
    console.error('❌ INSTAGRAM_BUSINESS_ACCOUNT_ID not set in .env file');
    console.error('\nTo get your Business Account ID:');
    console.error('  1. In Graph API Explorer, query: me/accounts');
    console.error('  2. Find your page ID');
    console.error('  3. Query: {page_id}?fields=instagram_business_account');
    console.error('  4. Add to .env: INSTAGRAM_BUSINESS_ACCOUNT_ID=your_id\n');
    process.exit(1);
  }

  console.log('✅ Access Token:', accessToken.substring(0, 20) + '...');
  console.log('✅ Business Account ID:', businessAccountId);
  console.log('');

  // Test video
  const contentId = '24ad4a85-c303-4041-a957-cd847a1ff8ff';
  const videoPath = `${contentId}/final_video.mp4`;
  const fullVideoPath = path.join(process.cwd(), 'content', videoPath);

  if (!fs.existsSync(fullVideoPath)) {
    console.error('❌ Test video not found:', fullVideoPath);
    process.exit(1);
  }

  console.log('📹 Video:', videoPath);
  console.log('📊 Size:', (fs.statSync(fullVideoPath).size / 1024 / 1024).toFixed(2), 'MB');

  // Test caption
  const caption = `🖌️ Unearth Hidden History!

#AncientPottery #CraftRevival #ThrowbackThursday #TrendingArt #Love #InstaGood #PhotoOfTheDay #Art #Fashion`;

  console.log('📝 Caption:', caption.split('\n')[0]);
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🚀 Starting Instagram Upload Process...\n');

  try {
    const instagram = new InstagramPlatform(accessToken, businessAccountId);

    console.log('Step 1: Uploading to Google Drive...');
    console.log('Step 2: Creating Instagram media container...');
    console.log('Step 3: Publishing to Instagram Reels...\n');
    console.log('⏳ This may take 30-60 seconds...\n');

    const result = await instagram.post(videoPath, caption);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (result.status === 'posted') {
      console.log('✅ Successfully posted to Instagram!\n');
      console.log('📱 Post URL:', result.postUrl);
      console.log('🆔 Media ID:', result.postId);
      console.log('⏰ Posted At:', new Date(result.postedAt).toLocaleString());
      console.log('\n🎉 Check your Instagram profile to see the Reel!\n');
    } else {
      console.error('❌ Failed to post to Instagram\n');
      console.error('Error:', result.error);
      console.error('\nCommon issues:');
      console.error('  1. Access token expired or invalid');
      console.error('  2. Missing permissions (instagram_content_publish)');
      console.error('  3. Instagram account not Business/Creator type');
      console.error('  4. Video doesn\'t meet Instagram Reels requirements');
      console.error('  5. Account not linked to Facebook Page\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

testInstagram();
