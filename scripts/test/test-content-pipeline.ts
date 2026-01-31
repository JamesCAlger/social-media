/**
 * Test Content Pipeline (Asset → Audio → Composer)
 *
 * This test skips the LLM agents (Research, Generator, Critic, Refiner)
 * and directly tests the visual content pipeline with a pre-made script.
 *
 * Usage:
 *   npx tsx scripts/test-content-pipeline.ts           # Run with APIs
 *   npx tsx scripts/test-content-pipeline.ts --mock    # Run with mock data (no API costs)
 */

import { v4 as uuidv4 } from 'uuid';
import { createAssetAgent, AssetOutput } from '../src/agents/asset';
import { createAudioAgent, AudioOutput } from '../src/agents/audio';
import { createComposerAgent, ComposerOutput } from '../src/agents/composer';
import { Script } from '../src/agents/generator/schema';
import * as fs from 'fs';
import * as path from 'path';

const mockMode = process.argv.includes('--mock');

// Pre-made script (simulating output from Quality Loop)
function createSampleScript(): Script {
  return {
    title: 'Why Your Savings Account Is Losing You Money',
    hook: 'Your bank is legally stealing from you. Here\'s the math.',
    hookStyle: 'contrarian',
    estimatedDuration: 30,
    cta: 'Follow for more money math.',
    segments: [
      {
        timestamp: '0:00-0:03',
        duration: 3,
        narration: 'Your bank is legally stealing from you. Here\'s the math.',
        visualDescription: 'Minimalist 3D piggy bank with coins dissolving, dark navy background, coral accent lighting',
        visualType: 'ai_image',
        textOverlay: 'YOUR BANK IS STEALING FROM YOU',
        pacing: 'fast',
        energy: 'peak'
      },
      {
        timestamp: '0:03-0:10',
        duration: 7,
        narration: 'You put ten thousand dollars in savings. The bank gives you 0.5% interest. That\'s fifty dollars a year.',
        visualDescription: 'Stack of money with small coins trickling out, premium financial aesthetic',
        visualType: 'ai_image',
        textOverlay: '$10,000 → $50/year',
        pacing: 'medium',
        energy: 'building'
      },
      {
        timestamp: '0:10-0:18',
        duration: 8,
        narration: 'But inflation is 3.5%. Your ten thousand loses three hundred fifty in buying power. Minus that fifty? You\'re down three hundred dollars.',
        visualDescription: 'Money stack visibly shrinking with timeline, numbers in coral accent color',
        visualType: 'ai_image',
        textOverlay: '-$300/year',
        pacing: 'fast',
        energy: 'peak'
      },
      {
        timestamp: '0:18-0:24',
        duration: 6,
        narration: 'After 10 years? Your money buys what seventy-four hundred used to.',
        visualDescription: 'Comparison visualization: $10,000 shrinking to $7,400 in buying power',
        visualType: 'ai_image',
        textOverlay: '10 years = $7,400 buying power',
        pacing: 'fast',
        energy: 'peak'
      },
      {
        timestamp: '0:24-0:28',
        duration: 4,
        narration: 'High-yield accounts pay 4-5%. Your money should grow, not rot.',
        visualDescription: 'Upward trending graph with growth visualization, coral accent on growth line',
        visualType: 'ai_image',
        textOverlay: 'HYSA: 4-5%',
        pacing: 'medium',
        energy: 'resolution'
      },
      {
        timestamp: '0:28-0:30',
        duration: 2,
        narration: 'Follow for more money math.',
        visualDescription: 'Clean text card with account branding',
        visualType: 'text_card',
        textOverlay: 'Follow for more 💰',
        pacing: 'medium',
        energy: 'resolution'
      }
    ]
  };
}

interface StageResult {
  stage: string;
  success: boolean;
  durationMs: number;
  cost: number;
  error?: string;
}

