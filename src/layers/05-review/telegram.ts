import axios from 'axios';
import { CompositionOutput, IdeaOutput } from '../../core/types';
import { createStorage } from '../../core/storage';
import { logger } from '../../core/logger';
import { Database } from '../../core/database';

interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  reply_markup?: {
    inline_keyboard: InlineKeyboardButton[][];
  };
}

interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export class TelegramProvider {
  private botToken: string;
  private chatId: string | number;
  private storage = createStorage();
  private database: Database;
  private apiUrl: string;

  constructor(botToken: string, chatId: string | number, database: Database) {
    this.botToken = botToken;
    this.chatId = chatId;
    this.database = database;
    this.apiUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * Sends a review request to Telegram with inline buttons
   */
  async sendReviewRequest(
    idea: IdeaOutput,
    composition: CompositionOutput
  ): Promise<number> {
    logger.info('Sending review request to Telegram', { contentId: idea.id });

    const videoPath = this.storage.getFullPath(composition.finalVideo.storagePath);
    const message = this.formatReviewMessage(idea, composition, videoPath);

    try {
      // Send message with inline keyboard
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: this.buildInlineKeyboard(idea.id),
      });

      const messageId = response.data.result.message_id;
      logger.info('Review request sent to Telegram', {
        contentId: idea.id,
        messageId,
      });

      // Save message ID to database for tracking
      await this.database.saveTelegramMessage(idea.id, messageId, this.chatId);

      return messageId;
    } catch (error) {
      logger.error('Failed to send Telegram message', { error });
      throw new Error(
        `Failed to send Telegram message: ${(error as any).response?.data?.description || (error as Error).message}`
      );
    }
  }

  /**
   * Formats the review message with content details
   */
  private formatReviewMessage(
    idea: IdeaOutput,
    composition: CompositionOutput,
    videoPath: string
  ): string {
    const createdDate = new Date(idea.timestamp).toLocaleString();
    const fileSizeMB = (composition.finalVideo.fileSize / 1024 / 1024).toFixed(2);

    return `🎬 *New Content Ready for Review*

📋 *Content ID:* \`${idea.id}\`
📅 *Created:* ${createdDate}

💡 *Idea:*
${idea.idea}

📝 *Caption:*
${idea.caption}

🌍 *Cultural Context:*
${idea.culturalContext}

🎥 *Video Details:*
• Duration: ${composition.finalVideo.duration}s
• Size: ${fileSizeMB} MB
• Path: \`${videoPath}\`

👇 *Choose an action below:*`;
  }

  /**
   * Builds inline keyboard with Approve/Reject/Edit buttons
   */
  private buildInlineKeyboard(contentId: string): {
    inline_keyboard: InlineKeyboardButton[][];
  } {
    return {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `approve:${contentId}` },
          { text: '❌ Reject', callback_data: `reject:${contentId}` },
        ],
        [{ text: '✏️ Edit Caption', callback_data: `edit:${contentId}` }],
      ],
    };
  }

  /**
   * Waits for review decision by polling the database
   * Similar to Slack implementation - database is updated by the polling service
   */
  async waitForReview(
    contentId: string,
    timeoutMs: number = 86400000
  ): Promise<{
    decision: 'approved' | 'rejected';
    reviewedBy: string;
    notes?: string;
  }> {
    logger.info('Waiting for Telegram review', { contentId, timeoutMs });

    // Mark content as pending review
    await this.database.updateContent(contentId, { status: 'review_pending' });

    // Poll database for review decision
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds (faster than Slack)

    return new Promise((resolve, reject) => {
      const checkReview = async () => {
        try {
          const content = await this.database.getContent(contentId);

          if (content?.status === 'approved') {
            resolve({
              decision: 'approved',
              reviewedBy: content.reviewed_by || 'Telegram User',
              notes: content.review_notes,
            });
            return;
          }

          if (content?.status === 'rejected') {
            resolve({
              decision: 'rejected',
              reviewedBy: content.reviewed_by || 'Telegram User',
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
        } catch (error) {
          logger.error('Error checking review status', { error, contentId });
          reject(error);
        }
      };

      checkReview();
    });
  }

  /**
   * Edits a message after it's been sent (e.g., to show approval status)
   */
  async editMessage(
    messageId: number,
    newText: string
  ): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/editMessageText`, {
        chat_id: this.chatId,
        message_id: messageId,
        text: newText,
        parse_mode: 'Markdown',
      });
      logger.debug('Telegram message edited', { messageId });
    } catch (error) {
      logger.error('Failed to edit Telegram message', { error, messageId });
    }
  }

  /**
   * Answers a callback query (removes loading state from button)
   */
  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string
  ): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/answerCallbackQuery`, {
        callback_query_id: callbackQueryId,
        text,
      });
    } catch (error) {
      logger.error('Failed to answer callback query', { error });
    }
  }

  /**
   * Sends a simple text message (for notifications, reminders, etc.)
   */
  async sendMessage(text: string): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: this.chatId,
        text,
        parse_mode: 'Markdown',
      });
      logger.debug('Telegram message sent', { text: text.substring(0, 50) });
    } catch (error) {
      logger.error('Failed to send Telegram message', { error });
      throw error;
    }
  }

  /**
   * Tests connection to Telegram bot
   */
  async testConnection(): Promise<{
    ok: boolean;
    botInfo?: any;
    error?: string;
  }> {
    try {
      const response = await axios.get(`${this.apiUrl}/getMe`);
      return {
        ok: true,
        botInfo: response.data.result,
      };
    } catch (error) {
      return {
        ok: false,
        error: (error as any).response?.data?.description || (error as Error).message,
      };
    }
  }
}
