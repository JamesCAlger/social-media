#!/usr/bin/env node
/**
 * CLI Tool for Managing Multi-Account System
 *
 * Usage:
 *   npx tsx src/cli/manage-accounts.ts list                    List all accounts
 *   npx tsx src/cli/manage-accounts.ts create                  Interactive account creation
 *   npx tsx src/cli/manage-accounts.ts create --json <file>    Create account from JSON file
 *   npx tsx src/cli/manage-accounts.ts get <slug>              Get account details
 *   npx tsx src/cli/manage-accounts.ts activate <slug>         Activate an account
 *   npx tsx src/cli/manage-accounts.ts deactivate <slug>       Deactivate an account
 *   npx tsx src/cli/manage-accounts.ts delete <slug>           Delete an account
 *   npx tsx src/cli/manage-accounts.ts setup-test              Create 12 test accounts for A/B testing
 */

import * as fs from 'fs';
import * as readline from 'readline';
import { Database } from '../core/database';
import { logger } from '../core/logger';
import { ContentStrategy, PostingSchedule } from '../core/types';

const db = new Database();

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  try {
    const command = args[0];

    switch (command) {
      case 'list':
      case 'ls': {
        await listAccounts();
        break;
      }

      case 'create': {
        if (args[1] === '--json' && args[2]) {
          await createFromJson(args[2]);
        } else {
          await createInteractive();
        }
        break;
      }

      case 'get': {
        const slug = args[1];
        if (!slug) {
          console.error('Error: Account slug required');
          process.exit(1);
        }
        await getAccount(slug);
        break;
      }

      case 'activate': {
        const slug = args[1];
        if (!slug) {
          console.error('Error: Account slug required');
          process.exit(1);
        }
        await setAccountActive(slug, true);
        break;
      }

      case 'deactivate': {
        const slug = args[1];
        if (!slug) {
          console.error('Error: Account slug required');
          process.exit(1);
        }
        await setAccountActive(slug, false);
        break;
      }

      case 'delete': {
        const slug = args[1];
        if (!slug) {
          console.error('Error: Account slug required');
          process.exit(1);
        }
        await deleteAccount(slug);
        break;
      }

      case 'setup-test': {
        await setupTestAccounts();
        break;
      }

      case 'help':
      case '--help':
      case '-h': {
        printUsage();
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error: any) {
    logger.error('CLI error', { error: error.message });
    console.error(`Error: ${error.message}`);
    process.exit(1);
  } finally {
    await db.close();
  }
}

async function listAccounts() {
  const accounts = await db.accounts.getAllAccounts();

  if (accounts.length === 0) {
    console.log('\nNo accounts found. Create accounts using "create" command.');
    return;
  }

  console.log('\nAccounts:');
  console.log('='.repeat(100));
  console.log(
    `${'Name'.padEnd(25)} ${'Slug'.padEnd(20)} ${'Platform'.padEnd(12)} ${'Active'.padEnd(8)} ${'Niche'.padEnd(20)} ${'Posts/Day'.padEnd(10)}`
  );
  console.log('-'.repeat(100));

  for (const account of accounts) {
    const active = account.isActive ? 'Yes' : 'No';
    const niche = (account.contentStrategy?.niche || 'N/A').substring(0, 18);
    const postsPerDay = account.postingSchedule?.postsPerDay || 1;

    console.log(
      `${account.name.padEnd(25)} ${account.slug.padEnd(20)} ${account.platform.padEnd(12)} ${active.padEnd(8)} ${niche.padEnd(20)} ${String(postsPerDay).padEnd(10)}`
    );
  }

  console.log('-'.repeat(100));
  console.log(`Total: ${accounts.length} accounts`);
}

async function getAccount(slug: string) {
  const account = await db.accounts.getAccountBySlug(slug);

  if (!account) {
    console.error(`Account not found: ${slug}`);
    process.exit(1);
  }

  console.log('\nAccount Details:');
  console.log('='.repeat(50));
  console.log(`ID: ${account.id}`);
  console.log(`Name: ${account.name}`);
  console.log(`Slug: ${account.slug}`);
  console.log(`Platform: ${account.platform}`);
  console.log(`Business Account ID: ${account.businessAccountId || 'Not set'}`);
  console.log(`Active: ${account.isActive ? 'Yes' : 'No'}`);
  console.log(`Consecutive Failures: ${account.consecutiveFailures}`);
  console.log(`Last Post: ${account.lastPostAt || 'Never'}`);
  console.log(`Created: ${account.createdAt}`);

  console.log('\nContent Strategy:');
  if (account.contentStrategy) {
    console.log(`  Niche: ${account.contentStrategy.niche}`);
    console.log(`  Content Type: ${account.contentStrategy.contentType}`);
    console.log(`  Video Length: ${account.contentStrategy.videoLength}s`);
    console.log(`  Segment Count: ${account.contentStrategy.segmentCount || 3}`);
    console.log(`  Segment Duration: ${account.contentStrategy.segmentDuration || 5}s`);
    console.log(`  Hook Style: ${account.contentStrategy.hookStyle}`);
    console.log(`  Audio Type: ${account.contentStrategy.audioType}`);
    console.log(`  Hashtag Strategy: ${account.contentStrategy.hashtagStrategy}`);
    if (account.contentStrategy.nicheDescription) {
      console.log(`  Description: ${account.contentStrategy.nicheDescription}`);
    }
  } else {
    console.log('  Not configured');
  }

  console.log('\nPosting Schedule:');
  if (account.postingSchedule) {
    console.log(`  Posts Per Day: ${account.postingSchedule.postsPerDay}`);
    console.log(`  Posting Times: ${account.postingSchedule.postingTimes.join(', ')}`);
    console.log(`  Active Days: ${account.postingSchedule.activeDays.join(', ')}`);
    console.log(`  Timezone: ${account.postingSchedule.timezone}`);
  } else {
    console.log('  Not configured');
  }

  // Get today's post count
  const todayCount = await db.accounts.getTodayPostCount(account.id);
  console.log(`\nToday's Posts: ${todayCount}`);
}

async function createFromJson(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  const account = await db.accounts.createAccount({
    name: data.name,
    slug: data.slug,
    platform: data.platform || 'instagram',
    businessAccountId: data.businessAccountId,
    accessToken: data.accessToken,
    tokenExpiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : undefined,
    facebookAppId: data.facebookAppId,
    facebookAppSecret: data.facebookAppSecret,
    contentStrategy: data.contentStrategy,
    postingSchedule: data.postingSchedule,
    isActive: data.isActive ?? true,
  });

  console.log(`\nAccount created successfully!`);
  console.log(`  ID: ${account.id}`);
  console.log(`  Name: ${account.name}`);
  console.log(`  Slug: ${account.slug}`);
}

async function createInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  try {
    console.log('\nCreate New Account');
    console.log('='.repeat(50));

    const name = await question('Account Name: ');
    const slug = await question('Slug (lowercase, no spaces): ');
    const platform = (await question('Platform (instagram/tiktok/youtube) [instagram]: ')) || 'instagram';
    const businessAccountId = await question('Instagram Business Account ID (optional): ');

    console.log('\nContent Strategy:');
    console.log('  Niches: asmr_pottery, oddly_satisfying, nature_sounds, craft_process, cute_fruits_asmr, custom');
    const niche = (await question('  Niche [asmr_pottery]: ')) || 'asmr_pottery';

    let nicheDescription: string | undefined;
    if (niche === 'custom') {
      nicheDescription = await question('  Custom Niche Description: ');
    }

    console.log('  Content Types: reels_only, carousels_only, mixed');
    const contentType = (await question('  Content Type [reels_only]: ')) || 'reels_only';

    const videoLengthStr = (await question('  Video Length (7/10/15/30) [15]: ')) || '15';
    const videoLength = parseInt(videoLengthStr, 10) as 7 | 10 | 15 | 30;

    const segmentCountStr = (await question('  Segment Count (1/2/3) [3]: ')) || '3';
    const segmentCount = parseInt(segmentCountStr, 10) as 1 | 2 | 3;

    const segmentDurationStr = (await question('  Segment Duration in seconds (5/7/10) [5]: ')) || '5';
    const segmentDuration = parseInt(segmentDurationStr, 10) as 5 | 7 | 10;

    console.log('  Hook Styles: visual, text_overlay, question');
    const hookStyle = (await question('  Hook Style [visual]: ')) || 'visual';

    console.log('  Audio Types: asmr_native, trending_audio, silent');
    const audioType = (await question('  Audio Type [asmr_native]: ')) || 'asmr_native';

    console.log('  Hashtag Strategies: niche_specific, trending, mixed');
    const hashtagStrategy = (await question('  Hashtag Strategy [niche_specific]: ')) || 'niche_specific';

    console.log('\nPosting Schedule:');
    const postsPerDayStr = (await question('  Posts Per Day (1/2/3) [1]: ')) || '1';
    const postsPerDay = parseInt(postsPerDayStr, 10) as 1 | 2 | 3;

    const postingTimesStr = (await question('  Posting Times (comma-separated, e.g., "09:00,18:00") [09:00]: ')) || '09:00';
    const postingTimes = postingTimesStr.split(',').map((t) => t.trim());

    const activeDaysStr = (await question('  Active Days (0=Sun, comma-separated) [0,1,2,3,4,5,6]: ')) || '0,1,2,3,4,5,6';
    const activeDays = activeDaysStr.split(',').map((d) => parseInt(d.trim(), 10));

    const timezone = (await question('  Timezone [America/New_York]: ')) || 'America/New_York';

    const contentStrategy: ContentStrategy = {
      niche: niche as any,
      contentType: contentType as any,
      videoLength,
      segmentCount,
      segmentDuration,
      hookStyle: hookStyle as any,
      audioType: audioType as any,
      hashtagStrategy: hashtagStrategy as any,
      nicheDescription,
    };

    const postingSchedule: PostingSchedule = {
      postsPerDay,
      postingTimes,
      activeDays,
      timezone,
    };

    const account = await db.accounts.createAccount({
      name,
      slug,
      platform: platform as any,
      businessAccountId: businessAccountId || undefined,
      contentStrategy,
      postingSchedule,
      isActive: true,
    });

    console.log(`\nAccount created successfully!`);
    console.log(`  ID: ${account.id}`);
    console.log(`  Name: ${account.name}`);
    console.log(`  Slug: ${account.slug}`);
  } finally {
    rl.close();
  }
}

