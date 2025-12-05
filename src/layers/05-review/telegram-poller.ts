import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Database } from '../../core/database';
import { logger } from '../../core/logger';

interface TelegramUpdate {
  update_id: number;
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message: {
      message_id: number;
      chat: {
        id: number;
      };
      text: string;
    };
    data: string;
  };
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text: string;
  };
}

interface CallbackData {
  action: 'approve' | 'reject' | 'edit';
  contentId: string;
}

export class TelegramPoller {
  private botToken: string;
  private database: Database;
  private apiUrl: string;
  private offset: number = 0;
  private isRunning: boolean = false;
  private authorizedChatIds: number[];
  private lockFile: string;

  constructor(botToken: string, database: Database, authorizedChatIds?: number[]) {
    this.botToken = botToken;
    this.database = database;
    this.apiUrl = `https://api.telegram.org/bot${botToken}`;
    this.authorizedChatIds = authorizedChatIds || [];
    this.lockFile = path.join(process.cwd(), '.telegram-poller.lock');

    // Check for existing lock file
    this.checkLock();

    // Create lock file with current process ID
    this.createLock();
  }

  /**
   * Checks if a lock file exists (another poller instance is running)
   */
  private checkLock(): void {
    if (fs.existsSync(this.lockFile)) {
      const lockContent = fs.readFileSync(this.lockFile, 'utf-8');
      const lockData = JSON.parse(lockContent);

      logger.error('Telegram poller lock file exists', {
        pid: lockData.pid,
        startTime: lockData.startTime,
      });

      throw new Error(
        `❌ Telegram poller already running!\n` +
        `   PID: ${lockData.pid}\n` +
        `   Started: ${new Date(lockData.startTime).toLocaleString()}\n\n` +
        `If this is an error (poller crashed):\n` +
        `   - Delete the lock file: ${this.lockFile}\n` +
        `   - Or run: npm run clean-poller-lock\n`
      );
    }
  }

  /**
   * Creates a lock file to prevent multiple instances
   */
  private createLock(): void {
    const lockData = {
      pid: process.pid,
      startTime: new Date().toISOString(),
    };

    fs.writeFileSync(this.lockFile, JSON.stringify(lockData, null, 2));
    logger.info('Created poller lock file', { lockFile: this.lockFile, pid: process.pid });
  }

  /**
   * Removes the lock file
   */
  private removeLock(): void {
    if (fs.existsSync(this.lockFile)) {
      fs.unlinkSync(this.lockFile);
      logger.info('Removed poller lock file', { lockFile: this.lockFile });
    }
  }

  /**
   * Starts the long polling loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Telegram poller already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Telegram poller');

    while (this.isRunning) {
      try {
        const updates = await this.getUpdates();

        for (const update of updates) {
          await this.handleUpdate(update);
          this.offset = update.update_id + 1;
        }
      } catch (error) {
        logger.error('Error in Telegram polling loop', { error });
        // Wait before retrying
        await this.sleep(5000);
      }
    }
  }

  /**
   * Stops the polling loop
   */
  stop(): void {
    logger.info('Stopping Telegram poller');
    this.isRunning = false;
    this.removeLock();
  }

