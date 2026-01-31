import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs/promises';
import { Database } from '../src/core/database';
import { DistributionLayer } from '../src/layers/06-distribution';
import { IdeaOutput, CompositionOutput } from '../src/core/types';

const contentId = process.argv[2] || '0e28e4e3-1745-4cea-b22e-56b1913222b2';

async function main() {
  console.log('=== Approving and distributing content ===\n');
  console.log('Content ID:', contentId);

  const db = new Database();

  // 1. Update status to approved
  console.log('\nStep 1: Setting status to approved...');
  await db.updateContent(contentId, { status: 'approved' });
  console.log('  Status updated to: approved');

  // 2. Get content from database
  const content = await db.getContent(contentId);
  if (!content) {
    console.error('Content not found!');
    await db.close();
    return;
  }
  console.log('  R2 URL:', content.r2_url);

  // 3. Get idea data from idea.json
  const ideaPath = path.resolve(`./content/${contentId}/idea.json`);
  const ideaData = JSON.parse(await fs.readFile(ideaPath, 'utf-8'));
  console.log('  Caption:', ideaData.caption.substring(0, 60) + '...');

  // Build IdeaOutput object
  const idea: IdeaOutput = {
    id: contentId,
    timestamp: ideaData.timestamp,
    idea: ideaData.idea,
    caption: ideaData.caption,
    culturalContext: ideaData.culturalContext,
    environment: ideaData.environment,
    soundConcept: ideaData.soundConcept,
    textOverlays: ideaData.textOverlays,
    status: 'approved',
  };

  // Build CompositionOutput object
  const composition: CompositionOutput = {
    contentId,
    finalVideo: {
      storagePath: `${contentId}/final_video.mp4`,
      duration: 15,
      fileSize: 0,
      r2Url: content.r2_url!,
    },
  };

  // 4. Run distribution
  console.log('\nStep 2: Running distribution to Instagram...');
  const distribution = new DistributionLayer(db);
  const result = await distribution.execute(idea, composition);

  console.log('\n=== Distribution Complete! ===');
  for (const post of result.posts) {
    console.log(`  ${post.platform}: ${post.status}`);
    if (post.postUrl) console.log(`    URL: ${post.postUrl}`);
    if (post.error) console.log(`    Error: ${post.error}`);
  }

  await db.close();
}

main().catch(console.error);
