/**
 * Analytics Service
 *
 * Collects and analyzes metrics across multiple accounts for A/B testing.
 * Provides insights on which content strategies perform best.
 */

import { Database } from '../core/database';
import { logger } from '../core/logger';
import { Account, AccountMetrics, ContentStrategy } from '../core/types';
import { InstagramMultiAccountPlatform } from '../layers/06-distribution/platforms/instagram-multi';

export interface AccountPerformance {
  accountId: string;
  accountName: string;
  slug: string;
  niche: string;
  strategy: ContentStrategy;
  metrics: {
    totalPosts: number;
    todayPosts: number;
    followers: number;
    followersGained7d: number;
    followersGained30d: number;
    avgEngagementRate: number;
    totalReach: number;
    totalImpressions: number;
    consecutiveFailures: number;
  };
  performance: {
    postsPerFollowerGained: number;
    growthRate7d: number;
    growthRate30d: number;
    estimatedDaysTo10k: number | null;
  };
}

export interface StrategyComparison {
  strategyType: string;
  strategyValue: string;
  accounts: string[];
  avgFollowersGained7d: number;
  avgEngagementRate: number;
  avgGrowthRate7d: number;
  bestPerformer: string;
  worstPerformer: string;
}

export interface AnalyticsReport {
  generatedAt: Date;
  accountCount: number;
  totalFollowers: number;
  totalPosts: number;
  accountPerformance: AccountPerformance[];
  strategyComparisons: StrategyComparison[];
  recommendations: string[];
}

export class AnalyticsService {
  private db: Database;

  constructor() {
    this.db = new Database();
  }

