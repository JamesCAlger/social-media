/**
 * Test Composer Agent
 *
 * Usage:
 *   npx tsx scripts/test-composer-agent.ts           # Run with FFmpeg (requires FFmpeg)
 *   npx tsx scripts/test-composer-agent.ts --mock    # Run with mock data (no FFmpeg needed)
 */

import { createComposerAgent } from '../src/agents/composer';
import { Script } from '../src/agents/generator/schema';
import { AssetOutput, GeneratedAsset } from '../src/agents/asset/schema';
import { AudioOutput, VoiceoverResult, SegmentTiming } from '../src/agents/audio/schema';
import * as fs from 'fs';
import * as path from 'path';

const mockMode = process.argv.includes('--mock');

// Create sample script
function createSampleScript(): Script {
  return {
    title: 'The 50/30/20 Budget Rule Explained',
    hook: 'Most people budget wrong. Here\'s the one rule that actually works.',
    hookStyle: 'contrarian',
    estimatedDuration: 30,
    cta: 'Follow for more money tips',
    segments: [
      {
        timestamp: '0:00-0:05',
        duration: 5,
        narration: 'Most people budget wrong. Here\'s the one rule that actually works.',
        visualDescription: 'A sleek calculator surrounded by floating dollar bills',
        visualType: 'ai_image',
        textOverlay: 'The 50/30/20 Rule',
        pacing: 'fast',
        energy: 'peak'
      },
      {
        timestamp: '0:05-0:12',
        duration: 7,
        narration: 'It\'s called the 50/30/20 rule. 50% of your income goes to needs like rent and food.',
        visualDescription: 'Modern apartment interior',
        visualType: 'ai_image',
        textOverlay: '50% = Needs',
        pacing: 'medium',
        energy: 'building'
      },
      {
        timestamp: '0:12-0:19',
        duration: 7,
        narration: '30% goes to wants. Dining out, entertainment, those new shoes.',
        visualDescription: 'Elegant dinner table setting',
        visualType: 'ai_image',
        textOverlay: '30% = Wants',
        pacing: 'medium',
        energy: 'building'
      },
      {
        timestamp: '0:19-0:26',
        duration: 7,
        narration: 'And 20% goes straight to savings. This is how wealth is built.',
        visualDescription: 'Golden piggy bank',
        visualType: 'ai_image',
        textOverlay: '20% = Savings',
        pacing: 'medium',
        energy: 'building'
      },
      {
        timestamp: '0:26-0:30',
        duration: 4,
        narration: 'Follow for more money tips that actually work.',
        visualDescription: 'Summary card',
        visualType: 'text_card',
        textOverlay: '50% Needs | 30% Wants | 20% Savings',
        pacing: 'medium',
        energy: 'resolution'
      }
    ]
  };
}

// Create sample assets output
function createSampleAssets(contentId: string, outputDir: string): AssetOutput {
  // Create mock image files
  const assets: GeneratedAsset[] = [];

  for (let i = 0; i < 5; i++) {
    const assetPath = path.join(outputDir, `segment_${i + 1}.png`);

    // Create a minimal PNG placeholder
    const minimalPng = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0x60, 0x60, 0x60, 0x00,
      0x00, 0x00, 0x04, 0x00, 0x01, 0x5C, 0xCD, 0xFF,
      0xA2, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
      0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    fs.writeFileSync(assetPath, minimalPng);

    assets.push({
      segmentIndex: i,
      timestamp: `0:${String(i * 5).padStart(2, '0')}-0:${String((i + 1) * 5).padStart(2, '0')}`,
      type: i < 4 ? 'ai_image' : 'text_card',
      localPath: assetPath,
      width: 1080,
      height: 1920,
      duration: i < 4 ? (i === 0 ? 5 : 7) : 4,
      prompt: `Test prompt for segment ${i + 1}`,
      seed: 12345,
      generationTimeMs: 100
    });
  }

  return {
    contentId,
    assets,
    totalImages: 4,
    textCards: 1,
    outputDir,
    generatedAt: new Date(),
    totalCost: 0.095,
    totalTimeMs: 500
  };
}

