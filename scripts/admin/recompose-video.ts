import path from 'path';
import { composeWithTextOverlays, concatenateWithIntro } from '../src/layers/04-composition/text-overlay';
import { getTextOverlayConfig } from '../src/config/text-overlay';

const contentDir = path.resolve('./content/9da5cb22-fe4a-4bb4-bfaf-eea6d966df54');

const textOverlays = {
  introText: 'history unmasked',
  introSubtext: 'ancient whispers',
  segmentLabels: ['uncover', 'reveal', 'admire']
};

const inputVideos = [
  path.join(contentDir, 'raw/video_1.mp4'),
  path.join(contentDir, 'raw/video_2.mp4'),
  path.join(contentDir, 'raw/video_3.mp4'),
];

async function main() {
  console.log('=== Re-composing video with new intro ===');
  console.log('Using video 3 as intro background (to avoid repetition)\n');

  const config = getTextOverlayConfig();

  // Step 1: Generate intro + apply segment labels
  console.log('Step 1: Generating intro and applying segment labels...');
  const { processedVideos, introClip } = await composeWithTextOverlays(
    inputVideos,
    textOverlays,
    contentDir,
    config
  );

  console.log('  Intro clip:', introClip ? path.basename(introClip) : 'none');
  console.log('  Processed segments:', processedVideos.map(v => path.basename(v)).join(', '));

  // Step 2: Concatenate everything
  console.log('\nStep 2: Concatenating all videos...');
  const finalOutput = path.join(contentDir, 'final_video_new.mp4');
  await concatenateWithIntro(introClip, processedVideos, finalOutput);

  console.log('\n=== Done! ===');
  console.log('New video:', finalOutput);
}

main().catch(console.error);
