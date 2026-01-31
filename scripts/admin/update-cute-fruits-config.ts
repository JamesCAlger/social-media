/**
 * Update cute.fruits.asmr account configuration
 * - Fix hashtags to be niche-specific (remove generic ones)
 *
 * Run with: npx tsx scripts/update-cute-fruits-config.ts
 */

import 'dotenv/config';
import { Database } from '../src/core/database';
import { ContentType } from '../src/core/types';

async function main() {
  const db = new Database();

  try {
    // Get the cute.fruits.asmr account
    const account = await db.accounts.getAccountBySlug('cutting_fruits_asmr');

    if (!account) {
      console.error('Account not found: cutting_fruits_asmr');
      process.exit(1);
    }

    console.log(`Found account: ${account.name} (${account.slug})`);

    // Define the updated content type with proper hashtags
    const glassFruitContentType: ContentType = {
      name: 'glass-fruit-cutting',
      weight: 1,
      niche: 'cute_fruits_asmr',
      segmentCount: 1,
      segmentDuration: 10,
      hookStyle: 'visual',
      audioType: 'asmr_native',
      hashtagStrategy: 'niche_specific',
      // 3-5 highly relevant hashtags (Instagram 2025 best practice)
      customHashtags: [
        '#kawaii',
        '#asmr',
        '#satisfying',
        '#oddlysatisfying',
        '#cute',
      ],
    };

    // Update account with new content types array and optimized posting schedule
    await db.accounts.updateAccount(account.id, {
      contentTypes: [glassFruitContentType],
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
    console.log(`Config:`);
    console.log(`  - Name: ${glassFruitContentType.name}`);
    console.log(`  - Niche: ${glassFruitContentType.niche}`);
    console.log(`  - Segments: ${glassFruitContentType.segmentCount} x ${glassFruitContentType.segmentDuration}s`);
    console.log(`  - Hashtag strategy: ${glassFruitContentType.hashtagStrategy}`);
    console.log(`  - Custom hashtags: ${glassFruitContentType.customHashtags?.length} niche-specific tags`);

  } finally {
    await db.close();
  }
}

main().catch(console.error);
