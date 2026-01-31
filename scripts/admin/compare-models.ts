/**
 * Compare Video Generation Models
 *
 * Uses the same prompt with different models for comparison.
 * Run with: npx tsx scripts/compare-models.ts
 */

import 'dotenv/config';
import * as fal from '@fal-ai/serverless-client';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// Try both env var names (FAL_KEY is the new recommended name)
const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
console.log('Using FAL key:', falKey ? `${falKey.substring(0, 10)}...` : 'NOT SET');

fal.config({
  credentials: falKey,
});

const videoPrompt = `Set in a pastel mint environment, a chubby apple made of translucent green jelly with a kawaii-style smiling face sits center stage. It gleams under the soft dreamy lighting, refracting light into a spectrum of greens, and is surrounded by faint floating sparkles that shimmer in the air. The jelly apple is smooth, plump, and bouncy, its surface faintly dimpling under the soft impact of the floating sparkles. A long, silver knife with a thin, razor-sharp blade appears from the right side. It hovers briefly above the jelly apple, then cleanly slices down through it in one fluid motion. The jelly apple quivers slightly as the blade passes through, the cut revealing a cross-section of translucent, wobbly jelly. The two halves slowly separate, still connected at the base, as more floating sparkles drift out from the fresh cut.`;

const audioPrompt = `Background ambience of a soft, dreamy hum. As the knife appears, a suspenseful silence falls. Then the gentle sound of the knife slicing through the jelly apple, a mixture of a soft squelch and a clean, swift slicing sound. As the halves separate, a faint, squishy jiggling sound.`;

async function generateWithWAN() {
  console.log('========================================');
  console.log('Generating with WAN 2.5 (5 seconds)');
  console.log('========================================\n');

  const startTime = Date.now();

  const combinedPrompt = `${videoPrompt}\n\nAudio: ${audioPrompt}`;
  console.log('Prompt:', videoPrompt.substring(0, 100) + '...\n');
  console.log('Generating video... (this may take ~3 minutes)\n');

  try {
    const result = await fal.subscribe('fal-ai/wan-25-preview/text-to-video', {
      input: {
        prompt: combinedPrompt,
        duration: '5',
        resolution: '720p',
        aspect_ratio: '9:16',
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('  Status: IN_PROGRESS');
        } else if (update.status === 'IN_QUEUE') {
          console.log('  Status: IN_QUEUE');
        }
      },
    });

    const resultData = result as any;
    console.log('\nResult received!');
    console.log('Response structure:', JSON.stringify(resultData, null, 2).substring(0, 500));

    // Find video URL
    let videoUrl: string | undefined;
    if (resultData.video?.url) {
      videoUrl = resultData.video.url;
    } else if (resultData.data?.video?.url) {
      videoUrl = resultData.data.video.url;
    } else if (resultData.url) {
      videoUrl = resultData.url;
    }

    if (!videoUrl) {
      console.error('Could not find video URL in response');
      console.log('Full Response:', JSON.stringify(resultData, null, 2));
      return;
    }

    console.log('Video URL:', videoUrl);

    // Download video
    const outputDir = path.join(process.cwd(), 'content', 'model-comparison');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'wan25-7sec.mp4');
    console.log('Downloading to:', outputPath);

    const response = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'arraybuffer',
    });

    fs.writeFileSync(outputPath, response.data);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const fileSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);

    // WAN 2.5: $0.10/sec × 5 sec = $0.50
    const estimatedCost = 0.50;

    console.log('\n========================================');
    console.log('WAN 2.5 Generation Complete!');
    console.log('========================================');
    console.log(`  Time: ${duration}s`);
    console.log(`  Cost: ~$${estimatedCost}`);
    console.log(`  File: ${outputPath}`);
    console.log(`  Size: ${fileSize} MB`);
    console.log('\nCompare with WAN 2.5 video:');
    console.log('  WAN: https://pub-a30692f355b5421cb781d245d436d1a8.r2.dev/videos/34b34e6f-3347-4c55-b437-a1940d23238d.mp4');

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.body) {
      console.error('Details:', JSON.stringify(error.body, null, 2));
    }
  }
}

generateWithWAN().catch(console.error);
