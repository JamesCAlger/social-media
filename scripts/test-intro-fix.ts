import { generateIntroClip } from '../src/layers/04-composition/text-overlay';
import { getTextOverlayConfig } from '../src/config/text-overlay';
import path from 'path';

// Simulate ACTUAL pipeline output (lowercase from Layer 1)
const textOverlays = {
  introText: 'history unmasked',  // lowercase like Layer 1 generates
  introSubtext: 'ancient whispers',
  segmentLabels: ['uncover', 'reveal', 'admire']
};

async function main() {
  const config = getTextOverlayConfig();
  console.log('=== Testing Pipeline Integration ===');
  console.log('Input (from Layer 1):', textOverlays.introText, '(lowercase)');
  console.log('Expected output: "History Unmasked" (Title Case - auto-converted)');
  console.log('');
  console.log('Config:');
  console.log('  Title prefix:', config.intro.titlePrefix);
  console.log('  Use video background:', config.intro.useVideoBackground);

  // Use video from the recently generated content as background
  const backgroundVideo = path.resolve('./content/9da5cb22-fe4a-4bb4-bfaf-eea6d966df54/raw/video_1.mp4');

  await generateIntroClip(textOverlays, './content/test-intro-final.mp4', config, backgroundVideo);
  console.log('\nDone! Check content/test-intro-final.mp4');
  console.log('This simulates exactly what the pipeline will generate.');
}

main().catch(console.error);