  /**
   * Collect metrics from Instagram API for all active accounts
   */
  async collectMetrics(): Promise<void> {
    const accounts = await this.db.accounts.getActiveAccounts();

    logger.info('Collecting metrics for accounts', { count: accounts.length });

    for (const account of accounts) {
      try {
        if (account.platform !== 'instagram') {
          continue;
        }

        // Skip accounts without credentials
        if (!account.businessAccountId || !account.accessToken) {
          logger.debug('Skipping account without credentials', {
            accountId: account.id,
            accountName: account.name,
          });
          continue;
        }

        const instagram = new InstagramMultiAccountPlatform(this.db.accounts);

        // Get account insights
        const insights = await instagram.getAccountInsights(account);

        // Get recent media insights
        const mediaInsights = await instagram.getMediaInsights(account, 10);

        // Calculate engagement rate
        const engagementRate =
          insights.followers > 0
            ? (mediaInsights.totalEngagement / insights.mediaCount / insights.followers) * 100
            : 0;

        // Get previous followers count to calculate gain
        const previousMetrics = await this.db.accounts.getMetricsHistory(account.id, 1);
        const followersGained =
          previousMetrics.length > 0 ? insights.followers - previousMetrics[0].followers : 0;

        // Record metrics
        await this.db.accounts.recordMetrics(account.id, {
          followers: insights.followers,
          followersGained,
          engagementRate,
          postsPublished: 0, // This is per-day posts, not total
          totalReach: mediaInsights.totalReach,
          totalImpressions: mediaInsights.totalImpressions,
          totalEngagement: mediaInsights.totalEngagement,
        });

        logger.info('Collected metrics for account', {
          accountId: account.id,
          accountName: account.name,
          followers: insights.followers,
          followersGained,
          engagementRate: engagementRate.toFixed(2),
        });
      } catch (error: any) {
        logger.error('Failed to collect metrics for account', {
          accountId: account.id,
          accountName: account.name,
          error: error.message,
        });
      }
    }
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateReport(): Promise<AnalyticsReport> {
    const accounts = await this.db.accounts.getAllAccounts();
    const accountPerformance: AccountPerformance[] = [];

    for (const account of accounts) {
      const metrics7d = await this.db.accounts.getMetricsHistory(account.id, 7);
      const metrics30d = await this.db.accounts.getMetricsHistory(account.id, 30);

      const todayPostCount = await this.db.accounts.getTodayPostCount(account.id);
      const totalPosts = await this.getTotalPostCount(account.id);

      // Calculate followers gained
      const followersGained7d = this.calculateFollowersGained(metrics7d);
      const followersGained30d = this.calculateFollowersGained(metrics30d);

      // Current followers
      const currentFollowers = metrics7d[0]?.followers || 0;

      // Average engagement rate
      const avgEngagement = this.calculateAverageEngagement(metrics7d);

      // Growth rates
      const growthRate7d = this.calculateGrowthRate(metrics7d);
      const growthRate30d = this.calculateGrowthRate(metrics30d);

      // Estimate days to 10k followers
      const daysTo10k = this.estimateDaysToTarget(currentFollowers, growthRate7d, 10000);

      // Total reach/impressions from recent metrics
      const totalReach = metrics7d.reduce((sum, m) => sum + (m.totalReach || 0), 0);
      const totalImpressions = metrics7d.reduce((sum, m) => sum + (m.totalImpressions || 0), 0);

      // Posts per follower gained (efficiency metric)
      const postsPerFollowerGained =
        followersGained7d > 0 ? totalPosts / followersGained7d : 0;

      accountPerformance.push({
        accountId: account.id,
        accountName: account.name,
        slug: account.slug,
        niche: account.contentStrategy?.niche || 'unknown',
        strategy: account.contentStrategy!,
        metrics: {
          totalPosts,
          todayPosts: todayPostCount,
          followers: currentFollowers,
          followersGained7d,
          followersGained30d,
          avgEngagementRate: avgEngagement,
          totalReach,
          totalImpressions,
          consecutiveFailures: account.consecutiveFailures,
        },
        performance: {
          postsPerFollowerGained,
          growthRate7d,
          growthRate30d,
          estimatedDaysTo10k: daysTo10k,
        },
      });
    }

    // Generate strategy comparisons
    const strategyComparisons = this.compareStrategies(accountPerformance);

    // Generate recommendations
    const recommendations = this.generateRecommendations(accountPerformance, strategyComparisons);

    const report: AnalyticsReport = {
      generatedAt: new Date(),
      accountCount: accounts.length,
      totalFollowers: accountPerformance.reduce((sum, a) => sum + a.metrics.followers, 0),
      totalPosts: accountPerformance.reduce((sum, a) => sum + a.metrics.totalPosts, 0),
      accountPerformance,
      strategyComparisons,
      recommendations,
    };

    return report;
  }

  /**
   * Compare performance across different strategy variations
   */
  private compareStrategies(accounts: AccountPerformance[]): StrategyComparison[] {
    const comparisons: StrategyComparison[] = [];

    // Compare by niche
    const nicheGroups = this.groupBy(accounts, (a) => a.niche);
    comparisons.push(...this.createComparisons('niche', nicheGroups));

    // Compare by video length
    const lengthGroups = this.groupBy(accounts, (a) => String(a.strategy?.videoLength || 'unknown'));
    comparisons.push(...this.createComparisons('videoLength', lengthGroups));

    // Compare by hook style
    const hookGroups = this.groupBy(accounts, (a) => a.strategy?.hookStyle || 'unknown');
    comparisons.push(...this.createComparisons('hookStyle', hookGroups));

    // Compare by posting frequency
    const freqGroups = this.groupBy(accounts, (a) => {
      const postsPerDay = a.strategy?.videoLength; // Use actual posting schedule
      const schedule = accounts.find((acc) => acc.accountId === a.accountId);
      return schedule ? 'varied' : 'standard';
    });

    return comparisons;
  }

  /**
   * Group accounts by a key function
   */
  private groupBy(
    accounts: AccountPerformance[],
    keyFn: (a: AccountPerformance) => string
  ): Map<string, AccountPerformance[]> {
    const groups = new Map<string, AccountPerformance[]>();
    for (const account of accounts) {
      const key = keyFn(account);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(account);
    }
    return groups;
  }

  /**
   * Create comparison entries for a strategy type
   */
  private createComparisons(
    strategyType: string,
    groups: Map<string, AccountPerformance[]>
  ): StrategyComparison[] {
    const comparisons: StrategyComparison[] = [];

    for (const [value, accounts] of groups) {
      if (accounts.length === 0) continue;

      const avgFollowersGained7d =
        accounts.reduce((sum, a) => sum + a.metrics.followersGained7d, 0) / accounts.length;
      const avgEngagementRate =
        accounts.reduce((sum, a) => sum + a.metrics.avgEngagementRate, 0) / accounts.length;
      const avgGrowthRate7d =
        accounts.reduce((sum, a) => sum + a.performance.growthRate7d, 0) / accounts.length;

      // Find best and worst performers
      const sorted = [...accounts].sort(
        (a, b) => b.metrics.followersGained7d - a.metrics.followersGained7d
      );
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];

      comparisons.push({
        strategyType,
        strategyValue: value,
        accounts: accounts.map((a) => a.slug),
        avgFollowersGained7d,
        avgEngagementRate,
        avgGrowthRate7d,
        bestPerformer: best?.slug || 'N/A',
        worstPerformer: worst?.slug || 'N/A',
      });
    }

    return comparisons;
  }

