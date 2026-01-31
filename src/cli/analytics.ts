#!/usr/bin/env node
/**
 * Analytics CLI Tool
 *
 * Usage:
 *   npx tsx src/cli/analytics.ts report           Generate full analytics report
 *   npx tsx src/cli/analytics.ts collect          Collect metrics from all accounts
 *   npx tsx src/cli/analytics.ts account <slug>   Show metrics for specific account
 *   npx tsx src/cli/analytics.ts compare          Compare strategy performance
 */

import { AnalyticsService, printReport } from '../services/analytics';
import { Database } from '../core/database';
import { logger } from '../core/logger';

const db = new Database();

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const analytics = new AnalyticsService();

  try {
    const command = args[0];

    switch (command) {
      case 'report':
      case 'r': {
        await generateReport(analytics);
        break;
      }

      case 'collect':
      case 'c': {
        await collectMetrics(analytics);
        break;
      }

      case 'account':
      case 'a': {
        const slug = args[1];
        if (!slug) {
          console.error('Error: Account slug required');
          process.exit(1);
        }
        await showAccountMetrics(slug);
        break;
      }

      case 'compare': {
        await compareStrategies(analytics);
        break;
      }

      case 'history': {
        const slug = args[1];
        const days = parseInt(args[2] || '30', 10);
        if (!slug) {
          console.error('Error: Account slug required');
          process.exit(1);
        }
        await showMetricsHistory(slug, days);
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
    logger.error('Analytics CLI error', { error: error.message });
    console.error(`Error: ${error.message}`);
    process.exit(1);
  } finally {
    await analytics.close();
    await db.close();
  }
}

async function generateReport(analytics: AnalyticsService) {
  console.log('Generating analytics report...\n');

  const report = await analytics.generateReport();
  printReport(report);
}

async function collectMetrics(analytics: AnalyticsService) {
  console.log('Collecting metrics from all active accounts...\n');

  await analytics.collectMetrics();

  console.log('\nMetrics collection complete.');
  console.log('Run "npx tsx src/cli/analytics.ts report" to see the updated report.');
}

async function showAccountMetrics(slug: string) {
  const account = await db.accounts.getAccountBySlug(slug);

  if (!account) {
    console.error(`Account not found: ${slug}`);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`METRICS: ${account.name} (@${account.slug})`);
  console.log('='.repeat(60));

  // Get metrics history
  const metrics7d = await db.accounts.getMetricsHistory(account.id, 7);
  const metrics30d = await db.accounts.getMetricsHistory(account.id, 30);

  // Current stats
  const current = metrics7d[0];
  if (!current) {
    console.log('\nNo metrics data available yet.');
    console.log('Run "npx tsx src/cli/analytics.ts collect" to collect metrics.');
    return;
  }

  console.log('\nCurrent Stats:');
  console.log(`  Followers: ${current.followers?.toLocaleString() || 0}`);
  console.log(`  Engagement Rate: ${(current.engagementRate || 0).toFixed(2)}%`);
  console.log(`  Posts Published: ${current.postsPublished || 0}`);

  // 7-day performance
  if (metrics7d.length >= 2) {
    const oldest7d = metrics7d[metrics7d.length - 1];
    const gained7d = (current.followers || 0) - (oldest7d.followers || 0);
    const growthRate7d =
      oldest7d.followers && oldest7d.followers > 0
        ? ((gained7d / oldest7d.followers) * 100).toFixed(2)
        : 'N/A';

    console.log('\n7-Day Performance:');
    console.log(`  Followers Gained: ${gained7d}`);
    console.log(`  Growth Rate: ${growthRate7d}%`);
    console.log(`  Avg Daily Gain: ${(gained7d / metrics7d.length).toFixed(1)}`);
  }

  // 30-day performance
  if (metrics30d.length >= 7) {
    const oldest30d = metrics30d[metrics30d.length - 1];
    const gained30d = (current.followers || 0) - (oldest30d.followers || 0);
    const growthRate30d =
      oldest30d.followers && oldest30d.followers > 0
        ? ((gained30d / oldest30d.followers) * 100).toFixed(2)
        : 'N/A';

    console.log('\n30-Day Performance:');
    console.log(`  Followers Gained: ${gained30d}`);
    console.log(`  Growth Rate: ${growthRate30d}%`);
    console.log(`  Avg Daily Gain: ${(gained30d / metrics30d.length).toFixed(1)}`);
  }

  // Estimate days to 10k
  if (metrics7d.length >= 2 && current.followers && current.followers < 10000) {
    const oldest7d = metrics7d[metrics7d.length - 1];
    const dailyGain = ((current.followers || 0) - (oldest7d.followers || 0)) / metrics7d.length;
    if (dailyGain > 0) {
      const daysTo10k = Math.ceil((10000 - current.followers) / dailyGain);
      console.log(`\nEstimated Days to 10k: ${daysTo10k} days`);
    }
  }

  // Content strategy
  console.log('\nContent Strategy:');
  if (account.contentStrategy) {
    console.log(`  Niche: ${account.contentStrategy.niche}`);
    console.log(`  Video Length: ${account.contentStrategy.videoLength}s`);
    console.log(`  Hook Style: ${account.contentStrategy.hookStyle}`);
    console.log(`  Audio Type: ${account.contentStrategy.audioType}`);
  }

  console.log('\n' + '='.repeat(60));
}

async function showMetricsHistory(slug: string, days: number) {
  const account = await db.accounts.getAccountBySlug(slug);

  if (!account) {
    console.error(`Account not found: ${slug}`);
    process.exit(1);
  }

  const metrics = await db.accounts.getMetricsHistory(account.id, days);

  if (metrics.length === 0) {
    console.log('No metrics history available.');
    return;
  }

  console.log(`\nMetrics History: ${account.name} (Last ${days} days)`);
  console.log('='.repeat(70));
  console.log(
    `${'Date'.padEnd(12)} ${'Followers'.padStart(10)} ${'Gained'.padStart(10)} ${'Eng%'.padStart(8)} ${'Reach'.padStart(10)}`
  );
  console.log('-'.repeat(70));

  for (const m of metrics) {
    const date = new Date(m.recordedAt).toISOString().split('T')[0];
    console.log(
      `${date.padEnd(12)} ${String(m.followers || 0).padStart(10)} ${String(m.followersGained || 0).padStart(10)} ${(m.engagementRate || 0).toFixed(2).padStart(8)} ${String(m.totalReach || 0).padStart(10)}`
    );
  }

  console.log('-'.repeat(70));
}

async function compareStrategies(analytics: AnalyticsService) {
  console.log('Comparing strategy performance...\n');

  const report = await analytics.generateReport();

  console.log('='.repeat(80));
  console.log('STRATEGY COMPARISON SUMMARY');
  console.log('='.repeat(80));

  // Group by strategy type
  const byType = new Map<string, typeof report.strategyComparisons>();
  for (const comparison of report.strategyComparisons) {
    if (!byType.has(comparison.strategyType)) {
      byType.set(comparison.strategyType, []);
    }
    byType.get(comparison.strategyType)!.push(comparison);
  }

  for (const [type, comparisons] of byType) {
    console.log(`\n${type.toUpperCase()}`);
    console.log('-'.repeat(60));

    // Sort by followers gained
    const sorted = [...comparisons].sort(
      (a, b) => b.avgFollowersGained7d - a.avgFollowersGained7d
    );

    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      const rank = i + 1;
      console.log(
        `  ${rank}. ${c.strategyValue.padEnd(20)} | 7d Gain: ${c.avgFollowersGained7d.toFixed(1).padStart(6)} | Eng: ${c.avgEngagementRate.toFixed(2).padStart(5)}%`
      );
    }

    if (sorted.length > 1) {
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      const diff = best.avgFollowersGained7d - worst.avgFollowersGained7d;
      console.log(`\n  Winner: "${best.strategyValue}" (+${diff.toFixed(1)} followers vs worst)`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(80));

  for (const rec of report.recommendations) {
    console.log(`  - ${rec}`);
  }
}

function printUsage() {
  console.log(`
Multi-Account Analytics Tool

Usage:
  npx tsx src/cli/analytics.ts <command> [options]

Commands:
  report, r              Generate full analytics report
  collect, c             Collect metrics from all active accounts (Instagram API)
  account, a <slug>      Show detailed metrics for specific account
  history <slug> [days]  Show metrics history (default: 30 days)
  compare                Compare strategy performance across accounts
  help, -h               Show this help message

Examples:
  npx tsx src/cli/analytics.ts report
  npx tsx src/cli/analytics.ts collect
  npx tsx src/cli/analytics.ts account asmr-pottery-test
  npx tsx src/cli/analytics.ts history asmr-pottery-test 14
  npx tsx src/cli/analytics.ts compare

Notes:
  - Run 'collect' daily to gather fresh metrics from Instagram
  - Reports are based on historical data; collect metrics regularly
  - Strategy comparisons require multiple accounts with different strategies
`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
