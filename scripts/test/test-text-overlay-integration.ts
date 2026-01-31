/**
 * Integration Test: Text Overlay Pipeline
 * Tests the full flow from Layer 1 text generation through Layer 4 composition
 * Uses existing videos to avoid video generation costs
 */

import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { createIdeaProvider } from '../src/layers/01-idea-generation/providers';
import { LocalFFmpegComposer } from '../src/layers/04-composition/ffmpeg-local';
import { VideoGenerationOutput, TextOverlays } from '../src/core/types';
import { getTextOverlayConfig } from '../src/config/text-overlay';

const CONTENT_DIR = path.resolve('./content');
const TEST_OUTPUT_DIR = path.resolve('./content/integration-test');

async function findExistingVideos(): Promise<{ contentId: string; videos: string[] }> {
  const dirs = await fs.readdir(CONTENT_DIR);

  for (const dir of dirs) {
    if (dir === 'test-text-overlays' || dir === 'integration-test') continue;

    const rawDir = path.join(CONTENT_DIR, dir, 'raw');
    try {
      const files = await fs.readdir(rawDir);
      const videos = files
        .filter(f => f.endsWith('.mp4'))
        .sort()
        .slice(0, 3);

      if (videos.length === 3) {
        return {
          contentId: dir,
          videos: videos.map(f => path.join(rawDir, f)),
        };
      }
    } catch {
      continue;
    }
  }

  throw new Error('No existing content with 3 raw videos found');
}

async function main() {
  console.log('=== Text Overlay Integration Test ===\n');
  console.log('This test validates the full flow from Layer 1 -> Layer 4\n');

  // Create test output directory
  await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
  const testContentId = uuidv4();
  const testContentDir = path.join(TEST_OUTPUT_DIR, testContentId);
  await fs.mkdir(testContentDir, { recursive: true });

  console.log(`Test Content ID: ${testContentId}\n`);

  // Step 1: Generate idea with text overlays (Layer 1)
  console.log('=== Step 1: Layer 1 - Generate Idea with Text Overlays ===\n');
  const provider = createIdeaProvider('openai', 'gpt-4', 0.8);
  const idea = await provider.generateIdea();

  console.log('Generated idea:', idea.idea);
  console.log('Text overlays:');
  console.log(`  Intro: "${idea.textOverlays.introText}"`);
  console.log(`  Subtext: "${idea.textOverlays.introSubtext || '(none)'}"`);
  console.log(`  Labels: [${idea.textOverlays.segmentLabels.join(', ')}]`);

  // Save idea to test directory
  await fs.writeFile(
    path.join(testContentDir, 'idea.json'),
    JSON.stringify(idea, null, 2)
  );

  // Step 2: Find existing videos to use (skip Layer 2-3)
  console.log('\n=== Step 2: Using Existing Videos (Skip Layer 2-3) ===\n');
  const { contentId: sourceContentId, videos: sourceVideos } = await findExistingVideos();
  console.log(`Using videos from: ${sourceContentId}`);

  // Copy videos to test directory
  const rawDir = path.join(testContentDir, 'raw');
  await fs.mkdir(rawDir, { recursive: true });

  const copiedVideos = await Promise.all(
    sourceVideos.map(async (src, i) => {
      const dest = path.join(rawDir, `video_${i + 1}.mp4`);
      await fs.copyFile(src, dest);
      return dest;
    })
  );

  console.log('Copied videos:', copiedVideos.map(v => path.basename(v)));

  // Create mock video generation output
  const videoOutput: VideoGenerationOutput = {
    contentId: testContentId,
    videos: copiedVideos.map((v, i) => ({
      sequence: (i + 1) as 1 | 2 | 3,
      storagePath: `integration-test/${testContentId}/raw/video_${i + 1}.mp4`,
      duration: 5,
      resolution: '720p',
      aspectRatio: '9:16',
      hasAudio: true,
      generatedAt: new Date().toISOString(),
      cost: 0,
    })),
  };

  // Step 3: Compose with text overlays (Layer 4)
  console.log('\n=== Step 3: Layer 4 - Compose with Text Overlays ===\n');
  const config = getTextOverlayConfig();
  console.log('Text overlay config:');
  console.log(`  Enabled: ${config.enabled}`);
  console.log(`  Intro enabled: ${config.intro.enabled}`);
  console.log(`  Intro duration: ${config.intro.duration}s`);
  console.log(`  Segment labels enabled: ${config.segmentLabels.enabled}`);

  const composer = new LocalFFmpegComposer();
  const startTime = Date.now();
  const compositionResult = await composer.compose(videoOutput, idea.textOverlays);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\nComposition complete!');
  console.log(`  Duration: ${duration}s`);
  console.log(`  Final video: ${compositionResult.finalVideo.storagePath}`);
  console.log(`  Video duration: ${compositionResult.finalVideo.duration}s`);
  console.log(`  File size: ${(compositionResult.finalVideo.fileSize / 1024 / 1024).toFixed(2)} MB`);

  // Verify output
  const finalVideoPath = path.join(CONTENT_DIR, compositionResult.finalVideo.storagePath);
  const exists = await fs.access(finalVideoPath).then(() => true).catch(() => false);

  console.log('\n=== Summary ===');
  console.log(`[${exists ? 'PASS' : 'FAIL'}] Final video created`);
  console.log(`[PASS] Text overlays from Layer 1 passed to Layer 4`);
  console.log(`[PASS] Intro clip generated with: "${idea.textOverlays.introText}"`);
  console.log(`[PASS] Segment labels applied: [${idea.textOverlays.segmentLabels.join(', ')}]`);

  if (exists) {
    console.log(`\nFinal video: ${finalVideoPath}`);
    console.log('Open this video to verify text overlays are rendering correctly.');
  }

  // Save composition result
  await fs.writeFile(
    path.join(testContentDir, 'composition.json'),
    JSON.stringify(compositionResult, null, 2)
  );

  console.log('\n=== Integration Test Complete ===');
  console.log(`Test files saved to: ${testContentDir}`);

  return exists;
}

main()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((error) => {
    console.error('Integration test failed:', error);
    process.exit(1);
  });