  /**
   * Generate actionable recommendations based on data
   */
  private generateRecommendations(
    accounts: AccountPerformance[],
    comparisons: StrategyComparison[]
  ): string[] {
    const recommendations: string[] = [];

    // Find best performing niche
    const nicheComparisons = comparisons.filter((c) => c.strategyType === 'niche');
    if (nicheComparisons.length > 1) {
      const bestNiche = nicheComparisons.reduce((best, curr) =>
        curr.avgFollowersGained7d > best.avgFollowersGained7d ? curr : best
      );
      recommendations.push(
        `Best performing niche: "${bestNiche.strategyValue}" with avg ${bestNiche.avgFollowersGained7d.toFixed(0)} followers gained/week`
      );
    }

    // Find accounts with high failure rates
    const failingAccounts = accounts.filter((a) => a.metrics.consecutiveFailures >= 3);
    if (failingAccounts.length > 0) {
      recommendations.push(
        `${failingAccounts.length} account(s) have 3+ consecutive failures: ${failingAccounts.map((a) => a.slug).join(', ')}. Check credentials.`
      );
    }

    // Find accounts with low engagement
    const lowEngagement = accounts.filter(
      (a) => a.metrics.avgEngagementRate < 1 && a.metrics.followers > 100
    );
    if (lowEngagement.length > 0) {
      recommendations.push(
        `${lowEngagement.length} account(s) have engagement below 1%: ${lowEngagement.map((a) => a.slug).join(', ')}. Consider content adjustments.`
      );
    }

    // Find best video length
    const lengthComparisons = comparisons.filter((c) => c.strategyType === 'videoLength');
    if (lengthComparisons.length > 1) {
      const bestLength = lengthComparisons.reduce((best, curr) =>
        curr.avgGrowthRate7d > best.avgGrowthRate7d ? curr : best
      );
      recommendations.push(
        `Best performing video length: ${bestLength.strategyValue}s with ${(bestLength.avgGrowthRate7d * 100).toFixed(1)}% avg weekly growth`
      );
    }

    // Monetization timeline
    const closest10k = accounts
      .filter((a) => a.performance.estimatedDaysTo10k !== null && a.performance.estimatedDaysTo10k > 0)
      .sort((a, b) => (a.performance.estimatedDaysTo10k || Infinity) - (b.performance.estimatedDaysTo10k || Infinity));

    if (closest10k.length > 0) {
      const closest = closest10k[0];
      recommendations.push(
        `Closest to 10k monetization: "${closest.slug}" - estimated ${closest.performance.estimatedDaysTo10k} days (${closest.metrics.followers} current followers)`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue collecting data for more accurate recommendations.');
    }

    return recommendations;
  }

  /**
   * Calculate followers gained from metrics history
   */
  private calculateFollowersGained(metrics: AccountMetrics[]): number {
    if (metrics.length < 2) return 0;
    const newest = metrics[0];
    const oldest = metrics[metrics.length - 1];
    return (newest.followers || 0) - (oldest.followers || 0);
  }

  /**
   * Calculate average engagement from metrics history
   */
  private calculateAverageEngagement(metrics: AccountMetrics[]): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + (m.engagementRate || 0), 0);
    return sum / metrics.length;
  }

  /**
   * Calculate growth rate (daily percentage) from metrics
   */
  private calculateGrowthRate(metrics: AccountMetrics[]): number {
    if (metrics.length < 2) return 0;
    const newest = metrics[0];
    const oldest = metrics[metrics.length - 1];
    const daysDiff = metrics.length;

    if (!oldest.followers || oldest.followers === 0) return 0;

    const totalGrowth = (newest.followers! - oldest.followers!) / oldest.followers!;
    return totalGrowth / daysDiff; // Daily growth rate
  }

  /**
   * Estimate days to reach target followers
   */
  private estimateDaysToTarget(
    currentFollowers: number,
    dailyGrowthRate: number,
    target: number
  ): number | null {
    if (currentFollowers >= target) return 0;
    if (dailyGrowthRate <= 0) return null;

    // Using compound growth formula: days = ln(target/current) / ln(1 + rate)
    const days = Math.log(target / currentFollowers) / Math.log(1 + dailyGrowthRate);
    return Math.ceil(days);
  }

  /**
   * Get total post count for an account
   */
  private async getTotalPostCount(accountId: string): Promise<number> {
    const client = await this.db.getClient();
    try {
      const result = await client.query(
        `SELECT COUNT(*) as count FROM content WHERE account_id = $1 AND status = 'posted'`,
        [accountId]
      );
      return parseInt(result.rows[0]?.count || '0', 10);
    } finally {
      client.release();
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.db.close();
  }
}

