/**
 * Educational Content Repository
 *
 * Database operations for the educational content pipeline.
 */

import { Pool, PoolClient } from 'pg';
import { Script, QualityScores, SafetyFlag } from '../agents/types';

// ============================================================================
// Types
// ============================================================================

export interface EducationalContentRecord {
  id: string;
  niche: string;
  topic_category: string | null;
  topic: string | null;
  status: EducationalContentStatus;
  research_data: any | null;
  initial_script: Script | null;
  final_script: Script | null;
  iterations_needed: number;
  quality_score: number | null;
  hook_score: number | null;
  pacing_score: number | null;
  unique_angle_score: number | null;
  engagement_score: number | null;
  clarity_score: number | null;
  critique_data: any | null;
  assets: any | null;
  audio: any | null;
  video_local_path: string | null;
  video_r2_url: string | null;
  duration: number | null;
  file_size_bytes: number | null;
  total_cost: number;
  cost_breakdown: any | null;
  safety_flags: SafetyFlag[] | null;
  requires_extra_review: boolean;
  review_priority: 'high' | 'medium' | 'low';
  telegram_message_id: string | null;
  telegram_chat_id: string | null;
  approved_at: Date | null;
  approved_by: string | null;
  rejected_at: Date | null;
  rejection_reason: string | null;
  ab_test_id: string | null;
  is_variant_a: boolean | null;
  instagram_post_id: string | null;
  instagram_post_url: string | null;
  created_at: Date;
  updated_at: Date;
  posted_at: Date | null;
}

export type EducationalContentStatus =
  | 'generating'
  | 'researching'
  | 'scripting'
  | 'critiquing'
  | 'refining'
  | 'asset_generation'
  | 'audio_generation'
  | 'composing'
  | 'safety_check'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'posting'
  | 'posted'
  | 'failed';

export interface EducationalPerformanceRecord {
  id: string;
  content_id: string;
  views: number;
  likes: number;
  saves: number;
  shares: number;
  reach: number;
  profile_visits: number;
  three_second_retention: number | null;
  average_watch_time: number | null;
  completion_rate: number | null;
  replay_rate: number | null;
  save_rate: number | null;
  share_rate: number | null;
  engagement_rate: number | null;
  hook_style: string | null;
  topic_category: string | null;
  visual_style: string | null;
  has_number_in_hook: boolean | null;
  energy_level: string | null;
  first_recorded_at: Date;
  last_updated_at: Date;
}

export interface TopicCategoryRecord {
  id: string;
  niche: string;
  name: string;
  description: string | null;
  weight: number;
  best_days: string[] | null;
  examples: string[] | null;
  post_count: number;
  avg_save_rate: number | null;
  avg_share_rate: number | null;
  avg_completion_rate: number | null;
  performance_score: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface ABTestRecord {
  id: string;
  test_id: string;
  variable: string;
  topic: string;
  hypothesis: string | null;
  variant_a_content_id: string | null;
  variant_a_description: string | null;
  variant_a_value: string | null;
  variant_a_posted_at: Date | null;
  variant_b_content_id: string | null;
  variant_b_description: string | null;
  variant_b_value: string | null;
  variant_b_posted_at: Date | null;
  status: string;
  winner: 'A' | 'B' | 'tie' | null;
  percent_difference: number | null;
  confidence: 'high' | 'medium' | 'low' | null;
  learning: string | null;
  results_data: any | null;
  created_at: Date;
  completed_at: Date | null;
}

// ============================================================================
// Repository
// ============================================================================

export class EducationalRepository {
  constructor(private pool: Pool) {}

  private async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  // --------------------------------------------------------------------------
  // Educational Content CRUD
  // --------------------------------------------------------------------------

  async createContent(data: {
    niche?: string;
    topic_category?: string;
    topic?: string;
  }): Promise<string> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `INSERT INTO educational_content (niche, topic_category, topic, status)
         VALUES ($1, $2, $3, 'generating')
         RETURNING id`,
        [data.niche || 'finance', data.topic_category || null, data.topic || null]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async getContent(id: string): Promise<EducationalContentRecord | null> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM educational_content WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async updateContent(
    id: string,
    updates: Partial<Omit<EducationalContentRecord, 'id' | 'created_at'>>
  ): Promise<void> {
    const client = await this.getClient();
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        // Handle JSONB fields
        if (['research_data', 'initial_script', 'final_script', 'critique_data',
             'assets', 'audio', 'cost_breakdown', 'safety_flags'].includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value ? JSON.stringify(value) : null);
        } else {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      });

      if (fields.length === 0) return;