async function setAccountActive(slug: string, isActive: boolean) {
  const account = await db.accounts.getAccountBySlug(slug);

  if (!account) {
    console.error(`Account not found: ${slug}`);
    process.exit(1);
  }

  await db.accounts.updateAccount(account.id, { isActive });

  console.log(`Account "${account.name}" has been ${isActive ? 'activated' : 'deactivated'}.`);
}

async function deleteAccount(slug: string) {
  const account = await db.accounts.getAccountBySlug(slug);

  if (!account) {
    console.error(`Account not found: ${slug}`);
    process.exit(1);
  }

  // Check if account has content
  const recentContent = await db.getContentByAccount(account.id, 1);
  if (recentContent.length > 0) {
    console.error(
      `Cannot delete account "${account.name}" - it has associated content.`
    );
    console.error('Deactivate the account instead: npx tsx src/cli/manage-accounts.ts deactivate ' + slug);
    process.exit(1);
  }

  await db.accounts.deleteAccount(account.id);
  console.log(`Account "${account.name}" has been deleted.`);
}

async function setupTestAccounts() {
  console.log('\nCreating 12 Test Accounts for A/B Testing');
  console.log('='.repeat(60));

  const testConfigs: Array<{
    name: string;
    slug: string;
    strategy: ContentStrategy;
    schedule: PostingSchedule;
  }> = [
    // Niche variations (4 accounts)
    {
      name: 'ASMR Pottery Test',
      slug: 'asmr-pottery-test',
      strategy: {
        niche: 'asmr_pottery',
        contentType: 'reels_only',
        videoLength: 15,
        hookStyle: 'visual',
        audioType: 'asmr_native',
        hashtagStrategy: 'niche_specific',
      },
      schedule: { postsPerDay: 1, postingTimes: ['09:00'], activeDays: [0, 1, 2, 3, 4, 5, 6], timezone: 'America/New_York' },
    },
    {
      name: 'Oddly Satisfying Test',
      slug: 'satisfying-test',
      strategy: {
        niche: 'oddly_satisfying',
        contentType: 'reels_only',
        videoLength: 15,
        hookStyle: 'visual',
        audioType: 'asmr_native',
        hashtagStrategy: 'niche_specific',
      },
      schedule: { postsPerDay: 1, postingTimes: ['09:00'], activeDays: [0, 1, 2, 3, 4, 5, 6], timezone: 'America/New_York' },
    },
    {
      name: 'Nature Sounds Test',
      slug: 'nature-sounds-test',
      strategy: {
        niche: 'nature_sounds',
        contentType: 'reels_only',
        videoLength: 15,
        hookStyle: 'visual',
        audioType: 'asmr_native',
        hashtagStrategy: 'niche_specific',
      },
      schedule: { postsPerDay: 1, postingTimes: ['09:00'], activeDays: [0, 1, 2, 3, 4, 5, 6], timezone: 'America/New_York' },
    },
    {
      name: 'Craft Process Test',
      slug: 'craft-process-test',
      strategy: {
        niche: 'craft_process',
        contentType: 'reels_only',
        videoLength: 15,
        hookStyle: 'visual',
        audioType: 'asmr_native',
        hashtagStrategy: 'niche_specific',
      },
      schedule: { postsPerDay: 1, postingTimes: ['09:00'], activeDays: [0, 1, 2, 3, 4, 5, 6], timezone: 'America/New_York' },
    },

    // Video length variations (3 accounts - same niche, different lengths)
    {
      name: 'ASMR 7s Format',
      slug: 'asmr-7s',
      strategy: {
        niche: 'asmr_pottery',
        contentType: 'reels_only',
        videoLength: 7,
        hookStyle: 'visual',
        audioType: 'asmr_native',
        hashtagStrategy: 'niche_specific',
      },
      schedule: { postsPerDay: 1, postingTimes: ['10:00'], activeDays: [0, 1, 2, 3, 4, 5, 6], timezone: 'America/New_York' },
    },
    {
      name: 'ASMR 15s Format',
      slug: 'asmr-15s',
      strategy: {
        niche: 'asmr_pottery',
        contentType: 'reels_only',
        videoLength: 15,
        hookStyle: 'visual',
        audioType: 'asmr_native',
        hashtagStrategy: 'niche_specific',
      },
      schedule: { postsPerDay: 1, postingTimes: ['10:00'], activeDays: [0, 1, 2, 3, 4, 5, 6], timezone: 'America/New_York' },
    },
    {
      name: 'ASMR 30s Format',
      slug: 'asmr-30s',
      strategy: {
        niche: 'asmr_pottery',
        contentType: 'reels_only',
        videoLength: 30,
        hookStyle: 'visual',
        audioType: 'asmr_native',
        hashtagStrategy: 'niche_specific',
      },
      schedule: { postsPerDay: 1, postingTimes: ['10:00'], activeDays: [0, 1, 2, 3, 4, 5, 6], timezone: 'America/New_York' },
    },

    // Hook style variations (3 accounts)
    {
      name: 'Visual Hook Test',
      slug: 'visual-hook',
      strategy: {
        niche: 'oddly_satisfying',
        contentType: 'reels_only',
        videoLength: 15,
        hookStyle: 'visual',
        audioType: 'asmr_native',
        hashtagStrategy: 'mixed',
      },
      schedule: { postsPerDay: 1, postingTimes: ['12:00'], activeDays: [0, 1, 2, 3, 4, 5, 6], timezone: 'America/New_York' },
    },
    {
      name: 'Text Overlay Hook',
      slug: 'text-hook',
      strategy: {
        niche: 'oddly_satisfying',
        contentType: 'reels_only',
        videoLength: 15,
        hookStyle: 'text_overlay',
        audioType: 'asmr_native',
        hashtagStrategy: 'mixed',
      },
      schedule: { postsPerDay: 1, postingTimes: ['12:00'], activeDays: [0, 1, 2, 3, 4, 5, 6], timezone: 'America/New_York' },
    },
    {
      name: 'Question Hook Test',
      slug: 'question-hook',
      strategy: {
        niche: 'oddly_satisfying',
        contentType: 'reels_only',
        videoLength: 15,
        hookStyle: 'question',
        audioType: 'asmr_native',
        hashtagStrategy: 'mixed',
      },
      schedule: { postsPerDay: 1, postingTimes: ['12:00'], activeDays: [0, 1, 2, 3, 4, 5, 6], timezone: 'America/New_York' },
    },

    // Posting frequency variations (2 accounts)
    {
      name: 'High Frequency Test',
      slug: 'high-freq',
      strategy: {
        niche: 'oddly_satisfying',
        contentType: 'reels_only',
        videoLength: 15,
        hookStyle: 'visual',
        audioType: 'asmr_native',
        hashtagStrategy: 'trending',
      },
      schedule: { postsPerDay: 3, postingTimes: ['09:00', '14:00', '19:00'], activeDays: [0, 1, 2, 3, 4, 5, 6], timezone: 'America/New_York' },
    },
    {
      name: 'Low Frequency Test',
      slug: 'low-freq',
      strategy: {
        niche: 'oddly_satisfying',
        contentType: 'reels_only',
        videoLength: 15,
        hookStyle: 'visual',
        audioType: 'asmr_native',
        hashtagStrategy: 'trending',
      },
      schedule: { postsPerDay: 1, postingTimes: ['12:00'], activeDays: [1, 3, 5], timezone: 'America/New_York' },
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const config of testConfigs) {
    // Check if account already exists
    const existing = await db.accounts.getAccountBySlug(config.slug);
    if (existing) {
      console.log(`  [SKIP] ${config.name} (${config.slug}) - already exists`);
      skipped++;
      continue;
    }

    const account = await db.accounts.createAccount({
      name: config.name,
      slug: config.slug,
      platform: 'instagram',
      contentStrategy: config.strategy,
      postingSchedule: config.schedule,
      isActive: false, // Start inactive - need to add Instagram credentials
    });

    console.log(`  [CREATE] ${account.name} (${account.slug})`);
    created++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Created: ${created} accounts`);
  console.log(`Skipped: ${skipped} accounts (already exist)`);
  console.log('\nNext steps:');
  console.log('1. Add Instagram Business Account IDs and tokens for each account');
  console.log('2. Activate accounts when ready: npx tsx src/cli/manage-accounts.ts activate <slug>');
  console.log('3. Run pipelines: npx tsx src/cli/run-account.ts --account <slug>');
}

function printUsage() {
  console.log(`
Multi-Account Management Tool

Usage:
  npx tsx src/cli/manage-accounts.ts <command> [options]

Commands:
  list, ls                List all accounts
  create                  Create a new account interactively
  create --json <file>    Create account from JSON file
  get <slug>              Get detailed info about an account
  activate <slug>         Activate an account
  deactivate <slug>       Deactivate an account
  delete <slug>           Delete an account (only if no content)
  setup-test              Create 12 test accounts for A/B testing
  help, -h                Show this help message

Examples:
  npx tsx src/cli/manage-accounts.ts list
  npx tsx src/cli/manage-accounts.ts create
  npx tsx src/cli/manage-accounts.ts get asmr-pottery-test
  npx tsx src/cli/manage-accounts.ts setup-test

JSON File Format:
  {
    "name": "My Account",
    "slug": "my-account",
    "platform": "instagram",
    "businessAccountId": "1234567890",
    "accessToken": "your-token",
    "tokenExpiresAt": "2025-02-01T00:00:00Z",
    "contentStrategy": {
      "niche": "asmr_pottery",
      "contentType": "reels_only",
      "videoLength": 15,
      "hookStyle": "visual",
      "audioType": "asmr_native",
      "hashtagStrategy": "niche_specific"
    },
    "postingSchedule": {
      "postsPerDay": 1,
      "postingTimes": ["09:00"],
      "activeDays": [0,1,2,3,4,5,6],
      "timezone": "America/New_York"
    }
  }
`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
