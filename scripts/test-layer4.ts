import dotenv from 'dotenv';
import { Database } from '../src/core/database';
import { CompositionLayer } from '../src/layers/04-composition';
import { logger } from '../src/core/logger';
import { getConfig } from '../src/config';
import { createStorage } from '../src/core/storage';

dotenv.config();

const CONTENT_ID = '24ad4a85-c303-4041-a957-cd847a1ff8ff';

async function testLayer4() {
  logger.info('Testing Layer 4: Composition (using existing videos)');

  const db = new Database();
  const storage = createStorage();
  const config = getConfig();

  try {
    // Load the videos.json from Layer 3
    const videoOutput = await storage.getJSON<any>(`${CONTENT_ID}/videos.json`);

    logger.info('Loaded Layer 3 output', {
      contentId: videoOutput.contentId,
      videoCount: videoOutput.videos.length,
    });

    // Run Layer 4: Composition
    const compositionLayer = new CompositionLayer(db);
    const result = await compositionLayer.execute(videoOutput, config);

    logger.info('✅ Layer 4 completed successfully!', {
      finalVideoPath: result.finalVideo.storagePath,
      duration: result.finalVideo.duration,
      fileSize: result.finalVideo.fileSize,
    });

    console.log('\n🎉 SUCCESS!');
    console.log(`Final video saved to: ${result.finalVideo.storagePath}`);
    console.log(`Duration: ${result.finalVideo.duration} seconds`);
    console.log(`File size: ${(result.finalVideo.fileSize / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    logger.error('❌ Layer 4 test failed', { error });
    console.error('\nError:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

testLayer4();
