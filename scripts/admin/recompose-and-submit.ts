import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs/promises';
import { R2Uploader } from '../src/utils/r2-uploader';
import { TelegramProvider } from '../src/layers/05-review/telegram';
import { Database } from '../src/core/database';
import { LocalFFmpegComposer } from '../src/layers/04-composition/ffmpeg-local';
import { IdeaOutput, VideoGenerationOutput } from '../src/core/types';

const contentId = process.argv[2] || '0e28e4e3-1745-4cea-b22e-56b1913222b2';
const contentDir = path.resolve(`./content/${contentId}`);

async function main() {
  console.log('=== Recompose without text and submit for review ===');
  console.log('Content ID:', contentId);
  console.log('TEXT_OVERLAY_ENABLED:', process.env.TEXT_OVERLAY_ENABLED);
  console.log('');

  const db = new Database();

  // 1. Build VideoGenerationOutput from existing raw videos
  console.log('Step 1: Loading existing raw videos...');
  const videos = [
    { storagePath: `${contentId}/raw/video_1.mp4`, duration: 5 },
    { storagePath: `${contentId}/raw/video_2.mp4`, duration: 5 },
    { storagePath: `${contentId}/raw/video_3.mp4`, duration: 5 },
  ];

  const videoOutput: VideoGenerationOutput = {
    contentId,
    videos: videos.map((v, i) => ({
      storagePath: v.storagePath,
      duration: v.duration,
      sequence: i + 1,
      cost: 0,
    })),
  };

  // 2. Recompose without text overlays
  console.log('Step 2: Recomposing video (no text overlays)...');
  const composer = new LocalFFmpegComposer();
  const composedOutput = await composer.compose(videoOutput); // No textOverlays param = no text
  console.log('  Output:', composedOutput.finalVideo.storagePath);
  console.log('  Duration:', composedOutput.finalVideo.duration, 'seconds');

  // 3. Upload to R2
  console.log('\nStep 3: Uploading to R2...');
  const r2 = new R2Uploader();
  const finalVideoPath = path.resolve(`./content/${composedOutput.finalVideo.storagePath}`);
  const r2Url = await r2.uploadVideo(finalVideoPath, contentId);
  console.log('  R2 URL:', r2Url);

  // Update database
  await db.updateContent(contentId, {
    r2_url: r2Url,
    final_video_path: composedOutput.finalVideo.storagePath,
    status: 'review_pending',
  });

  // 4. Get idea data for caption
  console.log('\nStep 4: Loading idea data...');
  const ideaPath = path.join(contentDir, 'idea.json');
  const ideaData = JSON.parse(await fs.readFile(ideaPath, 'utf-8'));

  const idea: IdeaOutput = {
    id: contentId,
    timestamp: ideaData.timestamp,
    idea: ideaData.idea,
    caption: ideaData.caption,
    culturalContext: ideaData.culturalContext,
    environment: ideaData.environment,
    soundConcept: ideaData.soundConcept,
    textOverlays: ideaData.textOverlays,
    status: 'for_production',
  };

  // 5. Send to Telegram for review
  console.log('\nStep 5: Sending to Telegram for review...');
  const telegram = new TelegramProvider(
    process.env.TELEGRAM_BOT_TOKEN!,
    process.env.TELEGRAM_CHAT_ID!,
    db
  );

  await telegram.sendReviewRequest(idea, {
    contentId,
    finalVideo: {
      ...composedOutput.finalVideo,
      r2Url,
    },
  });

  console.log('\n=== Done! ===');
  console.log('Check Telegram for the review request.');
  console.log('Video duration:', composedOutput.finalVideo.duration, 'seconds (no intro, no text)');

  await db.close();
}

main().catch(console.error);