async function main() {
  console.log('\n🎬 Testing Content Pipeline (Asset → Audio → Composer)...\n');
  console.log(`Mode: ${mockMode ? 'MOCK (no API calls)' : 'LIVE (will make API calls)'}`);
  console.log('═'.repeat(60) + '\n');

  const contentId = uuidv4();
  const outputDir = path.join('./content', contentId);

  // Create agents
  const assetAgent = createAssetAgent({ mockMode, outputBaseDir: './content' });
  const audioAgent = createAudioAgent({ mockMode, outputBaseDir: './content' });
  const composerAgent = createComposerAgent({ mockMode, outputBaseDir: './content' });

  // Create sample script
  const script = createSampleScript();

  console.log('📋 Test Configuration:');
  console.log(`   Content ID: ${contentId}`);
  console.log(`   Title: ${script.title}`);
  console.log(`   Segments: ${script.segments.length}`);
  console.log(`   Duration: ${script.estimatedDuration}s`);
  console.log('');

  const startTime = Date.now();
  const stageResults: StageResult[] = [];
  let totalCost = 0;

  try {
    console.log('🚀 Starting Content Pipeline...\n');
    console.log('─'.repeat(60));

    // Stage 1: Asset Generation
    console.log('\n📸 Stage 1: Asset Agent - Generating images...\n');
    const assetStart = Date.now();

    const assetOutput: AssetOutput = await assetAgent.execute({
      script,
      contentId,
      niche: 'finance'
    });

    const assetDuration = Date.now() - assetStart;
    totalCost += assetOutput.totalCost;

    stageResults.push({
      stage: 'assets',
      success: true,
      durationMs: assetDuration,
      cost: assetOutput.totalCost
    });

    console.log(`   ✅ Assets generated: ${assetOutput.assets.length} images`);
    console.log(`   Cost: $${assetOutput.totalCost.toFixed(4)}`);
    console.log(`   Time: ${(assetDuration / 1000).toFixed(2)}s`);

    // Stage 2: Audio Generation
    console.log('\n🎙️ Stage 2: Audio Agent - Generating voiceover...\n');
    const audioStart = Date.now();

    const audioOutput: AudioOutput = await audioAgent.execute({
      script,
      contentId,
      niche: 'finance'
    });

    const audioDuration = Date.now() - audioStart;
    totalCost += audioOutput.totalCost;

    stageResults.push({
      stage: 'audio',
      success: true,
      durationMs: audioDuration,
      cost: audioOutput.totalCost
    });

    console.log(`   ✅ Voiceover generated: ${audioOutput.voiceover.duration.toFixed(2)}s`);
    console.log(`   Cost: $${audioOutput.totalCost.toFixed(4)}`);
    console.log(`   Time: ${(audioDuration / 1000).toFixed(2)}s`);

    // Stage 3: Video Composition
    console.log('\n🎬 Stage 3: Composer Agent - Creating video...\n');
    const composeStart = Date.now();

    const composerOutput: ComposerOutput = await composerAgent.execute({
      script,
      assets: assetOutput,
      audio: audioOutput,
      contentId
    });

    const composeDuration = Date.now() - composeStart;
    totalCost += composerOutput.totalCost;

    stageResults.push({
      stage: 'compose',
      success: true,
      durationMs: composeDuration,
      cost: composerOutput.totalCost
    });

    console.log(`   ✅ Video composed: ${composerOutput.finalVideo.duration}s`);
    console.log(`   Resolution: ${composerOutput.finalVideo.resolution}`);
    console.log(`   File Size: ${composerOutput.finalVideo.fileSize} bytes`);
    console.log(`   Time: ${(composeDuration / 1000).toFixed(2)}s`);

    // Summary
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n─'.repeat(60));
    console.log('\n✅ Content Pipeline Completed Successfully!\n');
    console.log('═'.repeat(60));

    console.log('\n📊 RESULTS SUMMARY\n');

    console.log('📝 Content:');
    console.log(`   Content ID: ${contentId}`);
    console.log(`   Title: ${script.title}`);
    console.log(`   Hook: "${script.hook}"`);
    console.log(`   Duration: ${composerOutput.finalVideo.duration}s`);
    console.log('');

    console.log('🎥 Final Video:');
    console.log(`   Resolution: ${composerOutput.finalVideo.resolution}`);
    console.log(`   Aspect Ratio: ${composerOutput.finalVideo.aspectRatio}`);
    console.log(`   File Size: ${composerOutput.finalVideo.fileSize} bytes`);
    console.log(`   Path: ${composerOutput.finalVideo.localPath}`);
    console.log('');

    console.log('💰 Cost Breakdown:');
    for (const stage of stageResults) {
      const duration = (stage.durationMs / 1000).toFixed(2);
      console.log(`   ${stage.stage.padEnd(12)} $${stage.cost.toFixed(4)} (${duration}s)`);
    }
    console.log(`   ${'─'.repeat(25)}`);
    console.log(`   ${'Total'.padEnd(12)} $${totalCost.toFixed(4)} (${totalTime}s)`);
    console.log('');

    console.log('📁 Generated Files:');
    console.log(`   Assets: ${assetOutput.outputDir}`);
    console.log(`   Audio: ${audioOutput.outputDir}`);
    console.log(`   Video: ${composerOutput.finalVideo.localPath}`);
    console.log('');

    console.log('═'.repeat(60));
    console.log(`\n🎉 Content pipeline test ${mockMode ? '(mock)' : '(live)'} completed in ${totalTime}s\n`);

    // Cleanup if mock mode
    if (mockMode && fs.existsSync(outputDir)) {
      console.log('🧹 Cleaning up mock files...');
      fs.rmSync(outputDir, { recursive: true, force: true });
      console.log('   Removed test directory\n');
    } else {
      console.log(`💡 Content saved to: ${outputDir}\n`);
    }

    return {
      contentId,
      assets: assetOutput,
      audio: audioOutput,
      video: composerOutput,
      totalCost,
      stageResults
    };

  } catch (error) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('─'.repeat(60));
    console.error(`\n❌ Content pipeline failed after ${totalTime}s`);
    console.error(`   Error: ${(error as Error).message}`);
    console.error(error);

    // Cleanup on error
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    process.exit(1);
  }
}

main();