// Create sample audio output
function createSampleAudio(contentId: string, outputDir: string): AudioOutput {
  const audioPath = path.join(outputDir, 'voiceover.mp3');

  // Create a minimal MP3 placeholder
  const silentMp3 = Buffer.from([
    0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);

  fs.writeFileSync(audioPath, silentMp3);

  const voiceover: VoiceoverResult = {
    localPath: audioPath,
    duration: 30,
    provider: 'elevenlabs',
    voiceId: 'test-voice-id',
    isCustomClone: false,
    speed: 1.08,
    cost: 0.035,
    characterCount: 350
  };

  const segmentTimings: SegmentTiming[] = [
    { segmentIndex: 0, startTime: 0, endTime: 5, duration: 5, narration: 'Hook' },
    { segmentIndex: 1, startTime: 5, endTime: 12, duration: 7, narration: 'Segment 1' },
    { segmentIndex: 2, startTime: 12, endTime: 19, duration: 7, narration: 'Segment 2' },
    { segmentIndex: 3, startTime: 19, endTime: 26, duration: 7, narration: 'Segment 3' },
    { segmentIndex: 4, startTime: 26, endTime: 30, duration: 4, narration: 'CTA' }
  ];

  return {
    contentId,
    voiceover,
    segmentTimings,
    outputDir,
    generatedAt: new Date(),
    totalCost: 0.035,
    totalTimeMs: 200
  };
}

async function main() {
  console.log('\n🎬 Testing Composer Agent...\n');
  console.log(`Mode: ${mockMode ? 'MOCK (no FFmpeg)' : 'LIVE (requires FFmpeg)'}\n`);

  // Create unique content ID for this test
  const contentId = `test-composer-${Date.now()}`;
  const outputDir = path.join('./content', contentId);
  const assetsDir = path.join(outputDir, 'assets');
  const audioDir = path.join(outputDir, 'audio');

  // Ensure directories exist
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.mkdirSync(audioDir, { recursive: true });

  // Create the agent
  const composerAgent = createComposerAgent({
    mockMode,
    outputBaseDir: './content'
  });

  // Create sample data
  const script = createSampleScript();
  const assets = createSampleAssets(contentId, assetsDir);
  const audio = createSampleAudio(contentId, audioDir);

  console.log('📝 Test Data:');
  console.log(`   Script: ${script.title}`);
  console.log(`   Segments: ${script.segments.length}`);
  console.log(`   Assets: ${assets.assets.length}`);
  console.log(`   Audio Duration: ${audio.voiceover.duration}s`);
  console.log('');

  try {
    console.log('🚀 Composing video...\n');

    const result = await composerAgent.execute({
      script,
      assets,
      audio,
      contentId,
      outputDir
    });

    console.log('✅ Video Composition Complete!\n');
    console.log('📊 Results:');
    console.log(`   Content ID: ${result.contentId}`);
    console.log(`   Duration: ${result.finalVideo.duration}s`);
    console.log(`   Resolution: ${result.finalVideo.resolution}`);
    console.log(`   Aspect Ratio: ${result.finalVideo.aspectRatio}`);
    console.log(`   File Size: ${result.finalVideo.fileSize} bytes`);
    console.log(`   Total Cost: $${result.totalCost.toFixed(4)}`);
    console.log(`   Total Time: ${(result.totalTimeMs / 1000).toFixed(2)}s`);
    console.log(`   Output Dir: ${result.outputDir}`);
    console.log('');

    console.log('🎥 Final Video:');
    console.log(`   Path: ${result.finalVideo.localPath}`);
    console.log(`   Processed At: ${result.finalVideo.processedAt}`);
    console.log('');

    console.log('📐 Composition Details:');
    console.log(`   Visual Segments: ${result.composition.visualTimings.length}`);
    console.log(`   Audio Duration: ${result.composition.audioDuration}s`);
    console.log(`   Has Text Overlays: ${result.composition.hasTextOverlays}`);
    console.log('');

    console.log('⏱️ Visual Timings:');
    for (const timing of result.composition.visualTimings) {
      console.log(`   [${timing.segmentIndex + 1}] ${timing.startTime.toFixed(2)}s - ${timing.endTime.toFixed(2)}s`);
      console.log(`       Asset: ${path.basename(timing.assetPath)}`);
    }
    console.log('');

    // Verify file was created
    console.log('🔍 Verifying files...');
    const exists = fs.existsSync(result.finalVideo.localPath);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${path.basename(result.finalVideo.localPath)}`);

    if (exists) {
      const stats = fs.statSync(result.finalVideo.localPath);
      console.log(`   Size: ${stats.size} bytes`);
    }
    console.log('');

    if (exists) {
      console.log('✅ Video file created successfully!\n');
    } else {
      console.log('⚠️ Video file is missing\n');
    }

    // Cleanup if in mock mode
    if (mockMode) {
      console.log('🧹 Cleaning up mock files...');
      fs.rmSync(outputDir, { recursive: true, force: true });
      console.log('   Removed test directory\n');
    } else {
      console.log(`💡 Video saved to: ${result.finalVideo.localPath}\n`);
    }

    return result;

  } catch (error) {
    console.error('\n❌ Video composition failed:', (error as Error).message);
    console.error(error);

    // Cleanup on error
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    process.exit(1);
  }
}

main();
