#!/usr/bin/env node
/**
 * CLI Tool for Running Multi-Account Pipelines
 *
 * Usage:
 *   npx tsx src/cli/run-account.ts --account <slug>     Run pipeline for specific account
 *   npx tsx src/cli/run-account.ts --all                Run pipeline for all active accounts
 *   npx tsx src/cli/run-account.ts --due                Run pipeline for accounts due for posting
 *   npx tsx src/cli/run-account.ts --status             Show status of all accounts
 */

import { MultiAccountOrchestrator } from '../core/multi-account-orchestrator';
import { logger } from '../core/logger';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const orchestrator = new MultiAccountOrchestrator();

  try {
    const command = args[0];

    switch (command) {
      case '--account':
      case '-a': {
        const slug = args[1];
        if (!slug) {
          console.error('Error: Account slug required');
          console.error('Usage: npx tsx src/cli/run-account.ts --account <slug>');
          process.exit(1);
        }
        await runForAccount(orchestrator, slug);
        break;
      }

      case '--id': {
        const accountId = args[1];
        if (!accountId) {
          console.error('Error: Account ID required');
          console.error('Usage: npx tsx src/cli/run-account.ts --id <account-id>');
          process.exit(1);
        }
        await runForAccountById(orchestrator, accountId);
        break;
      }

      case '--all': {
        await runForAllAccounts(orchestrator);
        break;
      }

      case '--due': {
        await runDueAccounts(orchestrator);
        break;
      }

      case '--status':
      case '-s': {
        await showStatus(orchestrator);
        break;
      }

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
    await orchestrator.close();
  }
}

async function runForAccount(orchestrator: MultiAccountOrchestrator, slug: string) {
  console.log(`\nRunning pipeline for account: ${slug}`);
  console.log('='.repeat(50));

  const startTime = Date.now();
  const result = await orchestrator.runForAccountBySlug(slug);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\nResult:');
  console.log(`  Account: ${result.accountName}`);
  console.log(`  Success: ${result.success ? 'Yes' : 'No'}`);
  if (result.contentId) {
    console.log(`  Content ID: ${result.contentId}`);
  }
  if (result.cost) {
    console.log(`  Cost: $${result.cost.toFixed(4)}`);
  }
  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }
  console.log(`  Duration: ${duration}s`);
}

async function runForAccountById(orchestrator: MultiAccountOrchestrator, accountId: string) {
  console.log(`\nRunning pipeline for account ID: ${accountId}`);
  console.log('='.repeat(50));

  const startTime = Date.now();
  const result = await orchestrator.runForAccount(accountId);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\nResult:');
  console.log(`  Account: ${result.accountName}`);
  console.log(`  Success: ${result.success ? 'Yes' : 'No'}`);
  if (result.contentId) {
    console.log(`  Content ID: ${result.contentId}`);
  }
  if (result.cost) {
    console.log(`  Cost: $${result.cost.toFixed(4)}`);
  }
  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }
  console.log(`  Duration: ${duration}s`);
}

async function runForAllAccounts(orchestrator: MultiAccountOrchestrator) {
  console.log('\nRunning pipeline for all active accounts');
  console.log('='.repeat(50));

  const startTime = Date.now();
  const results = await orchestrator.runForAllAccounts();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);

  console.log('\nResults Summary:');
  console.log(`  Total Accounts: ${results.length}`);
  console.log(`  Successful: ${successful}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total Cost: $${totalCost.toFixed(4)}`);
  console.log(`  Total Duration: ${duration}s`);

  console.log('\nPer-Account Results:');
  for (const result of results) {
    const status = result.success ? 'SUCCESS' : 'FAILED';
    console.log(`  [${status}] ${result.accountName}: ${result.error || result.contentId || 'completed'}`);
  }
}

async function runDueAccounts(orchestrator: MultiAccountOrchestrator) {
  console.log('\nRunning pipeline for accounts due for posting');
  console.log('='.repeat(50));

  const startTime = Date.now();
  const results = await orchestrator.runDueAccounts();

  if (results.length === 0) {
    console.log('\nNo accounts due for posting at this time.');
    return;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);

  console.log('\nResults Summary:');
  console.log(`  Accounts Processed: ${results.length}`);
  console.log(`  Successful: ${successful}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total Cost: $${totalCost.toFixed(4)}`);
  console.log(`  Total Duration: ${duration}s`);

  console.log('\nPer-Account Results:');
  for (const result of results) {
    const status = result.success ? 'SUCCESS' : 'FAILED';
    console.log(`  [${status}] ${result.accountName}: ${result.error || result.contentId || 'completed'}`);
  }
}

async function showStatus(orchestrator: MultiAccountOrchestrator) {
  console.log('\nAccount Status');
  console.log('='.repeat(80));

  const statuses = await orchestrator.getAccountsStatus();

  if (statuses.length === 0) {
    console.log('No accounts found. Create accounts using manage-accounts.ts');
    return;
  }

  // Header
  console.log(
    `${'Name'.padEnd(20)} ${'Slug'.padEnd(15)} ${'Active'.padEnd(8)} ${'Niche'.padEnd(18)} ${'Posts/Day'.padEnd(10)} ${'Today'.padEnd(8)} ${'Failures'.padEnd(10)}`
  );
  console.log('-'.repeat(80));

  // Rows
  for (const status of statuses) {
    const active = status.isActive ? 'Yes' : 'No';
    const niche = status.niche.substring(0, 16);
    console.log(
      `${status.name.padEnd(20)} ${status.slug.padEnd(15)} ${active.padEnd(8)} ${niche.padEnd(18)} ${String(status.postsPerDay).padEnd(10)} ${String(status.todayPostCount).padEnd(8)} ${String(status.consecutiveFailures).padEnd(10)}`
    );
  }

  console.log('-'.repeat(80));
  console.log(`Total: ${statuses.length} accounts, ${statuses.filter((s) => s.isActive).length} active`);
}

function printUsage() {
  console.log(`
Multi-Account Pipeline Runner

Usage:
  npx tsx src/cli/run-account.ts <command> [options]

Commands:
  --account, -a <slug>   Run pipeline for a specific account by slug
  --id <account-id>      Run pipeline for a specific account by ID
  --all                  Run pipeline for all active accounts
  --due                  Run pipeline for accounts due based on posting schedule
  --status, -s           Show status of all accounts
  --help, -h             Show this help message

Examples:
  npx tsx src/cli/run-account.ts --account asmr-pottery-1
  npx tsx src/cli/run-account.ts --all
  npx tsx src/cli/run-account.ts --due
  npx tsx src/cli/run-account.ts --status

Note: Ensure the database is set up and accounts are created before running.
`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
