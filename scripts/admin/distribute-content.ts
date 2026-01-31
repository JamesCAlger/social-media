import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs/promises';
import { Database } from '../src/core/database';
import { DistributionLayer } from '../src/layers/06-distribution';

const contentId = '9da5cb22-fe4a-4bb4-bfaf-eea6d966df54';
const contentDir = path.resolve(`./content/${contentId}`);

async function main() {
  console.log('=== Distributing approved content to Instagram ===\n');

  const db = new Database();

  // 1. Get content from database
  const content = await db.getContent(contentId);
  if (!content) {
    console.error('Content not found:', contentId);
    await db.close();
    return;
  }

  console.log('Content ID:', content.id);
  console.log('Status:', content.status);
  console.log('R2 URL:', content.r2_url);

  if (content.status !== 'approved') {
    console.error('Content is not approved. Status:', content.status);
    await db.close();
    return;
  }

  // 2. Get idea data for caption
  const ideaPath = path.join(contentDir, 'idea.json');
  const ideaData = JSON.parse(await fs.readFile(ideaPath, 'utf-8'));

  // 3. Run distribution layer
  console.log('\nRunning distribution layer...');
  const distribution = new DistributionLayer(db);

  const result = await distribution.execute({
    contentId,
    reviewDecision: 'approved',
    finalCaption: ideaData.caption,
    videoUrl: content.r2_url!
  });

  console.log('\n=== Distribution Complete ===');
  console.log('Posts:', result.posts);

  await db.close();
}

main().catch(console.error);
