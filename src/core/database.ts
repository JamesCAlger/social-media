import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export interface TextOverlaysRecord {
  introText: string;
  introSubtext?: string;
  segmentLabels: string[];
}

export interface ContentRecord {
  id: string;
  created_at: Date;
  idea: string;
  caption: string;
  cultural_context?: string;
  environment?: string;
  sound_concept?: string;
  text_overlays?: TextOverlaysRecord;
  status: string;
  idea_cost?: number;
  prompt_cost?: number;
  video_cost?: number;
  composition_cost?: number;
  total_cost?: number;
  reviewed_at?: Date;
  reviewed_by?: string;
  review_notes?: string;
  edited_caption?: string;
  storage_path?: string;
  final_video_path?: string;
  r2_url?: string;
  completed_at?: Date;
  posted_at?: Date;
}

export interface ProcessingLog {
  id: string;
  content_id: string;
  layer: string;
  status: 'started' | 'completed' | 'failed';
  started_at: Date;
  completed_at?: Date;
  error_message?: string;
  metadata?: any;
  cost?: number;
}

export interface TelegramInteraction {
  id: string;
  content_id: string;
  callback_query_id: string;
  callback_data: string;
  action: string;
  user_id: number;
  username: string;
  message_id: number;
  chat_id: number;
  created_at: Date;
  processed_at?: Date;
}

export class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async createContent(data: {
    idea: string;
    caption: string;
    cultural_context?: string;
    environment?: string;
    sound_concept?: string;
    text_overlays?: TextOverlaysRecord;
  }): Promise<string> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `INSERT INTO content (idea, caption, cultural_context, environment, sound_concept, text_overlays, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'generating')
         RETURNING id`,
        [
          data.idea,
          data.caption,
          data.cultural_context,
          data.environment,
          data.sound_concept,
          data.text_overlays ? JSON.stringify(data.text_overlays) : null,
        ]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async updateContent(id: string, updates: Partial<ContentRecord>): Promise<void> {
    const client = await this.getClient();
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      });

      if (fields.length === 0) return;

      await client.query(
        `UPDATE content SET ${fields.join(', ')} WHERE id = $${paramCount}`,
        [...values, id]
      );
    } finally {
      client.release();
    }
  }

  async getContent(id: string): Promise<ContentRecord | null> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM content WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async logProcessing(log: Omit<ProcessingLog, 'id' | 'started_at'>): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query(
        `INSERT INTO processing_logs (content_id, layer, status, completed_at, error_message, metadata, cost)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          log.content_id,
          log.layer,
          log.status,
          log.completed_at || null,
          log.error_message || null,
          log.metadata ? JSON.stringify(log.metadata) : null,
          log.cost || null,
        ]
      );
    } finally {
      client.release();
    }
  }

  async saveTelegramMessage(
    contentId: string,
    messageId: number,
    chatId: string | number
  ): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query(
        `UPDATE content SET telegram_message_id = $1, telegram_chat_id = $2 WHERE id = $3`,
        [messageId, chatId.toString(), contentId]
      );
    } finally {
      client.release();
    }
  }

  async saveTelegramInteraction(data: {
    content_id: string;
    callback_query_id: string;
    callback_data: string;
    action: string;
    user_id: number;
    username: string;
    message_id: number;
    chat_id: number;
  }): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query(
        `INSERT INTO telegram_interactions
         (content_id, callback_query_id, callback_data, action, user_id, username, message_id, chat_id, processed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          data.content_id,
          data.callback_query_id,
          data.callback_data,
          data.action,
          data.user_id,
          data.username,
          data.message_id,
          data.chat_id,
        ]
      );
    } finally {
      client.release();
    }
  }

  async getTelegramInteraction(query: {
    callback_query_id?: string;
    content_id?: string;
  }): Promise<TelegramInteraction | null> {
    const client = await this.getClient();
    try {
      let sql = 'SELECT * FROM telegram_interactions WHERE ';
      const params: any[] = [];
      const conditions: string[] = [];

      if (query.callback_query_id) {
        conditions.push(`callback_query_id = $${params.length + 1}`);
        params.push(query.callback_query_id);
      }

      if (query.content_id) {
        conditions.push(`content_id = $${params.length + 1}`);
        params.push(query.content_id);
      }

      if (conditions.length === 0) {
        throw new Error('At least one query parameter is required');
      }

      sql += conditions.join(' AND ');

      const result = await client.query(sql, params);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
