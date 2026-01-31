import 'dotenv/config';
import { ReviewLayer } from '../src/layers/05-review';
import { Database } from '../src/core/database';

async function sendForReview() {
  const contentId = process.argv[2];
  const accountSlug = process.argv[3] || 'cutting_fruits_asmr';

  if (!contentId) {
    console.error('Usage: npx tsx scripts/send-for-review.ts <contentId> [accountSlug]');
    process.exit(1);
  }

  const db = new Database();

  try {
    // Get the content
    const content = await db.getContent(contentId);
    if (!content) {
      console.error('Content not found:', contentId);
      process.exit(1);
    }

    console.log('Content found:');
    console.log('  Idea:', content.idea?.substring(0, 60) + '...');
    console.log('  R2 URL:', content.r2Url);
    console.log('  Caption:', content.caption?.substring(0, 50) + '...');

    const reviewLayer = new ReviewLayer(db);

    console.log('\nSending to Telegram for review...');

    // Send to Telegram for review
    const result = await reviewLayer.execute({
      contentId,
      videoPath: content.r2Url || content.finalVideoPath || '',
      caption: content.caption || '',
      accountSlug
    });

    console.log('\nSent to Telegram!');
    console.log('Status:', result.status);

    if (result.status === 'approved') {
      console.log('Content approved - ready for distribution');
    } else {
      console.log('Waiting for approval in Telegram...');
    }
  } finally {
    await db.close();
  }
}

sendForReview().catch(console.error);
