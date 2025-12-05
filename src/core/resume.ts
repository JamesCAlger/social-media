import { Database } from './database';
import { logger } from './logger';

export class PipelineResume {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  async getLastFailedContent(): Promise<string | null> {
    const client = await this.db.getClient();
    try {
      const result = await client.query(`
        SELECT id, status
        FROM content
        WHERE status = 'failed'
        ORDER BY created_at DESC
        LIMIT 1
      `);

      return result.rows[0]?.id || null;
    } finally {
      client.release();
    }
  }

  async getContentStatus(contentId: string): Promise<{
    status: string;
    lastCompletedLayer: string | null;
  }> {
    const content = await this.db.getContent(contentId);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const client = await this.db.getClient();
    try {
      const logsResult = await client.query(
        `SELECT layer FROM processing_logs
         WHERE content_id = $1 AND status = 'completed'
         ORDER BY completed_at DESC
         LIMIT 1`,
        [contentId]
      );

      return {
        status: content.status,
        lastCompletedLayer: logsResult.rows[0]?.layer || null,
      };
    } finally {
      client.release();
    }
  }
}
