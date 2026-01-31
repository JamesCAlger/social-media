import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs/promises';
import { R2Uploader } from '../src/utils/r2-uploader';
import { TelegramProvider } from '../src/layers/05-review/telegram';
import { Database } from '../src/core/database';
import { IdeaOutput, CompositionOutput } from '../src/core/types';

const contentId = '9da5cb22-fe4a-4bb4-bfaf-eea6d966df54';
const contentDir = path.resolve(`./content/${contentId}`);

async function main() {
  console.log('=== Submitting new video for review ===\n');

  const db = new Database();

  // 1. Upload new video to R2
  console.log('Step 1: Uploading new video to R2...');
  const r2 = new R2Uploader();
  const finalVideoPath = path.join(contentDir, 'final_video_new.mp4');
  const stats = await fs.stat(finalVideoPath);
  const r2Url = await r2.uploadVideo(finalVideoPath, contentId);
  console.log('  R2 URL:', r2Url);

  // Update database with new R2 URL
  await db.updateContent(contentId, {
    r2_url: r2Url,
    status: 'review_pending'
  });

  // 2. Get idea data for caption
  const ideaPath = path.join(contentDir, 'idea.json');
  const ideaData = JSON.parse(await fs.readFile(ideaPath, 'utf-8'));

  // Build full idea object
  const idea: IdeaOutput = {
    id: contentId,
    timestamp: ideaData.timestamp,
    idea: ideaData.idea,
    caption: ideaData.caption,
    culturalContext: ideaData.culturalContext,
    environment: ideaData.environment,
    soundConcept: ideaData.soundConcept,
    textOverlays: ideaData.textOverlays,
    status: 'for_production'
  };

  // Build composition output
  const composition: CompositionOutput = {
    contentId,
    finalVideo: {
      storagePath: `${contentId}/final_video_new.mp4`,
      duration: 17.5,
      fileSize: stats.size,
      r2Url
    }
  };

  // 3. Send to Telegram for review
  console.log('\nStep 2: Sending to Telegram for review...');
  const telegram = new TelegramProvider(
    process.env.TELEGRAM_BOT_TOKEN!,
    process.env.TELEGRAM_CHAT_ID!,
    db
  );

  await telegram.sendReviewRequest(idea, composition);

  console.log('\n=== Sent to Telegram! ===');
  console.log('Please check your Telegram app to approve/reject.');
  console.log('The pipeline poller will handle the response.');

  await db.close();
}

main().catch(console.error);
