/**
 * Retry posting approved content to Instagram
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { AccountRepository } from '../src/core/account-repository';
import { InstagramMultiAccountPlatform } from '../src/layers/06-distribution/platforms/instagram-multi';

async function retryPost() {
  const contentId = process.argv[2];

  if (!contentId) {
    console.error('Usage: npx tsx scripts/retry-post.ts <content-id>');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const accountRepo = new AccountRepository(pool);

  try {
    // Get content
    const contentResult = await pool.query(
      'SELECT id, account_id, caption, r2_url, status FROM content WHERE id = $1',
      [contentId]
    );

    if (contentResult.rows.length === 0) {
      console.error('Content not found:', contentId);
      process.exit(1);
    }

    const content = contentResult.rows[0];
    console.log('Content:', contentId);
    console.log('  Status:', content.status);
    console.log('  R2 URL:', content.r2_url);

    if (!content.r2_url) {
      console.error('No R2 URL found for content');
      process.exit(1);
    }

    // Get account
    const account = await accountRepo.getAccountById(content.account_id);
    if (!account) {
      console.error('Account not found:', content.account_id);
      process.exit(1);
    }

    console.log('\nAccount:', account.name);
    console.log('  Business ID:', account.businessAccountId);
    console.log('  Has Token:', account.accessToken ? 'Yes' : 'No');

    if (!account.accessToken) {
      console.error('Account has no token set');
      process.exit(1);
    }

    // Post to Instagram
    console.log('\nPosting to Instagram...');
    const instagram = new InstagramMultiAccountPlatform(accountRepo);
    const result = await instagram.post(account, content.r2_url, content.caption);

    if (result.status === 'posted') {
      console.log('\n✅ Posted successfully!');
      console.log('  Media ID:', result.postId);
      console.log('  URL:', result.postUrl);

      // Update content status
      await pool.query(
        "UPDATE content SET status = 'posted', posted_at = NOW() WHERE id = $1",
        [contentId]
      );
    } else {
      console.error('\n❌ Post failed:', result.error);
    }

  } finally {
    await pool.end();
  }
}

retryPost();
