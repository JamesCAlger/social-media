import dotenv from 'dotenv';
import { R2Uploader } from '../src/utils/r2-uploader';
import path from 'path';
import fs from 'fs';

dotenv.config();

async function testR2Upload() {
  console.log('\n🧪 Testing Cloudflare R2 Upload\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const videoPath = path.join(
    process.cwd(),
    'content',
    '24ad4a85-c303-4041-a957-cd847a1ff8ff',
    'final_video.mp4'
  );

  if (!fs.existsSync(videoPath)) {
    console.error('❌ Test video not found:', videoPath);
    process.exit(1);
  }

  const contentId = '24ad4a85-c303-4041-a957-cd847a1ff8ff';

  console.log('📹 Test video:', videoPath);
  console.log('📊 File size:', (fs.statSync(videoPath).size / 1024 / 1024).toFixed(2), 'MB');
  console.log('🆔 Content ID:', contentId, '\n');

  try {
    const uploader = new R2Uploader();

    console.log('📤 Uploading to Cloudflare R2...\n');
    const publicUrl = await uploader.uploadVideo(videoPath, contentId);

    console.log('✅ Upload successful!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔗 Public URL:', publicUrl);
    console.log('\n📋 Next Steps:');
    console.log('  1. Test this URL in your browser (should download video)');
    console.log('  2. Use this URL for Instagram upload');
    console.log('  3. Test Instagram posting with this URL\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // List all videos in R2
    console.log('📁 All videos in R2 bucket:\n');
    const videos = await uploader.listVideos();

    if (videos.length === 0) {
      console.log('  (No videos found - this is unexpected if upload succeeded)\n');
    } else {
      videos.forEach((video, index) => {
        console.log(`${index + 1}. ${video.key}`);
        console.log(`   Size: ${(video.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Last Modified: ${video.lastModified.toLocaleString()}\n`);
      });
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\nPossible issues:');
    console.error('  1. R2 credentials not set correctly in .env');
    console.error('  2. Bucket name mismatch');
    console.error('  3. Network/API error\n');
    process.exit(1);
  }
}

testR2Upload();