/**
 * Print a formatted analytics report to console
 */
export function printReport(report: AnalyticsReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('MULTI-ACCOUNT ANALYTICS REPORT');
  console.log('='.repeat(80));
  console.log(`Generated: ${report.generatedAt.toISOString()}`);
  console.log(`Total Accounts: ${report.accountCount}`);
  console.log(`Total Followers: ${report.totalFollowers.toLocaleString()}`);
  console.log(`Total Posts: ${report.totalPosts}`);

  console.log('\n' + '-'.repeat(80));
  console.log('ACCOUNT PERFORMANCE');
  console.log('-'.repeat(80));

  // Header
  console.log(
    `${'Account'.padEnd(20)} ${'Followers'.padStart(10)} ${'7d Gain'.padStart(10)} ${'Eng%'.padStart(8)} ${'Days to 10k'.padStart(12)}`
  );
  console.log('-'.repeat(60));

  for (const account of report.accountPerformance) {
    const days = account.performance.estimatedDaysTo10k;
    const daysStr = days === null ? 'N/A' : days === 0 ? 'Reached!' : String(days);

    console.log(
      `${account.slug.padEnd(20)} ${String(account.metrics.followers).padStart(10)} ${String(account.metrics.followersGained7d).padStart(10)} ${account.metrics.avgEngagementRate.toFixed(1).padStart(8)} ${daysStr.padStart(12)}`
    );
  }

  console.log('\n' + '-'.repeat(80));
  console.log('STRATEGY COMPARISONS');
  console.log('-'.repeat(80));

  for (const comparison of report.strategyComparisons) {
    console.log(`\n${comparison.strategyType}: ${comparison.strategyValue}`);
    console.log(`  Accounts: ${comparison.accounts.join(', ')}`);
    console.log(`  Avg Followers Gained (7d): ${comparison.avgFollowersGained7d.toFixed(1)}`);
    console.log(`  Avg Engagement Rate: ${comparison.avgEngagementRate.toFixed(2)}%`);
    console.log(`  Best Performer: ${comparison.bestPerformer}`);
  }

  console.log('\n' + '-'.repeat(80));
  console.log('RECOMMENDATIONS');
  console.log('-'.repeat(80));

  for (const rec of report.recommendations) {
    console.log(`  - ${rec}`);
  }

  console.log('\n' + '='.repeat(80));
}
