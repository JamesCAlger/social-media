/**
 * Test Script: Layer 4 Text Overlay Rendering
 * Tests FFmpeg text overlay rendering using existing video files
 */

import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs/promises';
import { TextOverlays } from '../src/core/types';
import { getTextOverlayConfig, defaultTextOverlayConfig } from '../src/config/text-overlay';
import {
  generateIntroClip,
  applySegmentLabel,
  composeWithTextOverlays,
  concatenateWithIntro,
} from '../src/layers/04-composition/text-overlay';

const CONTENT_DIR = path.resolve('./content');
const TEST_OUTPUT_DIR = path.resolve('./content/test-text-overlays');

// Sample text overlays for testing
const sampleTextOverlays: TextOverlays = {
  introText: 'your month your vase',
  introSubtext: 'revealed',
  segmentLabels: ['january', 'february', 'march'],
};

async function findExistingVideos(): Promise<string[]> {
  // Find an existing content folder with raw videos
  const dirs = await fs.readdir(CONTENT_DIR);

  for (const dir of dirs) {
    const rawDir = path.join(CONTENT_DIR, dir, 'raw');
    try {
      const files = await fs.readdir(rawDir);
      const videos = files
        .filter(f => f.endsWith('.mp4'))
        .sort()
        .slice(0, 3)
        .map(f => path.join(rawDir, f));

      if (videos.length === 3) {
        console.log(`Found test videos in: ${dir}`);
        return videos;
      }
    } catch {
      // Skip directories without raw folder
    }
  }

  throw new Error('No existing content with 3 raw videos found');
}

async function testIntroClipGeneration() {
  console.log('\n=== Test 1: Intro Clip Generation ===\n');

  const outputPath = path.join(TEST_OUTPUT_DIR, 'test_intro.mp4');
  const config = getTextOverlayConfig();

  console.log('Config:', {
    duration: config.intro.duration,
    backgroundColor: config.intro.backgroundColor,
    fontSize: config.intro.fontSize,
    animation: config.intro.animation,
  });

  console.log('Generating intro clip...');
  const result = await generateIntroClip(sampleTextOverlays, outputPath, config);

  if (result) {
    const stats = await fs.stat(result);
    console.log(`Intro clip created: ${result}`);
    console.log(`File size: ${(stats.size / 1024).toFixed(1)} KB`);
    return true;
  } else {
    console.log('Intro clip disabled (config.intro.enabled = false)');
    return false;
  }
}

async function testSegmentLabelApplication(videoPath: string) {
  console.log('\n=== Test 2: Segment Label Application ===\n');

  const outputPath = path.join(TEST_OUTPUT_DIR, 'test_segment_labeled.mp4');
  const config = getTextOverlayConfig();

  console.log('Input video:', videoPath);
  console.log('Applying label: "january"');
  console.log('Config:', {
    position: config.segmentLabels.position,
    fontSize: config.segmentLabels.fontSize,
    animation: config.segmentLabels.animation,
    timing: config.segmentLabels.timing,
  });

  const result = await applySegmentLabel(
    videoPath,
    outputPath,
    'january',
    5, // 5 second segment
    config
  );

  const stats = await fs.stat(result);
  console.log(`Labeled video created: ${result}`);
  console.log(`File size: ${(stats.size / 1024).toFixed(1)} KB`);
  return true;
}

async function testFullComposition(inputVideos: string[]) {
  console.log('\n=== Test 3: Full Composition with Text Overlays ===\n');

  const config = getTextOverlayConfig();
  console.log('Text overlay config:', {
    enabled: config.enabled,
    introEnabled: config.intro.enabled,
    introDuration: config.intro.duration,
    segmentLabelsEnabled: config.segmentLabels.enabled,
  });

  console.log('Input videos:', inputVideos.map(v => path.basename(v)));
  console.log('Text overlays:', sampleTextOverlays);

  // Step 1: Process with text overlays
  console.log('\nStep 1: Processing videos with text overlays...');
  const { processedVideos, introClip } = await composeWithTextOverlays(
    inputVideos,
    sampleTextOverlays,
    TEST_OUTPUT_DIR,
    config
  );

  console.log('Processed videos:', processedVideos.map(v => path.basename(v)));
  console.log('Intro clip:', introClip ? path.basename(introClip) : '(none)');

  // Step 2: Concatenate
  console.log('\nStep 2: Concatenating into final video...');
  const finalOutput = path.join(TEST_OUTPUT_DIR, 'test_final_with_overlays.mp4');
  await concatenateWithIntro(introClip, processedVideos, finalOutput);

  const stats = await fs.stat(finalOutput);
  console.log(`\nFinal video created: ${finalOutput}`);
  console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  return true;
}

async function main() {
  console.log('=== Layer 4 Text Overlay Test Suite ===');
  console.log(`Test output directory: ${TEST_OUTPUT_DIR}\n`);

  // Create test output directory
  await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });

  // Find existing videos to test with
  let inputVideos: string[];
  try {
    inputVideos = await findExistingVideos();
  } catch (error) {
    console.error('Could not find test videos:', error);
    console.log('\nTo run this test, you need existing content with raw videos.');
    console.log('Run the full pipeline first: npx tsx src/index.ts');
    process.exit(1);
  }

  // Check font exists
  const fontPath = path.resolve('./assets/fonts/Montserrat-Bold.ttf');
  try {
    await fs.access(fontPath);
    console.log('Font found:', fontPath);
  } catch {
    console.error('Font not found! Run: npx tsx scripts/setup-fonts.ts');
    process.exit(1);
  }

  // Run tests
  const results: Record<string, boolean> = {};

  try {
    results['Intro Clip'] = await testIntroClipGeneration();
  } catch (error) {
    console.error('Intro clip test failed:', error);
    results['Intro Clip'] = false;
  }

  try {
    results['Segment Label'] = await testSegmentLabelApplication(inputVideos[0]);
  } catch (error) {
    console.error('Segment label test failed:', error);
    results['Segment Label'] = false;
  }

  try {
    results['Full Composition'] = await testFullComposition(inputVideos);
  } catch (error) {
    console.error('Full composition test failed:', error);
    results['Full Composition'] = false;
  }

  // Summary
  console.log('\n=== Test Summary ===');
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`  [${status}] ${test}`);
  });

  const allPassed = Object.values(results).every(v => v);
  console.log(`\nOverall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  if (allPassed) {
    console.log(`\nTest videos available in: ${TEST_OUTPUT_DIR}`);
    console.log('Review them to verify text overlay rendering.');
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
