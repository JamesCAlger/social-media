import { Database } from '../src/core/database';
import dotenv from 'dotenv';

dotenv.config();

async function reviewContent() {
  const db = new Database();

  const contentId = process.argv[2];
  const decision = process.argv[3] as 'approve' | 'reject';
  const reviewedBy = process.argv[4] || 'Manual';
  const notes = process.argv[5];

  if (!contentId || !decision) {
    console.error('Usage: ts-node scripts/review-content.ts <contentId> <approve|reject> [reviewedBy] [notes]');
    process.exit(1);
  }

  if (decision !== 'approve' && decision !== 'reject') {
    console.error('Decision must be "approve" or "reject"');
    process.exit(1);
  }

  const status = decision === 'approve' ? 'approved' : 'rejected';

  await db.updateContent(contentId, {
    status,
    reviewed_at: new Date(),
    reviewed_by: reviewedBy,
    review_notes: notes,
  });

  console.log(`Content ${contentId} ${status} by ${reviewedBy}`);

  await db.close();
}

reviewContent();
