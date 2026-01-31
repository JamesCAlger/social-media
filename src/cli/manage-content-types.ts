#!/usr/bin/env node
/**
 * CLI Tool for Managing Content Types
 *
 * Usage:
 *   npx tsx src/cli/manage-content-types.ts list <account-slug>           List content types for account
 *   npx tsx src/cli/manage-content-types.ts add <account-slug>            Add content type interactively
 *   npx tsx src/cli/manage-content-types.ts remove <account-slug> <name>  Remove content type by name
 *   npx tsx src/cli/manage-content-types.ts set-mode <account-slug> <mode> Set selection mode
 */

import * as readline from 'readline';
import { Database } from '../core/database';
import { logger } from '../core/logger';
import { ContentType, ContentTypeSelectionMode, NicheType } from '../core/types';

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
        const slug = args[1];
        if (!slug) {
          console.error('Error: Account slug required');
          process.exit(1);
        }
        await listContentTypes(slug);
        break;
      }

      case 'add': {
        const slug = args[1];
        if (!slug) {
          console.error('Error: Account slug required');
          process.exit(1);
        }
        await addContentType(slug);
        break;
      }

      case 'remove':
      case 'rm': {
        const slug = args[1];
        const name = args[2];
        if (!slug || !name) {
          console.error('Error: Account slug and content type name required');
          process.exit(1);
        }
        await removeContentType(slug, name);
        break;
      }

      case 'set-mode': {
        const slug = args[1];
        const mode = args[2] as ContentTypeSelectionMode;
        if (!slug || !mode) {
          console.error('Error: Account slug and mode required');
          process.exit(1);
        }
        await setSelectionMode(slug, mode);
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

async function listContentTypes(slug: string) {
  const account = await db.accounts.getAccountBySlug(slug);

  if (!account) {
    console.error(`Account not found: ${slug}`);
    process.exit(1);
  }

  console.log(`\nContent Types for ${account.name} (${account.slug})`);
  console.log('='.repeat(70));

  if (!account.contentTypes || account.contentTypes.length === 0) {
    console.log('\nNo content types defined. Using legacy contentStrategy:');
    if (account.contentStrategy) {
      console.log(`  Niche: ${account.contentStrategy.niche}`);
      console.log(`  Segment Count: ${account.contentStrategy.segmentCount || 3}`);
      console.log(`  Segment Duration: ${account.contentStrategy.segmentDuration || 5}s`);
    } else {
      console.log('  (No content strategy defined)');
    }
    return;
  }

  console.log(`\nSelection Mode: ${account.contentTypeSelectionMode || 'random'}`);
  console.log(`Last Used Index: ${account.lastContentTypeIndex ?? 'N/A'}`);
  console.log(`\nContent Types (${account.contentTypes.length}):`);
  console.log('-'.repeat(70));

  for (let i = 0; i < account.contentTypes.length; i++) {
    const ct = account.contentTypes[i];
    console.log(`\n[${i}] ${ct.name}`);
    console.log(`    Niche: ${ct.niche}`);
    console.log(`    Weight: ${ct.weight || 1}`);
    console.log(`    Segments: ${ct.segmentCount} x ${ct.segmentDuration}s`);
    console.log(`    Hook: ${ct.hookStyle} | Audio: ${ct.audioType}`);
    console.log(`    Hashtags: ${ct.hashtagStrategy}`);
    if (ct.nicheDescription) {
      console.log(`    Description: ${ct.nicheDescription.substring(0, 50)}...`);
    }
  }
}

async function addContentType(slug: string) {
  const account = await db.accounts.getAccountBySlug(slug);

  if (!account) {
    console.error(`Account not found: ${slug}`);
    process.exit(1);
  }

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
    console.log(`\nAdd Content Type to ${account.name}`);
    console.log('='.repeat(50));

    const name = await question('Content Type Name (e.g., "glass-fruit-cutting"): ');

    console.log('\nNiches: asmr_pottery, oddly_satisfying, nature_sounds, craft_process, cute_fruits_asmr, custom');
    const niche = (await question('Niche [cute_fruits_asmr]: ')) || 'cute_fruits_asmr';

    let nicheDescription: string | undefined;
    if (niche === 'custom') {
      nicheDescription = await question('Custom Niche Description: ');
    }

    const weightStr = (await question('Weight (higher = more likely) [1]: ')) || '1';
    const weight = parseInt(weightStr, 10);

    const segmentCountStr = (await question('Segment Count (1/2/3) [1]: ')) || '1';
    const segmentCount = parseInt(segmentCountStr, 10) as 1 | 2 | 3;

    const segmentDurationStr = (await question('Segment Duration (5/7/10) [10]: ')) || '10';
    const segmentDuration = parseInt(segmentDurationStr, 10) as 5 | 7 | 10;

    console.log('\nHook Styles: visual, text_overlay, question');
    const hookStyle = (await question('Hook Style [visual]: ')) || 'visual';

    console.log('\nAudio Types: asmr_native, trending_audio, silent');
    const audioType = (await question('Audio Type [asmr_native]: ')) || 'asmr_native';

    console.log('\nHashtag Strategies: niche_specific, trending, mixed');
    const hashtagStrategy = (await question('Hashtag Strategy [niche_specific]: ')) || 'niche_specific';

    const newContentType: ContentType = {
      name,
      weight,
      niche: niche as NicheType,
      nicheDescription,
      segmentCount,
      segmentDuration,
      hookStyle: hookStyle as 'visual' | 'text_overlay' | 'question',
      audioType: audioType as 'asmr_native' | 'trending_audio' | 'silent',
      hashtagStrategy: hashtagStrategy as 'niche_specific' | 'trending' | 'mixed',
    };

    // Get existing content types or create new array
    const contentTypes = account.contentTypes || [];
    contentTypes.push(newContentType);

    // Update account
    await db.accounts.updateAccount(account.id, {
      contentTypes,
      contentTypeSelectionMode: account.contentTypeSelectionMode || 'random',
    });

    console.log(`\n✅ Content type "${name}" added to ${account.name}`);
    console.log(`   Total content types: ${contentTypes.length}`);
  } finally {
    rl.close();
  }
}

