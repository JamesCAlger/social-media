/**
 * Test Video Generation (Layers 1-4 only)
 *
 * Generates a video but does NOT post it.
 * Useful for testing content types and pipeline changes.
 *
 * Run with: npx tsx scripts/test-video-generation.ts <account-slug>
 */

import { Database } from '../src/core/database';
import { logger } from '../src/core/logger';
import { getConfig } from '../src/config';
import { MultiAccountIdeaGenerationLayer } from '../src/layers/01-idea-generation/multi-account';
import { PromptEngineeringLayer } from '../src/layers/02-prompt-engineering';
import { VideoGenerationLayer } from '../src/layers/03-video-generation';
import { CompositionLayer } from '../src/layers/04-composition';
import { selectContentType, convertContentTypeToStrategy } from '../src/utils/content-type-selector';

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error('Usage: npx tsx scripts/test-video-generation.ts <account-slug>');
    process.exit(1);
  }

  const db = new Database();
  const config = getConfig();

  try {
    // Get account
    const account = await db.accounts.getAccountBySlug(slug);

    if (!account) {
      console.error(`Account not found: ${slug}`);
      process.exit(1);
    }

    console.log(`\n========================================`);
    console.log(`Testing Video Generation for ${account.name}`);
    console.log(`========================================\n`);

    // Select content type
    const selectedType = selectContentType(account);

    if (!selectedType) {
      console.error('No content type configured for account');
      process.exit(1);
    }

    const { contentType, index } = selectedType;

    console.log(`Selected Content Type: ${contentType.name}`);
    console.log(`  Niche: ${contentType.niche}`);
    console.log(`  Segments: ${contentType.segmentCount} x ${contentType.segmentDuration}s`);
    console.log('');

    // Create account with effective content strategy
    const accountWithStrategy = {
      ...account,
      contentStrategy: convertContentTypeToStrategy(contentType),
    };

    const startTime = Date.now();

    // Layer 1: Idea Generation
    console.log('=== Layer 1: Idea Generation ===');
    const ideaLayer = new MultiAccountIdeaGenerationLayer(db);
    const idea = await ideaLayer.execute(config, accountWithStrategy);
    console.log(`  Content ID: ${idea.id}`);
    console.log(`  Idea: ${idea.idea}`);
    console.log(`  Environment: ${idea.environment}`);
    console.log('');

    await db.updateContent(idea.id, { status: 'idea_generated' });

    // Layer 2: Prompt Engineering
    console.log('=== Layer 2: Prompt Engineering ===');
    const promptLayer = new PromptEngineeringLayer(db);
    const prompts = await promptLayer.execute(idea, config, accountWithStrategy);
    console.log(`  Generated ${prompts.prompts.length} prompt(s)`);
    for (const p of prompts.prompts) {
      console.log(`  Prompt ${p.sequence}: ${p.videoPrompt.substring(0, 100)}...`);
    }
    console.log('');

    await db.updateContent(idea.id, { status: 'prompts_generated' });

    // Layer 3: Video Generation
    console.log('=== Layer 3: Video Generation ===');
    console.log('  (This may take a few minutes...)');
    const videoLayer = new VideoGenerationLayer(db);
    const videos = await videoLayer.execute(prompts, config);
    console.log(`  Generated ${videos.videos.length} video(s)`);
    for (const v of videos.videos) {
      console.log(`  Video ${v.sequence}: ${v.storagePath} (${v.duration}s, $${v.cost.toFixed(2)})`);
    }
    console.log('');

    await db.updateContent(idea.id, { status: 'videos_generated' });

    // Layer 4: Composition
    console.log('=== Layer 4: Composition ===');
    const compositionLayer = new CompositionLayer(db);
    const composition = await compositionLayer.execute(videos, config, idea.textOverlays);
    console.log(`  Final video: ${composition.finalVideo.storagePath}`);
    console.log(`  Duration: ${composition.finalVideo.duration}s`);
    console.log(`  File size: ${(composition.finalVideo.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  R2 URL: ${composition.finalVideo.r2Url}`);
    console.log('');

    // Update status to indicate composition complete (not posted)
    await db.updateContent(idea.id, { status: 'review_pending' });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('========================================');
    console.log('TEST COMPLETE (Video NOT posted)');
    console.log('========================================');
    console.log(`  Content ID: ${idea.id}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`  R2 URL: ${composition.finalVideo.r2Url}`);
    console.log(`  Caption: ${idea.caption.substring(0, 100)}...`);
    console.log('');
    console.log('To view the video, open the R2 URL in your browser.');
    console.log('To post it, manually approve via Telegram or run the distribution layer.');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    logger.error('Test failed', { error: error.message, stack: error.stack });
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();