  /**
   * Gets updates from Telegram using long polling
   */
  private async getUpdates(): Promise<TelegramUpdate[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/getUpdates`, {
        params: {
          offset: this.offset,
          timeout: 30, // Long polling timeout (30 seconds)
          allowed_updates: ['callback_query', 'message'],
        },
      });

      return response.data.result || [];
    } catch (error) {
      // Handle 409 Conflict specifically - another poller is running
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        logger.error(
          '⚠️  HTTP 409 CONFLICT: Another Telegram poller instance is running!',
          {
            error: error.response?.data,
            offset: this.offset,
          }
        );

        console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ CRITICAL ERROR: Multiple Poller Instances Detected!');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.error('Telegram Bot API returns HTTP 409 when multiple pollers');
        console.error('try to get updates simultaneously.\n');
        console.error('Actions:');
        console.error('  1. Stop ALL poller instances');
        console.error('  2. Wait 5 seconds');
        console.error('  3. Start only ONE poller instance\n');
        console.error('Commands:');
        console.error('  Windows: taskkill /IM node.exe /F');
        console.error('  Unix:    pkill -f telegram-poller\n');

        // Clean up lock file and exit
        this.removeLock();
        process.exit(1);
      }

      // Handle other errors
      logger.error('Failed to get Telegram updates', { error });
      return [];
    }
  }

  /**
   * Handles a single Telegram update
   */
  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    try {
      // Handle callback queries (button presses)
      if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      }

      // Handle regular messages (for future features like text responses)
      if (update.message) {
        await this.handleMessage(update.message);
      }
    } catch (error) {
      logger.error('Error handling Telegram update', { error, update });
    }
  }

  /**
   * Handles callback queries from inline keyboard buttons
   */
  private async handleCallbackQuery(callbackQuery: any): Promise<void> {
    const { id: queryId, data, from, message } = callbackQuery;

    logger.info('Received callback query', {
      queryId,
      data,
      from: from.username || from.first_name,
      chatId: from.id,
    });

    // Check authorization
    if (this.authorizedChatIds.length > 0 && !this.authorizedChatIds.includes(from.id)) {
      logger.warn('Unauthorized callback query attempt', {
        userId: from.id,
        username: from.username,
      });
      await this.answerCallbackQuery(queryId, '❌ Unauthorized');
      return;
    }

    let hasAnswered = false;

    try {
      // Parse callback data
      const callbackData = this.parseCallbackData(data);

      // Check if already processed (prevent duplicate processing)
      const existing = await this.database.getTelegramInteraction({
        callback_query_id: queryId,
      });

      if (existing) {
        logger.warn('Duplicate callback query, ignoring', { queryId });
        // Don't answer - it was already answered when first processed
        return;
      }

      // Save interaction to database
      await this.database.saveTelegramInteraction({
        content_id: callbackData.contentId,
        callback_query_id: queryId,
        callback_data: data,
        action: callbackData.action,
        user_id: from.id,
        username: from.username || from.first_name,
        message_id: message.message_id,
        chat_id: from.id,
      });

      // Process the action
      await this.processAction(callbackData, from);

      // Answer callback query (removes loading state)
      await this.answerCallbackQuery(queryId, this.getActionMessage(callbackData.action));
      hasAnswered = true;

      // Edit the original message to show the decision
      await this.editMessage(
        message.chat.id,
        message.message_id,
        this.getUpdatedMessage(message.text, callbackData.action, from.first_name)
      );
    } catch (error) {
      logger.error('Error processing callback query', { error, queryId });

      // Only try to answer if we haven't already
      if (!hasAnswered) {
        await this.answerCallbackQuery(queryId, '❌ Error processing action');
      }
    }
  }

  /**
   * Handles regular text messages
   */
  private async handleMessage(message: any): Promise<void> {
    const { text, from, chat } = message;

    // Log for debugging
    logger.debug('Received message', {
      text,
      from: from.username || from.first_name,
      chatId: chat.id,
    });

    // Handle /start command to get chat ID
    if (text === '/start') {
      await this.sendMessage(
        chat.id,
        `👋 Hello ${from.first_name}!\n\n` +
          `Your Chat ID: \`${chat.id}\`\n\n` +
          `Use this ID in your .env file:\n` +
          `TELEGRAM_CHAT_ID=${chat.id}`
      );
    }
  }

  /**
   * Processes the approval/rejection action
   */
  private async processAction(
    callbackData: CallbackData,
    from: any
  ): Promise<void> {
    const { action, contentId } = callbackData;

    logger.info('Processing action', { action, contentId, userId: from.id });

    switch (action) {
      case 'approve':
        await this.handleApproval(contentId, from);
        break;
      case 'reject':
        await this.handleRejection(contentId, from);
        break;
      case 'edit':
        await this.handleEditRequest(contentId, from);
        break;
      default:
        logger.warn('Unknown action', { action });
    }
  }

  /**
   * Handles content approval
   */
  private async handleApproval(contentId: string, from: any): Promise<void> {
    logger.info('Approving content', { contentId, userId: from.id });

    await this.database.updateContent(contentId, {
      status: 'approved',
      reviewed_by: from.username || from.first_name,
      reviewed_at: new Date(),
      review_notes: 'Approved via Telegram',
    });

    logger.info('Content approved', { contentId });
  }

  /**
   * Handles content rejection
   */
  private async handleRejection(contentId: string, from: any): Promise<void> {
    logger.info('Rejecting content', { contentId, userId: from.id });

    await this.database.updateContent(contentId, {
      status: 'rejected',
      reviewed_by: from.username || from.first_name,
      reviewed_at: new Date(),
      review_notes: 'Rejected via Telegram',
    });

    logger.info('Content rejected', { contentId });
  }

  /**
   * Handles edit caption request
   */
  private async handleEditRequest(contentId: string, from: any): Promise<void> {
    logger.info('Edit request received', { contentId, userId: from.id });

    // For now, just send a message to indicate editing is not yet implemented
    // In the future, this could trigger a conversation flow
    await this.sendMessage(
      from.id,
      '✏️ Caption editing is not yet implemented.\n\n' +
        'For now, please approve or reject the content as-is.\n' +
        'Manual editing can be done before distribution.'
    );
  }

  /**
   * Parses callback data from button press
   */
  private parseCallbackData(data: string): CallbackData {
    const parts = data.split(':');
    if (parts.length < 2) {
      throw new Error(`Invalid callback data format: ${data}`);
    }

    const action = parts[0] as 'approve' | 'reject' | 'edit';
    const contentId = parts[1];

    if (!['approve', 'reject', 'edit'].includes(action)) {
      throw new Error(`Unknown action: ${action}`);
    }

    return { action, contentId };
  }

  /**
   * Answers a callback query
   */
  private async answerCallbackQuery(
    callbackQueryId: string,
    text?: string
  ): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/answerCallbackQuery`, {
        callback_query_id: callbackQueryId,
        text,
      });
    } catch (error: any) {
      // 400 errors are expected when callback query is already answered or expired
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        logger.debug('Callback query already answered or expired', {
          callbackQueryId,
          errorMessage: error.response?.data?.description
        });
      } else {
        logger.error('Failed to answer callback query', { error });
      }
    }
  }

  /**
   * Edits a message text
   */
  private async editMessage(
    chatId: number,
    messageId: number,
    newText: string
  ): Promise<void> {
    try {
      // Remove parse_mode to avoid issues with special characters in paths
      await axios.post(`${this.apiUrl}/editMessageText`, {
        chat_id: chatId,
        message_id: messageId,
        text: newText,
      });
    } catch (error: any) {
      // Log detailed error info for debugging
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        logger.debug('Failed to edit message (400 error)', {
          errorDescription: error.response?.data?.description,
          messageId,
        });
      } else {
        logger.error('Failed to edit message', { error });
      }
    }
  }

  /**
   * Sends a simple text message
   */
  private async sendMessage(chatId: number, text: string): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      });
    } catch (error) {
      logger.error('Failed to send message', { error });
    }
  }

  /**
   * Gets the message to show in the callback query response
   */
  private getActionMessage(action: string): string {
    switch (action) {
      case 'approve':
        return '✅ Approved!';
      case 'reject':
        return '❌ Rejected!';
      case 'edit':
        return '✏️ Edit requested';
      default:
        return 'Action processed';
    }
  }

  /**
   * Updates the original message text to show the decision
   */
  private getUpdatedMessage(
    originalText: string,
    action: string,
    reviewerName: string
  ): string {
    const actionEmoji = action === 'approve' ? '✅' : '❌';
    const actionText = action === 'approve' ? 'APPROVED' : 'REJECTED';

    return `${originalText}\n\n━━━━━━━━━━━━━━━━━━\n${actionEmoji} *${actionText}* by ${reviewerName}\n━━━━━━━━━━━━━━━━━━`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