async function removeContentType(slug: string, name: string) {
  const account = await db.accounts.getAccountBySlug(slug);

  if (!account) {
    console.error(`Account not found: ${slug}`);
    process.exit(1);
  }

  if (!account.contentTypes || account.contentTypes.length === 0) {
    console.error(`No content types defined for account: ${slug}`);
    process.exit(1);
  }

  const index = account.contentTypes.findIndex((ct) => ct.name === name);

  if (index === -1) {
    console.error(`Content type not found: ${name}`);
    console.log('Available content types:');
    account.contentTypes.forEach((ct) => console.log(`  - ${ct.name}`));
    process.exit(1);
  }

  const contentTypes = [...account.contentTypes];
  contentTypes.splice(index, 1);

  await db.accounts.updateAccount(account.id, { contentTypes });

  console.log(`✅ Content type "${name}" removed from ${account.name}`);
  console.log(`   Remaining content types: ${contentTypes.length}`);
}

async function setSelectionMode(slug: string, mode: ContentTypeSelectionMode) {
  const validModes = ['random', 'rotation', 'weighted'];

  if (!validModes.includes(mode)) {
    console.error(`Invalid mode: ${mode}`);
    console.log('Valid modes: random, rotation, weighted');
    process.exit(1);
  }

  const account = await db.accounts.getAccountBySlug(slug);

  if (!account) {
    console.error(`Account not found: ${slug}`);
    process.exit(1);
  }

  await db.accounts.updateAccount(account.id, {
    contentTypeSelectionMode: mode,
  });

  console.log(`✅ Selection mode set to "${mode}" for ${account.name}`);
}

function printUsage() {
  console.log(`
Content Type Management Tool

Usage:
  npx tsx src/cli/manage-content-types.ts <command> [options]

Commands:
  list, ls <slug>                    List content types for account
  add <slug>                         Add content type interactively
  remove, rm <slug> <name>           Remove content type by name
  set-mode <slug> <mode>             Set selection mode (random/rotation/weighted)
  help, -h                           Show this help message

Selection Modes:
  random      Pick content type randomly (default)
  rotation    Cycle through content types in order
  weighted    Pick based on weight values (higher = more likely)

Examples:
  npx tsx src/cli/manage-content-types.ts list cute-fruits
  npx tsx src/cli/manage-content-types.ts add cute-fruits
  npx tsx src/cli/manage-content-types.ts remove cute-fruits glass-cutting
  npx tsx src/cli/manage-content-types.ts set-mode cute-fruits weighted
`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
