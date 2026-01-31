/**
 * Distribution Layer (Multi-Account Version)
 *
 * Handles content distribution to social media platforms
 * using account-specific credentials from the database.
 */

import { DistributionOutput, IdeaOutput, CompositionOutput, Account } from '../../core/types';
import { Database } from '../../core/database';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { validate } from '../../utils/validation';
import { DistributionOutputSchema } from './schema';
import { InstagramMultiAccountPlatform } from './platforms/instagram-multi';
import { selectContentType } from '../../utils/content-type-selector';

export class MultiAccountDistributionLayer {
  private database: Database;
  private storage = createStorage();

  constructor(database: Database) {
    this.database = database;
  }

  /**
   * Multiple hashtag sets per niche to avoid repetition
   * Instagram flags accounts that use identical hashtags repeatedly
   * Each set has 4-5 highly relevant hashtags (Instagram 2025 best practice)
   */
  private hashtagSetsByNiche: Record<string, string[][]> = {
    cute_fruits_asmr: [
      ['#kawaii', '#asmr', '#satisfying', '#oddlysatisfying', '#cute'],
      ['#cutefruit', '#asmrsounds', '#relaxing', '#pastel', '#aesthetic'],
      ['#glassfruit', '#satisfyingvideos', '#cuttingasmr', '#dreamy', '#softaesthetic'],
      ['#crystalasmr', '#fruitasmr', '#soothing', '#viral', '#asmrvideos'],
      ['#kawaiiart', '#sliceasmr', '#calming', '#prettythings', '#asmrcommunity'],
      ['#asmrslicing', '#pastelaesthetic', '#cutethings', '#satisfyingasmr', '#reels'],
      ['#jellyasmr', '#fruitslice', '#softie', '#aestheticvideos', '#asmrreels'],
    ],
    asmr_pottery: [
      ['#asmr', '#pottery', '#oddlysatisfying', '#ceramics', '#satisfying'],
      ['#potteryasmr', '#relaxing', '#artisan', '#handmade', '#crafts'],
      ['#ceramicart', '#asmrsounds', '#calming', '#culturalart', '#soothing'],
      ['#potteryreveal', '#satisfyingvideos', '#artasmr', '#traditional', '#mindful'],
      ['#clayart', '#asmrcommunity', '#therapeutic', '#craftsman', '#zenvibes'],
      ['#potterywheel', '#relaxingsounds', '#ancientcraft', '#artisticprocess', '#viral'],
      ['#glazing', '#asmrrelaxing', '#handcrafted', '#worldculture', '#reels'],
    ],
  };

  /**
   * Expanded CTAs by niche - more variety to avoid repetition
   * Avoiding engagement bait per Instagram 2025 guidelines
   */
  private ctasByNiche: Record<string, string[]> = {
    cute_fruits_asmr: [
      // Questions (genuine engagement)
      `Which fruit should I slice next? 🍑`,
      `What's your favorite fruit? 🍓`,
      `Glass or crystal - which do you prefer? ✨`,
      `What color fruit should I try? 🌈`,
      `Pick a fruit for tomorrow! 🍒`,
      // Save prompts
      `Save this for when you need a smile 💾`,
      `Bookmark for your relaxation playlist 📌`,
      `Save for later vibes ✨`,
      // Share prompts
      `Send this to someone who loves cute things 🩷`,
      `Share with a friend who needs this today`,
      `Someone you know would love this 💕`,
      // Follow prompts
      `Follow for daily satisfying videos ✨`,
      `More kawaii content every day 🌸`,
      `New satisfying video tomorrow! 🎀`,
    ],
    asmr_pottery: [
      // Questions (genuine engagement)
      `What should I reveal next?`,
      `What culture should I explore next?`,
      `Which color did you like most?`,
      `Guess the culture before watching! 🎨`,
      `What traditional craft interests you?`,
      // Save prompts
      `Save this for when you need to relax 💾`,
      `Bookmark for peaceful moments 📌`,
      `Save for your wind-down routine ✨`,
      // Share prompts
      `Send to someone who needs calm today`,
      `Share with a friend who loves art`,
      `Someone you know would appreciate this`,
      // Follow prompts
      `Follow for daily relaxing content ✨`,
      `More calming reveals coming soon`,
      `New pottery reveal tomorrow 🏺`,
    ],
  };

  /**
   * Default hashtag sets for unknown niches
   */
  private defaultHashtagSets: string[][] = [
    ['#asmr', '#satisfying', '#relaxing', '#viral', '#reels'],
    ['#oddlysatisfying', '#calming', '#soothing', '#trending', '#content'],
    ['#satisfyingvideos', '#peaceful', '#aesthetic', '#fyp', '#explore'],
  ];

  /**
   * Default CTAs for unknown niches
   */
  private defaultCtas: string[] = [
    `Save this for later 💾`,
    `Follow for more ✨`,
    `Send to a friend who'd love this`,
    `What do you think? Let me know!`,
    `Bookmark for later 📌`,
    `More content coming soon!`,
  ];

  /**
   * Get a unique seed for rotation based on content/account/date
   * This ensures different content on the same day gets different hashtags
   */
  private getRotationSeed(accountId: string, contentId?: string): number {
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);

    // Create a hash from account ID and optional content ID
    let hash = 0;
    const seedString = contentId ? `${accountId}-${contentId}` : accountId;
    for (let i = 0; i < seedString.length; i++) {
      hash = ((hash << 5) - hash) + seedString.charCodeAt(i);
      hash |= 0;
    }

