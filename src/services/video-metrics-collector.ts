/**
 * Video Metrics Collector Service
 *
 * Collects per-video performance metrics from Instagram API and stores them
 * in the educational_performance table for analysis and feedback loops.
 *
 * Collection Windows:
 * - 0-48h:   Every 6 hours (metrics stabilizing)
 * - 2-7d:    Daily (peak engagement period)
 * - 7-14d:   Every 2 days
 * - 14-30d:  Weekly (final snapshot)
 *
 * Enables:
 * - Hook style performance analysis
 * - Topic category weight optimization
 * - Content attribute correlation
 */

import { Pool, PoolClient } from 'pg';
import axios from 'axios';
import { logger } from '../core/logger';
import { EducationalRepository, EducationalContentRecord } from '../core/educational-repository';
import { AccountRepository } from '../core/account-repository';
import { MultiAccountTokenManager } from '../utils/multi-account-token-manager';
import { Account } from '../core/types';

// ============================================================================
// Types
// ============================================================================

export interface InstagramReelInsights {
  // Engagement
  plays: number;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  totalInteractions: number;

  // Retention (Reels-specific)
  avgWatchTimeMs: number;
  totalWatchTimeMs: number;
  replays: number;

  // Discovery
  impressions: number;

  // Calculated rates
  completionRate: number;      // avgWatchTime / videoDuration * 100
  saveRate: number;            // saves / reach
  shareRate: number;           // shares / reach
  engagementRate: number;      // totalInteractions / reach
  replayRate: number;          // replays / plays
}

export interface CollectionResult {
  contentId: string;
  instagramPostId: string;
  success: boolean;
  metrics?: InstagramReelInsights;
  error?: string;
}

export interface CollectionSummary {
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  newHighPerformers: string[];
  collectedAt: Date;
  durationMs: number;
}

export interface HookStyleAnalysis {
  hookStyle: string;
  avgSaveRate: number;
  avgCompletionRate: number;
  avgShareRate: number;
  avgEngagementRate: number;
  sampleSize: number;
  performanceScore: number;
}

export interface CategoryPerformance {
  categoryId: string;
  postCount: number;
  avgSaveRate: number;
  avgShareRate: number;
  avgCompletionRate: number;
  performanceScore: number;
}

// ============================================================================
// Video Metrics Collector
// ============================================================================

export class VideoMetricsCollector {
  private pool: Pool;
  private repository: EducationalRepository;
  private accountRepo: AccountRepository;
  private tokenManager: MultiAccountTokenManager;

  // Thresholds for high performer detection
  private readonly HIGH_SAVE_RATE = 0.05;        // 5%
  private readonly HIGH_COMPLETION_RATE = 80;     // 80%
  private readonly HIGH_SHARE_RATE = 0.02;        // 2%

  // Rate limiting
  private readonly API_DELAY_MS = 200;            // Delay between API calls

  constructor(pool: Pool) {
    this.pool = pool;
    this.repository = new EducationalRepository(pool);
    this.accountRepo = new AccountRepository(pool);
    this.tokenManager = new MultiAccountTokenManager(this.accountRepo);
  }

  // --------------------------------------------------------------------------
  // Main Collection Flow
  // --------------------------------------------------------------------------

  /**
   * Collect metrics for all posted videos based on collection windows
   */
  async collectAll(): Promise<CollectionSummary> {
    const startTime = Date.now();

    logger.info('Starting video metrics collection');

    const summary: CollectionSummary = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      newHighPerformers: [],
      collectedAt: new Date(),
      durationMs: 0,
    };

