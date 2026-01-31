/**
 * Video Metrics Collection Script
 *
 * Collects per-video performance metrics from Instagram API and stores them
 * in the educational_performance table.
 *
 * Usage:
 *   npx tsx scripts/collect-video-metrics.ts              # Collect all due videos
 *   npx tsx scripts/collect-video-metrics.ts --analyze    # Also run analysis
 *   npx tsx scripts/collect-video-metrics.ts --dry-run    # Show what would be collected
 *
 * Recommended cron schedule (every 6 hours):
 *   0 0,6,12,18 * * * cd /path/to/project && npx tsx scripts/collect-video-metrics.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import {
  createVideoMetricsCollector,
  HookStyleAnalysis,
  CategoryPerformance,
} from '../src/services/video-metrics-collector';

dotenv.config();

// ============================================================================
// CLI Arguments
// ============================================================================

const args = process.argv.slice(2);
const showAnalysis = args.includes('--analyze') || args.includes('-a');
const dryRun = args.includes('--dry-run') || args.includes('-n');
const verbose = args.includes('--verbose') || args.includes('-v');

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatPercent(value: number, decimals: number = 2): string {
  return (value * 100).toFixed(decimals) + '%';
}

function formatScore(value: number): string {
  return value.toFixed(4);
}

function padRight(str: string, len: number): string {
  return str.padEnd(len);
}

function padLeft(str: string, len: number): string {
  return str.padStart(len);
}

function printHeader(title: string): void {
  console.log('\n' + '='.repeat(70));
  console.log(title);
  console.log('='.repeat(70));
}

function printSubHeader(title: string): void {
  console.log('\n' + '-'.repeat(70));
  console.log(title);
  console.log('-'.repeat(70));
}

// ============================================================================
// Dry Run Mode
// ============================================================================

async function runDryRun(pool: Pool): Promise<void> {
  console.log('\n[DRY RUN MODE] - No data will be modified\n');

  const client = await pool.connect();

  try {
    // Show what videos would be collected
    const result = await client.query(`
      SELECT
        ec.id,
        ec.topic,
        ec.instagram_post_id,
        ec.posted_at,
        ec.topic_category,
        (ec.final_script::json->>'hookStyle') as hook_style,
        ep.last_updated_at as last_collected,
        CASE
          WHEN ec.posted_at > NOW() - INTERVAL '48 hours' THEN '0-48h (every 6h)'
          WHEN ec.posted_at > NOW() - INTERVAL '7 days' THEN '2-7d (daily)'
          WHEN ec.posted_at > NOW() - INTERVAL '14 days' THEN '7-14d (every 2d)'
          ELSE '14-30d (weekly)'
        END as collection_window
      FROM educational_content ec
      LEFT JOIN educational_performance ep ON ec.id = ep.content_id
      WHERE
        ec.status = 'posted'
        AND ec.instagram_post_id IS NOT NULL
        AND ec.posted_at IS NOT NULL
        AND ec.posted_at > NOW() - INTERVAL '30 days'
      ORDER BY ec.posted_at DESC
      LIMIT 20
    `);

    printHeader('VIDEOS ELIGIBLE FOR COLLECTION');

    if (result.rows.length === 0) {
      console.log('\nNo posted videos found in the last 30 days.\n');
      return;
    }

    console.log(
      `\n${padRight('ID (short)', 12)} ${padRight('Category', 20)} ${padRight('Hook Style', 15)} ${padRight('Window', 18)} ${padRight('Last Collected', 20)}`
    );
    console.log('-'.repeat(85));

    for (const row of result.rows) {
      const shortId = row.id.substring(0, 8) + '...';
      const category = row.topic_category || 'N/A';
      const hookStyle = row.hook_style || 'N/A';
      const lastCollected = row.last_collected
        ? new Date(row.last_collected).toISOString().substring(0, 16)
        : 'Never';

      console.log(
        `${padRight(shortId, 12)} ${padRight(category, 20)} ${padRight(hookStyle, 15)} ${padRight(row.collection_window, 18)} ${padRight(lastCollected, 20)}`
      );
    }

    // Show current performance data
    const perfResult = await client.query(`
      SELECT
        topic_category,
        COUNT(*) as videos,
        AVG(save_rate) as avg_save_rate,
        AVG(completion_rate) as avg_completion
      FROM educational_performance
      WHERE first_recorded_at > NOW() - INTERVAL '30 days'
      GROUP BY topic_category
      ORDER BY avg_save_rate DESC NULLS LAST
    `);

    if (perfResult.rows.length > 0) {
      printSubHeader('CURRENT PERFORMANCE DATA');

      console.log(
        `\n${padRight('Category', 25)} ${padLeft('Videos', 8)} ${padLeft('Save Rate', 12)} ${padLeft('Completion', 12)}`
      );
      console.log('-'.repeat(60));

      for (const row of perfResult.rows) {
        const category = row.topic_category || 'Unknown';
        const saveRate = row.avg_save_rate
          ? formatPercent(parseFloat(row.avg_save_rate))
          : 'N/A';
        const completion = row.avg_completion
          ? parseFloat(row.avg_completion).toFixed(1) + '%'
          : 'N/A';

        console.log(
          `${padRight(category, 25)} ${padLeft(row.videos.toString(), 8)} ${padLeft(saveRate, 12)} ${padLeft(completion, 12)}`
        );
      }
    }

    console.log('\n[DRY RUN] Run without --dry-run to collect metrics.\n');

  } finally {
    client.release();
  }
}

// ============================================================================
// Analysis Output
// ============================================================================

function printHookStyleAnalysis(analysis: HookStyleAnalysis[]): void {
  printSubHeader('HOOK STYLE PERFORMANCE');

  if (analysis.length === 0) {
    console.log('\nNo hook style data available yet.\n');
    return;
  }

  console.log(
    `\n${padRight('Hook Style', 18)} ${padLeft('Save Rate', 12)} ${padLeft('Completion', 12)} ${padLeft('Share Rate', 12)} ${padLeft('Samples', 10)} ${padLeft('Score', 10)}`
  );
  console.log('-'.repeat(76));

  for (const item of analysis) {
    console.log(
      `${padRight(item.hookStyle, 18)} ${padLeft(formatPercent(item.avgSaveRate), 12)} ${padLeft(item.avgCompletionRate.toFixed(1) + '%', 12)} ${padLeft(formatPercent(item.avgShareRate), 12)} ${padLeft(item.sampleSize.toString(), 10)} ${padLeft(formatScore(item.performanceScore), 10)}`
    );
  }

  // Highlight best performer
  if (analysis.length > 0) {
    const best = analysis[0];
    console.log(`\n  Best performer: "${best.hookStyle}" with ${formatPercent(best.avgSaveRate)} save rate`);
  }
}

function printCategoryPerformance(categories: CategoryPerformance[]): void {
  printSubHeader('CATEGORY PERFORMANCE');

  if (categories.length === 0) {
    console.log('\nNo category data available yet.\n');
    return;
  }

  console.log(
    `\n${padRight('Category', 25)} ${padLeft('Posts', 8)} ${padLeft('Save Rate', 12)} ${padLeft('Share Rate', 12)} ${padLeft('Score', 10)}`
  );
  console.log('-'.repeat(70));

  for (const item of categories) {
    console.log(
      `${padRight(item.categoryId, 25)} ${padLeft(item.postCount.toString(), 8)} ${padLeft(formatPercent(item.avgSaveRate), 12)} ${padLeft(formatPercent(item.avgShareRate), 12)} ${padLeft(formatScore(item.performanceScore), 10)}`
    );
  }
}

function printCorrelations(correlations: Record<string, any>): void {
  printSubHeader('CONTENT ATTRIBUTE CORRELATIONS');

  // Number in hook
  if (correlations.numberInHook && correlations.numberInHook.length > 0) {
    console.log('\nNumber in Hook:');
    for (const item of correlations.numberInHook) {
      const label = item.hasNumber ? 'With number' : 'Without number';
      console.log(
        `  ${padRight(label, 18)} ${item.count} videos, ${formatPercent(item.avgSaveRate)} save rate, ${item.avgCompletionRate.toFixed(1)}% completion`
      );
    }

    // Calculate lift
    const withNumber = correlations.numberInHook.find((x: any) => x.hasNumber);
    const withoutNumber = correlations.numberInHook.find((x: any) => !x.hasNumber);
    if (withNumber && withoutNumber && withoutNumber.avgSaveRate > 0) {
      const lift = ((withNumber.avgSaveRate - withoutNumber.avgSaveRate) / withoutNumber.avgSaveRate) * 100;
      console.log(`  → Numbers in hook: ${lift > 0 ? '+' : ''}${lift.toFixed(1)}% lift in save rate`);
    }
  }

  // Energy level
  if (correlations.energyLevel && correlations.energyLevel.length > 0) {
    console.log('\nEnergy Level:');
    for (const item of correlations.energyLevel) {
      console.log(
        `  ${padRight(item.level, 10)} ${item.count} videos, ${formatPercent(item.avgSaveRate)} save rate`
      );
    }
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  if (dryRun) {
    await runDryRun(pool);
    await pool.end();
    return;
  }

  const collector = createVideoMetricsCollector(pool);

  try {
    printHeader('VIDEO METRICS COLLECTION');
    console.log(`Started at: ${new Date().toISOString()}`);

    // Run collection
    const summary = await collector.collectAll();

    // Print summary
    printSubHeader('COLLECTION SUMMARY');

    console.log(`
  Total Processed:    ${summary.totalProcessed}
  Successful:         ${summary.successful}
  Failed:             ${summary.failed}
  Skipped:            ${summary.skipped}
  Duration:           ${(summary.durationMs / 1000).toFixed(2)}s
`);

    if (summary.newHighPerformers.length > 0) {
      console.log(`  High Performers Detected: ${summary.newHighPerformers.length}`);
      for (const id of summary.newHighPerformers) {
        console.log(`    - ${id}`);
      }
      console.log('');
    }

    // Run analysis if requested or if we collected data
    if (showAnalysis || summary.successful > 0) {
      console.log('\nRunning performance analysis...');

      // Hook style analysis
      const hookAnalysis = await collector.analyzeHookStylePerformance();
      printHookStyleAnalysis(hookAnalysis);

      // Category performance
      const categoryPerf = await collector.getCategoryPerformance();
      printCategoryPerformance(categoryPerf);

      // Content attribute correlations
      const correlations = await collector.analyzeContentAttributeCorrelations();
      printCorrelations(correlations);
    }

    printHeader('COLLECTION COMPLETE');
    console.log(`Finished at: ${new Date().toISOString()}\n`);

    // Exit with error code if all failed
    if (summary.totalProcessed > 0 && summary.successful === 0) {
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\nCollection failed:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);

  } finally {
    await pool.end();
  }
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
