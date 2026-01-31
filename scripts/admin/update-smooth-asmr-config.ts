/**
 * Update sm00th.asmr account configuration
 * - Change from 3x5s segments to 2x5s segments (10 seconds total)
 * - Update to use contentTypes array for better flexibility
 *
 * Run with: npx tsx scripts/update-smooth-asmr-config.ts
 */

import 'dotenv/config';
import { Database } from '../src/core/database';
import { ContentType } from '../src/core/types';

async function main() {
  const db = new Database();

  try {
    // Get the sm00th.asmr account (slug: asmr-pottery-test)
    const account = await db.accounts.getAccountBySlug('asmr-pottery-test');

    if (!account) {
      console.error('Account not found: asmr-pottery-test');
      process.exit(1);
    }

    console.log(`Found account: ${account.name} (${account.slug})`);
    console.log(`Current config:`);
    if (account.contentStrategy) {
      console.log(`  - Segment count: ${account.contentStrategy.segmentCount || 3}`);
      console.log(`  - Segment duration: ${account.contentStrategy.segmentDuration || 5}s`);
      console.log(`  - Total duration: ${(account.contentStrategy.segmentCount || 3) * (account.contentStrategy.segmentDuration || 5)}s`);
    }

    // Define the updated content type with 2 segments
    const potteryRevealContentType: ContentType = {
      name: 'pottery-reveal',
      weight: 1,
      niche: 'asmr_pottery',
      segmentCount: 2,        // Changed from 3 to 2
      segmentDuration: 5,     // 5 seconds each = 10 seconds total
      hookStyle: 'visual',
      audioType: 'asmr_native',
      hashtagStrategy: 'niche_specific',
      // 3-5 highly relevant hashtags (Instagram 2025 best practice)
      customHashtags: [
        '#asmr',
        '#pottery',
        '#oddlysatisfying',
        '#ceramics',
        '#satisfying',
      ],
    };

    // Update account with new content types array and optimized posting schedule
    // Note: contentStrategy is kept for backward compatibility but contentTypes takes precedence
    await db.accounts.updateAccount(account.id, {
      contentTypes: [potteryRevealContentType],
      contentTypeSelectionMode: 'random',
      postingSchedule: {
        postsPerDay: 1,
        // Optimal Reels posting times: 2-5 PM (14:00-17:00 UTC-5 / America/New_York)
        postingTimes: ['14:00', '15:00', '16:00'],
        // Weekdays only - weekends have lowest engagement
        activeDays: [1, 2, 3, 4, 5], // Mon-Fri
        timezone: 'America/New_York',
      },
    });

    console.log('\n✅ Account updated successfully!');
    console.log(`New config:`);
    console.log(`  - Name: ${potteryRevealContentType.name}`);
    console.log(`  - Niche: ${potteryRevealContentType.niche}`);
    console.log(`  - Segments: ${potteryRevealContentType.segmentCount} x ${potteryRevealContentType.segmentDuration}s`);
    console.log(`  - Total duration: ${potteryRevealContentType.segmentCount * potteryRevealContentType.segmentDuration}s`);
    console.log(`  - Hashtag strategy: ${potteryRevealContentType.hashtagStrategy}`);
    console.log(`  - Custom hashtags: ${potteryRevealContentType.customHashtags?.length} niche-specific tags`);

  } finally {
    await db.close();
  }
}

main().catch(console.error);