      await client.query(
        `UPDATE educational_content SET ${fields.join(', ')} WHERE id = $${paramCount}`,
        [...values, id]
      );
    } finally {
      client.release();
    }
  }

  async updateStatus(id: string, status: EducationalContentStatus): Promise<void> {
    await this.updateContent(id, { status });
  }

  async getRecentContent(options: {
    niche?: string;
    status?: EducationalContentStatus;
    limit?: number;
  } = {}): Promise<EducationalContentRecord[]> {
    const client = await this.getClient();
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramCount = 1;

      if (options.niche) {
        conditions.push(`niche = $${paramCount++}`);
        params.push(options.niche);
      }
      if (options.status) {
        conditions.push(`status = $${paramCount++}`);
        params.push(options.status);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limit = options.limit || 50;

      const result = await client.query(
        `SELECT * FROM educational_content ${whereClause}
         ORDER BY created_at DESC LIMIT $${paramCount}`,
        [...params, limit]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getContentByCategory(
    category: string,
    limit: number = 10
  ): Promise<EducationalContentRecord[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM educational_content
         WHERE topic_category = $1
         ORDER BY created_at DESC LIMIT $2`,
        [category, limit]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getRecentTopics(niche: string, limit: number = 20): Promise<string[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT topic FROM educational_content
         WHERE niche = $1 AND topic IS NOT NULL
         ORDER BY created_at DESC LIMIT $2`,
        [niche, limit]
      );
      return result.rows.map(r => r.topic);
    } finally {
      client.release();
    }
  }

  // --------------------------------------------------------------------------
  // Topic Categories
  // --------------------------------------------------------------------------

  async getTopicCategories(niche: string): Promise<TopicCategoryRecord[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM topic_categories WHERE niche = $1 ORDER BY weight DESC`,
        [niche]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getTopicCategory(id: string): Promise<TopicCategoryRecord | null> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM topic_categories WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async updateCategoryWeight(id: string, weight: number): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query(
        'UPDATE topic_categories SET weight = $1 WHERE id = $2',
        [weight, id]
      );
    } finally {
      client.release();
    }
  }

  async incrementCategoryPostCount(id: string): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query(
        'UPDATE topic_categories SET post_count = post_count + 1 WHERE id = $1',
        [id]
      );
    } finally {
      client.release();
    }
  }

  async updateCategoryPerformance(
    id: string,
    metrics: {
      avg_save_rate?: number;
      avg_share_rate?: number;
      avg_completion_rate?: number;
      performance_score?: number;
    }
  ): Promise<void> {
    const client = await this.getClient();
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(metrics).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCount++}`);
          values.push(value);
        }
      });

      if (fields.length === 0) return;

      await client.query(
        `UPDATE topic_categories SET ${fields.join(', ')} WHERE id = $${paramCount}`,
        [...values, id]
      );
    } finally {
      client.release();
    }
  }

  // --------------------------------------------------------------------------
  // Performance Tracking
  // --------------------------------------------------------------------------

  async createOrUpdatePerformance(
    contentId: string,
    metrics: Partial<Omit<EducationalPerformanceRecord, 'id' | 'content_id' | 'first_recorded_at'>>
  ): Promise<void> {
    const client = await this.getClient();
    try {
      // Use upsert
      const fields = Object.keys(metrics);
      const values = Object.values(metrics);

      const insertFields = ['content_id', ...fields];
      const insertPlaceholders = insertFields.map((_, i) => `$${i + 1}`);
      const updateClauses = fields.map((f, i) => `${f} = $${i + 2}`);

      await client.query(
        `INSERT INTO educational_performance (${insertFields.join(', ')}, last_updated_at)
         VALUES (${insertPlaceholders.join(', ')}, NOW())
         ON CONFLICT (content_id)
         DO UPDATE SET ${updateClauses.join(', ')}, last_updated_at = NOW()`,
        [contentId, ...values]
      );
    } finally {
      client.release();
    }
  }

  async getPerformance(contentId: string): Promise<EducationalPerformanceRecord | null> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM educational_performance WHERE content_id = $1',
        [contentId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getPerformanceByCategory(
    category: string,
    limit: number = 50
  ): Promise<EducationalPerformanceRecord[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM educational_performance
         WHERE topic_category = $1
         ORDER BY first_recorded_at DESC LIMIT $2`,
        [category, limit]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  // --------------------------------------------------------------------------
  // A/B Testing
  // --------------------------------------------------------------------------

  async createABTest(data: {
    test_id: string;
    variable: string;
    topic: string;
    hypothesis?: string;
  }): Promise<string> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `INSERT INTO ab_tests (test_id, variable, topic, hypothesis, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING id`,
        [data.test_id, data.variable, data.topic, data.hypothesis || null]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async getABTest(testId: string): Promise<ABTestRecord | null> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM ab_tests WHERE test_id = $1',
        [testId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async updateABTest(
    testId: string,
    updates: Partial<Omit<ABTestRecord, 'id' | 'test_id' | 'created_at'>>
  ): Promise<void> {
    const client = await this.getClient();
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'results_data') {
          fields.push(`${key} = $${paramCount++}`);
          values.push(value ? JSON.stringify(value) : null);
        } else {
          fields.push(`${key} = $${paramCount++}`);
          values.push(value);
        }
      });

      if (fields.length === 0) return;

      await client.query(
        `UPDATE ab_tests SET ${fields.join(', ')} WHERE test_id = $${paramCount}`,
        [...values, testId]
      );
    } finally {
      client.release();
    }
  }

  async getRunningABTests(): Promise<ABTestRecord[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM ab_tests WHERE status IN ('pending', 'variant_a_posted', 'running')
         ORDER BY created_at DESC`
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  // --------------------------------------------------------------------------
  // Prompt History
  // --------------------------------------------------------------------------

  async logPromptChange(data: {
    agent_name: string;
    prompt_section: string;
    previous_text?: string;
    new_text: string;
    reasoning?: string;
    data_points_used?: number;
    confidence?: string;
    triggered_by?: string;
  }): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query(
        `INSERT INTO prompt_history
         (agent_name, prompt_section, previous_text, new_text, reasoning, data_points_used, confidence, triggered_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          data.agent_name,
          data.prompt_section,
          data.previous_text || null,
          data.new_text,
          data.reasoning || null,
          data.data_points_used || null,
          data.confidence || null,
          data.triggered_by || null
        ]
      );
    } finally {
      client.release();
    }
  }

  async getPromptHistory(
    agentName: string,
    limit: number = 10
  ): Promise<any[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM prompt_history
         WHERE agent_name = $1
         ORDER BY created_at DESC LIMIT $2`,
        [agentName, limit]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
}
