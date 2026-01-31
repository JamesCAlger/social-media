/**
 * Setup content type for cute.fruits.asmr account
 * Run with: npx tsx scripts/setup-cute-fruits-content-type.ts
 */

import { Database } from '../src/core/database';
import { ContentType } from '../src/core/types';

async function main() {
  const db = new Database();

  try {
    const account = await db.accounts.getAccountBySlug('cutting_fruits_asmr');

    if (!account) {
      console.error('Account not found: cutting_fruits_asmr');
      process.exit(1);
    }

    console.log(`Found account: ${account.name}`);

    // Define the glass fruit cutting content type
    const glassFruitContentType: ContentType = {
      name: 'glass-fruit-cutting',
      weight: 1,
      niche: 'cute_fruits_asmr',
      segmentCount: 1,
      segmentDuration: 10,
      hookStyle: 'visual',
      audioType: 'asmr_native',
      hashtagStrategy: 'niche_specific',
    };

    // Update account with content types
    await db.accounts.updateAccount(account.id, {
      contentTypes: [glassFruitContentType],
      contentTypeSelectionMode: 'random',
    });

    console.log('✅ Content type added successfully!');
    console.log(`   Name: ${glassFruitContentType.name}`);
    console.log(`   Niche: ${glassFruitContentType.niche}`);
    console.log(`   Segments: ${glassFruitContentType.segmentCount} x ${glassFruitContentType.segmentDuration}s`);

  } finally {
    await db.close();
  }
}

main().catch(console.error);