    // Combine day and hash for unique daily rotation per content
    return Math.abs(dayOfYear + hash);
  }

  /**
   * Build caption with CTA and hashtags from account's content type
   */
  private buildCaption(account: Account, baseCaption: string, contentId?: string): string {
    // Get content type to find custom hashtags
    const selected = selectContentType(account);
    const contentType = selected?.contentType;
    const niche = contentType?.niche || '';

    // Get rotating hashtags for this niche
    const hashtags = this.getRotatingHashtags(niche, account.id, contentId);

    // Build CTA based on account with rotation
    const cta = this.getCTA(account, contentId);

    // Combine: base caption + CTA + hashtags
    const parts = [baseCaption];

    if (cta) {
      parts.push(cta);
    }

    if (hashtags.length > 0) {
      parts.push(hashtags.join(' '));
    }

    const fullCaption = parts.join('\n\n');

    logger.debug('Built caption with CTA and hashtags', {
      accountId: account.id,
      contentId,
      hasCta: !!cta,
      hashtagCount: hashtags.length,
      captionLength: fullCaption.length,
    });

    return fullCaption;
  }

  /**
   * Get rotating hashtags for a niche
   * Uses different hashtag set each time to avoid repetition
   */
  private getRotatingHashtags(niche: string, accountId: string, contentId?: string): string[] {
    const hashtagSets = this.hashtagSetsByNiche[niche] || this.defaultHashtagSets;
    const seed = this.getRotationSeed(accountId, contentId);
    const index = seed % hashtagSets.length;

    logger.debug('Selected hashtag set', {
      niche,
      setIndex: index,
      totalSets: hashtagSets.length,
    });

    return hashtagSets[index];
  }

  /**
   * Get a CTA for the account (rotates through options)
   */
  private getCTA(account: Account, contentId?: string): string {
    // Get content type to determine niche
    const selected = selectContentType(account);
    const niche = selected?.contentType?.niche || '';

    const ctas = this.ctasByNiche[niche] || this.defaultCtas;

    // Use rotation seed for variety
    const seed = this.getRotationSeed(account.id, contentId);
    const index = seed % ctas.length;

    return ctas[index];
  }

  /**
   * Execute distribution for a specific account
   */
  async execute(
    account: Account,
    idea: IdeaOutput,
    composition: CompositionOutput
  ): Promise<DistributionOutput> {
    logger.info('Starting Layer 6: Distribution (Multi-Account)', {
      contentId: idea.id,
      accountId: account.id,
      accountName: account.name,
      platform: account.platform,
    });

    const startTime = Date.now();

    try {
      const videoUrl = composition.finalVideo.r2Url;

      // Build caption with rotating hashtags and CTA
      const caption = this.buildCaption(account, idea.caption, idea.id);

      const posts = [];

      // Check if distribution is enabled
      if (process.env.ENABLE_DISTRIBUTION !== 'true') {
        logger.warn('Distribution disabled via ENABLE_DISTRIBUTION flag');
        return {
          contentId: idea.id,
          posts: [],
        };
      }

      // Post to the appropriate platform based on account type
      if (account.platform === 'instagram') {
        logger.info('Posting to Instagram', {
          accountId: account.id,
          accountName: account.name,
          videoUrl,
        });

        const instagram = new InstagramMultiAccountPlatform(this.database.accounts);
        const instagramPost = await instagram.post(account, videoUrl, caption);
        posts.push(instagramPost);
      }

      // TODO: Add TikTok and YouTube multi-account support
      // if (account.platform === 'tiktok') { ... }
      // if (account.platform === 'youtube') { ... }

      const output: DistributionOutput = {
        contentId: idea.id,
        posts,
      };

      // Validate output
      validate(DistributionOutputSchema, output);

      // Update content status
      const successfulPosts = posts.filter(p => p.status === 'posted');
      if (successfulPosts.length > 0) {
        await this.database.updateContent(idea.id, {
          status: 'posted',
          posted_at: new Date(),
        });
      } else {
        await this.database.updateContent(idea.id, {
          status: 'failed',
        });
      }

      // Save platform posts to database with account reference
      for (const post of posts) {
        const client = await this.database.getClient();
        try {
          await client.query(
            `INSERT INTO platform_posts (content_id, account_id, platform, post_id, post_url, status, error_message)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              idea.id,
              account.id,
              post.platform,
              post.postId || '',
              post.postUrl || '',
              post.status,
              post.error || null,
            ]
          );
        } finally {
          client.release();
        }
      }

      // Save distribution metadata
      await this.storage.saveJSON(`${idea.id}/distribution.json`, {
        ...output,
        accountId: account.id,
        accountName: account.name,
      });

      // Log processing
      await this.database.logProcessing({
        content_id: idea.id,
        layer: 'distribution',
        status: 'completed',
        completed_at: new Date(),
        metadata: {
          ...output,
          accountId: account.id,
          accountName: account.name,
        },
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Layer 6 completed', {
        contentId: idea.id,
        accountId: account.id,
        accountName: account.name,
        duration,
        platforms: posts.length,
        successful: successfulPosts.length,
      });

      return output;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Layer 6 failed', {
        error,
        duration,
        contentId: idea.id,
        accountId: account.id,
        accountName: account.name,
      });

      await this.database.logProcessing({
        content_id: idea.id,
        layer: 'distribution',
        status: 'failed',
        completed_at: new Date(),
        error_message: (error as Error).message,
      });

      // Record failure on the account
      await this.database.accounts.recordFailedPost(account.id, (error as Error).message);

      throw error;
    }
  }
}
