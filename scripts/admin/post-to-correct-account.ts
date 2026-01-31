import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs/promises';
import { Database } from '../src/core/database';
import { InstagramMultiAccountPlatform } from '../src/layers/06-distribution/platforms/instagram-multi';

const contentId = process.argv[2] || '63ed6bb8-dda1-4beb-9106-e17df4553d2c';

async function main() {
  console.log('=== Posting to correct account ===\n');
  console.log('Content ID:', contentId);

  const db = new Database();

  // 1. Get content from database
  const content = await db.getContent(contentId);
  if (!content) {
    console.error('Content not found!');
    await db.close();
    return;
  }

  console.log('\nContent details:');
  console.log('  Account ID:', content.account_id);
  console.log('  R2 URL:', content.r2_url);
  console.log('  Status:', content.status);

  if (!content.account_id) {
    console.error('Content has no account_id!');
    await db.close();
    return;
  }

  // 2. Get account from database
  const account = await db.accounts.getAccountById(content.account_id);
  if (!account) {
    console.error('Account not found!');
    await db.close();
    return;
  }

  console.log('\nAccount details:');
  console.log('  Name:', account.name);
  console.log('  Business Account ID:', account.businessAccountId);

  // 3. Get idea data from idea.json
  const ideaPath = path.resolve(`./content/${contentId}/idea.json`);
  const ideaData = JSON.parse(await fs.readFile(ideaPath, 'utf-8'));
  console.log('  Caption:', ideaData.caption.substring(0, 60) + '...');

  // 4. Post to Instagram using multi-account platform
  console.log('\nPosting to Instagram...');
  const instagramMulti = new InstagramMultiAccountPlatform(db.accounts);
  const result = await instagramMulti.post(account, content.r2_url!, ideaData.caption);

  console.log('\n=== Result ===');
  console.log('  Status:', result.status);
  console.log('  Post ID:', result.postId);
  console.log('  Post URL:', result.postUrl);
  if (result.error) {
    console.log('  Error:', result.error);
  }

  // 5. Update database if successful
  if (result.status === 'posted') {
    await db.updateContent(contentId, {
      status: 'posted',
      posted_at: new Date(),
    });

    const client = await db.getClient();
    await client.query(
      `INSERT INTO platform_posts (content_id, platform, post_id, post_url, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [contentId, 'instagram', result.postId, result.postUrl, 'success']
    );
    client.release();

    console.log('\nDatabase updated!');
  }

  await db.close();
}

main().catch(console.error);
