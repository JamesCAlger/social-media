import axios from 'axios';
import { CompositionOutput, IdeaOutput } from '../../core/types';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { Database } from '../../core/database';

export class SlackReviewChannel {
  private webhookUrl: string;
  private storage = createStorage();
  private database: Database;

  constructor(webhookUrl: string, database: Database) {
    this.webhookUrl = webhookUrl;
    this.database = database;
  }

  async sendReviewRequest(
    idea: IdeaOutput,
    composition: CompositionOutput
  ): Promise<void> {
    logger.info('Sending review request to Slack', { contentId: idea.id });

    const videoUrl = this.storage.getFullPath(composition.finalVideo.storagePath);

    const message = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'New Content Ready for Review',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Content ID:*\n${idea.id}`,
            },
            {
              type: 'mrkdwn',
              text: `*Created:*\n${new Date(idea.timestamp).toLocaleString()}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Idea:*\n${idea.idea}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Caption:*\n${idea.caption}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Cultural Context:*\n${idea.culturalContext}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Video:*\nFile: \`${videoUrl}\`\nDuration: ${composition.finalVideo.duration}s\nSize: ${(composition.finalVideo.fileSize / 1024 / 1024).toFixed(2)} MB`,
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Approve',
              },
              style: 'primary',
              value: `approve_${idea.id}`,
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Reject',
              },
              style: 'danger',
              value: `reject_${idea.id}`,
            },
          ],
        },
      ],
    };

    await axios.post(this.webhookUrl, message);
    logger.info('Review request sent to Slack');
  }

  async waitForReview(contentId: string, timeoutMs: number = 86400000): Promise<{
    decision: 'approved' | 'rejected';
    reviewedBy: string;
    notes?: string;
  }> {
    logger.info('Waiting for human review', { contentId, timeoutMs });

    // Mark content as pending review
    await this.database.updateContent(contentId, { status: 'review_pending' });

    // Poll database for review decision
    const startTime = Date.now();
    const pollInterval = 10000; // 10 seconds

    return new Promise((resolve, reject) => {
      const checkReview = async () => {
        const content = await this.database.getContent(contentId);

        if (content?.status === 'approved') {
          resolve({
            decision: 'approved',
            reviewedBy: content.reviewed_by || 'Unknown',
            notes: content.review_notes,
          });
          return;
        }

        if (content?.status === 'rejected') {
          resolve({
            decision: 'rejected',
            reviewedBy: content.reviewed_by || 'Unknown',
            notes: content.review_notes,
          });
          return;
        }

        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Review timeout exceeded'));
          return;
        }

        // Continue polling
        setTimeout(checkReview, pollInterval);
      };

      checkReview();
    });
  }
}
