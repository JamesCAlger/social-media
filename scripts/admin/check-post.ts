import dotenv from 'dotenv';
dotenv.config();

import { Database } from '../src/core/database';

const contentId = '9da5cb22-fe4a-4bb4-bfaf-eea6d966df54';

async function main() {
  const db = new Database();
  const client = await db.getClient();

  try {
    // Get content
    const contentResult = await client.query(
      'SELECT id, status, posted_at, r2_url FROM content WHERE id = $1',
      [contentId]
    );
    console.log('=== Content ===');
    console.log(JSON.stringify(contentResult.rows[0], null, 2));

    // Get platform posts
    const postsResult = await client.query(
      'SELECT platform, platform_post_id, post_url, status, created_at FROM platform_posts WHERE content_id = $1',
      [contentId]
    );
    console.log('\n=== Platform Posts ===');
    for (const post of postsResult.rows) {
      console.log(JSON.stringify(post, null, 2));
    }
  } finally {
    client.release();
  }

  await db.close();
}

main().catch(console.error);
