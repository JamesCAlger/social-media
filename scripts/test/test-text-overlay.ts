/**
 * Test script: Apply "guess the color" text overlay to videos
 */

import path from 'path';
import { applySegmentLabel } from '../src/layers/04-composition/text-overlay';
import { getTextOverlayConfig } from '../src/config/text-overlay';

const contentIds = [
  '376dedc7-29e7-43c7-ab5f-a303076ad861',
  '2f72c6d8-7ef5-4a1f-ad86-5e9b971f733f',
  '5a9a46fa-fda0-46a1-a1fa-7bdbbd48149a',
  'b0b0be06-c2db-4ef3-9d58-9240f94b68f0',
];

async function main() {
  // Get config and override display duration to 3 seconds
  const config = getTextOverlayConfig();
  config.segmentLabels.enabled = true;
  config.segmentLabels.displayDuration = 3;
  config.segmentLabels.timing = 'start';
  config.segmentLabels.position = 'top-center';

  console.log('Processing', contentIds.length, 'videos...\n');

  for (const contentId of contentIds) {
    const inputPath = path.resolve(`./content/${contentId}/raw/video_1.mp4`);
    const outputPath = path.resolve(`./content/${contentId}/video_1_with_text.mp4`);

    console.log(`Processing: ${contentId}`);

    try {
      await applySegmentLabel(
        inputPath,
        outputPath,
        'guess the color',
        5, // segment duration (5 seconds)
        config
      );
      console.log(`  ✓ Done: video_1_with_text.mp4\n`);
    } catch (error) {
      console.error(`  ✗ Error:`, (error as Error).message, '\n');
    }
  }

  console.log('All done!');
}

main();