    try {
      // Get all posted content that needs metrics collection
      const videosToCollect = await this.getVideosForCollection();

      logger.info(`Found ${videosToCollect.length} videos for collection`);

      for (const video of videosToCollect) {
        summary.totalProcessed++;

        try {
          const result = await this.collectVideoMetrics(video);

          if (result.success && result.metrics) {
            summary.successful++;

            // Check if this is a high performer
            if (this.isHighPerformer(result.metrics)) {
              summary.newHighPerformers.push(video.id);
              logger.info('High performer detected', {
                contentId: video.id,
                saveRate: (result.metrics.saveRate * 100).toFixed(2) + '%',
                completionRate: result.metrics.completionRate.toFixed(1) + '%',
              });
            }
          } else {
            summary.failed++;
            logger.debug('Failed to collect metrics', {
              contentId: video.id,
              error: result.error,
            });
          }
        } catch (error: any) {
          logger.error('Exception collecting metrics for video', {
            contentId: video.id,
            error: error.message,
          });
          summary.failed++;
        }

        // Rate limiting: Instagram allows ~200 calls/hour
        await this.sleep(this.API_DELAY_MS);
      }

      // After collection, update category performance scores
      if (summary.successful > 0) {
        await this.updateCategoryPerformance();
      }

      summary.durationMs = Date.now() - startTime;

      logger.info('Video metrics collection complete', {
        totalProcessed: summary.totalProcessed,
        successful: summary.successful,
        failed: summary.failed,
        highPerformers: summary.newHighPerformers.length,
        durationSeconds: (summary.durationMs / 1000).toFixed(2),
      });

      return summary;

    } catch (error: any) {
      logger.error('Video metrics collection failed', { error: error.message });
      summary.durationMs = Date.now() - startTime;
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Video Selection
  // --------------------------------------------------------------------------

  /**
   * Get videos that need metrics collection based on age and last update
   */
  private async getVideosForCollection(): Promise<EducationalContentRecord[]> {
    const client = await this.pool.connect();

    try {
      // Collection windows:
      // - 0-48h: every 6 hours → if last_updated > 6 hours ago
      // - 2-7d: daily → if last_updated > 24 hours ago
      // - 7-14d: every 2 days → if last_updated > 48 hours ago
      // - 14-30d: weekly → if last_updated > 7 days ago

      const result = await client.query(`
        SELECT ec.*
        FROM educational_content ec
        LEFT JOIN educational_performance ep ON ec.id = ep.content_id
        WHERE
          ec.status = 'posted'
          AND ec.instagram_post_id IS NOT NULL
          AND ec.posted_at IS NOT NULL
          AND ec.posted_at > NOW() - INTERVAL '30 days'
          AND (
            -- Never collected
            ep.content_id IS NULL
            OR
            -- 0-48h window: collect if last update > 6 hours ago
            (
              ec.posted_at > NOW() - INTERVAL '48 hours'
              AND ep.last_updated_at < NOW() - INTERVAL '6 hours'
            )
            OR
            -- 2-7d window: collect if last update > 24 hours ago
            (
              ec.posted_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '48 hours'
              AND ep.last_updated_at < NOW() - INTERVAL '24 hours'
            )
            OR
            -- 7-14d window: collect if last update > 48 hours ago
            (
              ec.posted_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
              AND ep.last_updated_at < NOW() - INTERVAL '48 hours'
            )
            OR
            -- 14-30d window: collect if last update > 7 days ago
            (
              ec.posted_at BETWEEN NOW() - INTERVAL '30 days' AND NOW() - INTERVAL '14 days'
              AND ep.last_updated_at < NOW() - INTERVAL '7 days'
            )
          )
        ORDER BY ec.posted_at DESC
      `);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // --------------------------------------------------------------------------
  // Instagram API Calls
  // --------------------------------------------------------------------------

  /**
   * Collect metrics for a single video from Instagram API
   */
  private async collectVideoMetrics(video: EducationalContentRecord): Promise<CollectionResult> {
    const mediaId = video.instagram_post_id;

    if (!mediaId) {
      return {
        contentId: video.id,
        instagramPostId: '',
        success: false,
        error: 'No Instagram post ID',
      };
    }

    logger.debug('Collecting metrics for video', {
      contentId: video.id,
      mediaId,
      postedAt: video.posted_at,
    });

    try {
      // Get account for this content
      const account = await this.getAccountForContent(video);

      if (!account) {
        return {
          contentId: video.id,
          instagramPostId: mediaId,
          success: false,
          error: 'Could not find account for content',
        };
      }

      const accessToken = await this.tokenManager.getValidToken(account);

      // Fetch insights from Instagram API
      const insights = await this.fetchReelInsights(
        mediaId,
        accessToken,
        video.duration || 30
      );

      // Store in database
      await this.storeMetrics(video, insights);

      return {
        contentId: video.id,
        instagramPostId: mediaId,
        success: true,
        metrics: insights,
      };

    } catch (error: any) {
      // Check for specific Instagram API errors
      const errorMessage = this.parseInstagramError(error);

      logger.warn('Failed to collect metrics for video', {
        contentId: video.id,
        mediaId,
        error: errorMessage,
      });

      return {
        contentId: video.id,
        instagramPostId: mediaId,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Fetch Reel insights from Instagram Graph API
   */
  private async fetchReelInsights(
    mediaId: string,
    accessToken: string,
    videoDurationSeconds: number
  ): Promise<InstagramReelInsights> {

    // Fetch engagement metrics
    // Note: Not all metrics are available for all media types
    const insightsResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${mediaId}/insights`,
      {
        params: {
          metric: [
            'plays',
            'reach',
            'saved',
            'shares',
            'comments',
            'likes',
            'total_interactions',
            'ig_reels_avg_watch_time',
            'ig_reels_video_view_total_time',
            'clips_replays_count',
            'impressions',
          ].join(','),
          access_token: accessToken,
        },
      }
    );

    // Parse response into structured object
    const metricsMap: Record<string, number> = {};

    for (const insight of insightsResponse.data.data || []) {
      const value = insight.values?.[0]?.value || 0;
      metricsMap[insight.name] = value;
    }

    // Also fetch basic media fields for likes/comments (sometimes more accurate)
    let likes = metricsMap['likes'] || 0;
    let comments = metricsMap['comments'] || 0;

    try {
      const mediaResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${mediaId}`,
        {
          params: {
            fields: 'like_count,comments_count',
            access_token: accessToken,
          },
        }
      );
      likes = mediaResponse.data.like_count || likes;
      comments = mediaResponse.data.comments_count || comments;
    } catch {
      // Use insights data if media fields fail
    }

    const plays = metricsMap['plays'] || 0;
    const reach = Math.max(metricsMap['reach'] || 1, 1); // Avoid division by zero
    const saves = metricsMap['saved'] || 0;
    const shares = metricsMap['shares'] || 0;
    const totalInteractions = metricsMap['total_interactions'] || (likes + comments + saves + shares);
    const avgWatchTimeMs = metricsMap['ig_reels_avg_watch_time'] || 0;
    const totalWatchTimeMs = metricsMap['ig_reels_video_view_total_time'] || 0;
    const replays = metricsMap['clips_replays_count'] || 0;
    const impressions = metricsMap['impressions'] || 0;

    // Calculate derived metrics
    const videoDurationMs = videoDurationSeconds * 1000;
    const completionRate = videoDurationMs > 0
      ? Math.min(100, (avgWatchTimeMs / videoDurationMs) * 100)
      : 0;

    return {
      // Raw metrics
      plays,
      reach,
      likes,
      comments,
      saves,
      shares,
      totalInteractions,
      avgWatchTimeMs,
      totalWatchTimeMs,
      replays,
      impressions,

      // Calculated rates
      completionRate,
      saveRate: saves / reach,
      shareRate: shares / reach,
      engagementRate: totalInteractions / reach,
      replayRate: plays > 0 ? replays / plays : 0,
    };
  }

  // --------------------------------------------------------------------------
  // Storage
  // --------------------------------------------------------------------------

  /**
   * Store metrics in educational_performance table
   */
  private async storeMetrics(
    video: EducationalContentRecord,
    insights: InstagramReelInsights
  ): Promise<void> {

    // Extract content attributes for correlation analysis
    const script = video.final_script as any;
    const hookStyle = script?.hookStyle || null;
    const hasNumberInHook = this.detectNumberInHook(script);
    const energyLevel = this.calculateAverageEnergy(script?.segments || []);

    await this.repository.createOrUpdatePerformance(video.id, {
      // Raw metrics
      views: insights.plays,
      likes: insights.likes,
      saves: insights.saves,
      shares: insights.shares,
      reach: insights.reach,
      profile_visits: 0, // Would need separate API call

      // Retention metrics
      average_watch_time: insights.avgWatchTimeMs / 1000, // Convert to seconds
      completion_rate: insights.completionRate,
      replay_rate: insights.replayRate,

      // Derived rates
      save_rate: insights.saveRate,
      share_rate: insights.shareRate,
      engagement_rate: insights.engagementRate,

      // Content attributes (for correlation)
      hook_style: hookStyle,
      topic_category: video.topic_category,
      has_number_in_hook: hasNumberInHook,
      energy_level: energyLevel,
      visual_style: 'minimalist_3d', // From visual identity config
    });

    logger.info('Stored video metrics', {
      contentId: video.id,
      plays: insights.plays,
      reach: insights.reach,
      saveRate: (insights.saveRate * 100).toFixed(2) + '%',
      completionRate: insights.completionRate.toFixed(1) + '%',
      engagementRate: (insights.engagementRate * 100).toFixed(2) + '%',
    });
  }

  // --------------------------------------------------------------------------
  // Category Performance Updates
  // --------------------------------------------------------------------------

  /**
   * Recalculate performance scores for all topic categories
   */
  private async updateCategoryPerformance(): Promise<void> {
    logger.info('Updating category performance scores');

    const client = await this.pool.connect();

    try {
      // Get aggregated performance by category
      const result = await client.query(`
        SELECT
          topic_category,
          COUNT(*) as post_count,
          AVG(save_rate) as avg_save_rate,
          AVG(share_rate) as avg_share_rate,
          AVG(completion_rate) as avg_completion_rate,
          AVG(engagement_rate) as avg_engagement_rate,
          -- Weighted performance score (save_rate matters most for educational content)
          AVG(
            COALESCE(save_rate, 0) * 0.4 +
            COALESCE(share_rate, 0) * 0.2 +
            COALESCE(completion_rate, 0) * 0.003 +
            COALESCE(engagement_rate, 0) * 0.1
          ) as performance_score
        FROM educational_performance
        WHERE
          topic_category IS NOT NULL
          AND first_recorded_at > NOW() - INTERVAL '30 days'
        GROUP BY topic_category
        HAVING COUNT(*) >= 3  -- Minimum sample size
      `);

      for (const row of result.rows) {
        await this.repository.updateCategoryPerformance(row.topic_category, {
          avg_save_rate: parseFloat(row.avg_save_rate) || 0,
          avg_share_rate: parseFloat(row.avg_share_rate) || 0,
          avg_completion_rate: parseFloat(row.avg_completion_rate) || 0,
          performance_score: parseFloat(row.performance_score) || 0,
        });

        logger.debug('Updated category performance', {
          category: row.topic_category,
          postCount: row.post_count,
          avgSaveRate: (parseFloat(row.avg_save_rate) * 100).toFixed(2) + '%',
          performanceScore: parseFloat(row.performance_score).toFixed(4),
        });
      }

      // Update category weights based on performance
      await this.recalculateCategoryWeights();

    } finally {
      client.release();
    }
  }

  /**
   * Adjust category weights based on performance
   * Higher performing categories get more weight
   */
  private async recalculateCategoryWeights(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Get all categories with performance data
      const result = await client.query(`
        SELECT id, performance_score, post_count
        FROM topic_categories
        WHERE performance_score IS NOT NULL
        AND post_count >= 3
      `);

      if (result.rows.length === 0) {
        logger.debug('Not enough data to recalculate category weights');
        return;
      }

      // Normalize performance scores to weights (sum to 1.0)
      const totalScore = result.rows.reduce(
        (sum, r) => sum + (parseFloat(r.performance_score) || 0),
        0
      );

      if (totalScore === 0) return;

      for (const row of result.rows) {
        // New weight is proportional to performance, with dampening
        // (don't let one category dominate completely)
        const baseWeight = 1 / result.rows.length; // Equal distribution
        const performanceWeight = parseFloat(row.performance_score) / totalScore;

        // Blend: 60% performance-based, 40% equal
        const newWeight = (performanceWeight * 0.6) + (baseWeight * 0.4);

        await this.repository.updateCategoryWeight(row.id, newWeight);
      }

      logger.info('Recalculated category weights based on performance');

    } finally {
      client.release();
    }
  }

  // --------------------------------------------------------------------------
  // Hook Style Analysis
  // --------------------------------------------------------------------------

  /**
   * Analyze hook style performance across all collected data
   */
  async analyzeHookStylePerformance(): Promise<HookStyleAnalysis[]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(`
        SELECT
          hook_style,
          COUNT(*) as sample_size,
          AVG(save_rate) as avg_save_rate,
          AVG(completion_rate) as avg_completion_rate,
          AVG(share_rate) as avg_share_rate,
          AVG(engagement_rate) as avg_engagement_rate,
          AVG(
            COALESCE(save_rate, 0) * 0.5 +
            COALESCE(completion_rate, 0) * 0.003 +
            COALESCE(share_rate, 0) * 0.3
          ) as performance_score
        FROM educational_performance
        WHERE
          hook_style IS NOT NULL
          AND first_recorded_at > NOW() - INTERVAL '30 days'
        GROUP BY hook_style
        ORDER BY performance_score DESC
      `);

      const analysis: HookStyleAnalysis[] = result.rows.map(row => ({
        hookStyle: row.hook_style,
        avgSaveRate: parseFloat(row.avg_save_rate) || 0,
        avgCompletionRate: parseFloat(row.avg_completion_rate) || 0,
        avgShareRate: parseFloat(row.avg_share_rate) || 0,
        avgEngagementRate: parseFloat(row.avg_engagement_rate) || 0,
        sampleSize: parseInt(row.sample_size),
        performanceScore: parseFloat(row.performance_score) || 0,
      }));

      logger.info('Hook style performance analysis complete', {
        stylesAnalyzed: analysis.length,
        bestPerformer: analysis[0]?.hookStyle || 'N/A',
      });

      return analysis;

    } finally {
      client.release();
    }
  }

  /**
   * Get category performance summary
   */
  async getCategoryPerformance(): Promise<CategoryPerformance[]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(`
        SELECT
          topic_category as category_id,
          COUNT(*) as post_count,
          AVG(save_rate) as avg_save_rate,
          AVG(share_rate) as avg_share_rate,
          AVG(completion_rate) as avg_completion_rate,
          AVG(
            COALESCE(save_rate, 0) * 0.4 +
            COALESCE(share_rate, 0) * 0.2 +
            COALESCE(completion_rate, 0) * 0.003
          ) as performance_score
        FROM educational_performance
        WHERE
          topic_category IS NOT NULL
          AND first_recorded_at > NOW() - INTERVAL '30 days'
        GROUP BY topic_category
        ORDER BY performance_score DESC
      `);

      return result.rows.map(row => ({
        categoryId: row.category_id,
        postCount: parseInt(row.post_count),
        avgSaveRate: parseFloat(row.avg_save_rate) || 0,
        avgShareRate: parseFloat(row.avg_share_rate) || 0,
        avgCompletionRate: parseFloat(row.avg_completion_rate) || 0,
        performanceScore: parseFloat(row.performance_score) || 0,
      }));

    } finally {
      client.release();
    }
  }

  /**
   * Analyze which content attributes correlate with high performance
   */
  async analyzeContentAttributeCorrelations(): Promise<Record<string, any>> {
    const client = await this.pool.connect();

    try {
      // Analyze number in hook impact
      const numberInHookResult = await client.query(`
        SELECT
          has_number_in_hook,
          COUNT(*) as count,
          AVG(save_rate) as avg_save_rate,
          AVG(completion_rate) as avg_completion_rate
        FROM educational_performance
        WHERE first_recorded_at > NOW() - INTERVAL '30 days'
        GROUP BY has_number_in_hook
      `);

      // Analyze energy level impact
      const energyLevelResult = await client.query(`
        SELECT
          energy_level,
          COUNT(*) as count,
          AVG(save_rate) as avg_save_rate,
          AVG(share_rate) as avg_share_rate
        FROM educational_performance
        WHERE
          energy_level IS NOT NULL
          AND first_recorded_at > NOW() - INTERVAL '30 days'
        GROUP BY energy_level
        ORDER BY avg_save_rate DESC
      `);

      return {
        numberInHook: numberInHookResult.rows.map(row => ({
          hasNumber: row.has_number_in_hook,
          count: parseInt(row.count),
          avgSaveRate: parseFloat(row.avg_save_rate) || 0,
          avgCompletionRate: parseFloat(row.avg_completion_rate) || 0,
        })),
        energyLevel: energyLevelResult.rows.map(row => ({
          level: row.energy_level,
          count: parseInt(row.count),
          avgSaveRate: parseFloat(row.avg_save_rate) || 0,
          avgShareRate: parseFloat(row.avg_share_rate) || 0,
        })),
      };

    } finally {
      client.release();
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /**
   * Get the account that posted this content
   */
  private async getAccountForContent(video: EducationalContentRecord): Promise<Account | null> {
    const client = await this.pool.connect();
    try {
      // Try to find account via content table relationship
      const result = await client.query(
        `SELECT a.* FROM accounts a
         WHERE a.is_active = true
         AND a.platform = 'instagram'
         LIMIT 1`
      );

      if (result.rows.length > 0) {
        return result.rows[0] as Account;
      }

      // Fallback: get any active Instagram account
      const accounts = await this.accountRepo.getActiveAccounts();
      return accounts.find(a => a.platform === 'instagram') || null;

    } finally {
      client.release();
    }
  }

  /**
   * Detect if hook contains a number
   */
  private detectNumberInHook(script: any): boolean {
    if (!script) return false;

    const hook = script.hook || '';
    const firstSegmentText = script.segments?.[0]?.textOverlay || '';

    // Check for digits in hook or first segment overlay
    return /\d/.test(hook) || /\d/.test(firstSegmentText);
  }

  /**
   * Calculate average energy level from segments
   */
  private calculateAverageEnergy(segments: any[]): string {
    if (!segments || segments.length === 0) return 'medium';

    const energyMap: Record<string, number> = {
      'low': 1,
      'building': 2,
      'peak': 3,
      'sustaining': 2.5,
      'resolving': 1.5,
    };

    const avgEnergy = segments.reduce((sum, seg) => {
      return sum + (energyMap[seg.energy] || 2);
    }, 0) / segments.length;

    if (avgEnergy >= 2.5) return 'high';
    if (avgEnergy >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Check if metrics indicate high performance
   */
  private isHighPerformer(metrics: InstagramReelInsights): boolean {
    return (
      metrics.saveRate > this.HIGH_SAVE_RATE ||
      metrics.completionRate > this.HIGH_COMPLETION_RATE ||
      metrics.shareRate > this.HIGH_SHARE_RATE
    );
  }

  /**
   * Parse Instagram API error for logging
   */
  private parseInstagramError(error: any): string {
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    return error.message || 'Unknown error';
  }

  /**
   * Sleep for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createVideoMetricsCollector(pool: Pool): VideoMetricsCollector {
  return new VideoMetricsCollector(pool);
}
