import dotenv from 'dotenv';
import { GoogleDriveUploader } from '../src/utils/google-drive-uploader';
import path from 'path';
import fs from 'fs';

dotenv.config();

async function testGoogleDrive() {
  console.log('\n🧪 Testing Google Drive Upload\n');
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

  console.log('📹 Test video:', videoPath);
  console.log('📊 File size:', (fs.statSync(videoPath).size / 1024 / 1024).toFixed(2), 'MB\n');

  try {
    const uploader = new GoogleDriveUploader();

    console.log('📤 Uploading to Google Drive...\n');
    const publicUrl = await uploader.uploadVideo(videoPath);

    console.log('✅ Upload successful!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔗 Public URL:', publicUrl);
    console.log('\nYou can test this URL by:');
    console.log('  1. Opening it in a browser (should download)');
    console.log('  2. Using: curl -I "' + publicUrl + '"');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // List all videos in Drive
    console.log('📁 All videos in Google Drive:\n');
    const videos = await uploader.listVideos();
    videos.forEach((video, index) => {
      console.log(`${index + 1}. ${video.name}`);
      console.log(`   ID: ${video.id}`);
      console.log(`   Created: ${new Date(video.createdTime).toLocaleString()}`);
      console.log(`   Size: ${(parseInt(video.size) / 1024 / 1024).toFixed(2)} MB\n`);
    });
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\nPossible issues:');
    console.error('  1. Service account key file not found');
    console.error('  2. Service account not granted access to Drive');
    console.error('  3. Google Drive API not enabled in Cloud Console\n');
    process.exit(1);
  }
}

testGoogleDrive();
