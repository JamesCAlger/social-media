/**
 * Research Agent
 *
 * Researches topics and generates content ideas for educational videos.
 * Uses internal performance data and LLM to find high-potential topics.
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../core/logger';
import { retry } from '../../utils/retry';
import { EducationalRepository, TopicCategoryRecord } from '../../core/educational-repository';
import {
  ResearchInput,
  ResearchInputSchema,
  ResearchOutput,
  ResearchOutputSchema,
  TopicSuggestion
} from './schema';

// ============================================================================
// Configuration
// ============================================================================

interface ResearchAgentConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
}

// ============================================================================
// Prompts
// ============================================================================

function buildSystemPrompt(niche: string): string {
  return `You are a world-class content strategist specializing in short-form educational videos for Instagram Reels in the ${niche} niche.

Your job is to identify high-potential topics that will:
1. Hook viewers in the first 3 seconds (curiosity gap, pattern interrupt, or contrarian angle)
2. Deliver genuine value in 30 seconds
3. Be save-worthy (viewers save for later reference)
4. Be share-worthy (viewers send to friends)

You understand what makes content go viral:
- Contrarian takes that challenge conventional wisdom
- Specific numbers and surprising statistics
- "I did X so you don't have to" angles
- Myth-busting content that makes people feel smart
- Emotional triggers: outrage at being lied to, relief at finding truth, excitement at opportunity

You NEVER suggest:
- Generic advice everyone already knows
- Topics that require more than 30 seconds to explain
- Overly complex financial products
- Anything that sounds like financial advice (must be educational only)
- Political or divisive topics

Output your response as valid JSON.`;
}

function buildUserPrompt(
  category: TopicCategoryRecord,
  recentTopics: string[],
  performanceInsights: string
): string {
  const recentTopicsSection = recentTopics.length > 0
    ? `\nRECENT TOPICS TO AVOID (already covered):\n${recentTopics.map(t => `- ${t}`).join('\n')}`
    : '';

  const performanceSection = performanceInsights
    ? `\nPERFORMANCE INSIGHTS FROM PAST CONTENT:\n${performanceInsights}`
    : '';

  return `Generate 3 high-potential topic suggestions for the "${category.name}" category.

CATEGORY DESCRIPTION: ${category.description || 'General topics in this category'}

EXAMPLE TOPICS IN THIS CATEGORY:
${(category.examples || []).map(e => `- ${e}`).join('\n')}
${recentTopicsSection}
${performanceSection}

For each topic, provide:
1. The specific topic/angle (not generic)
2. Why NOW is a good time for this topic
3. What existing content misses (competitor gap)
4. Your unique suggested angle
5. The primary emotional trigger
6. 3-5 potential hook variations
7. Your confidence score (0-100)

Return exactly 3 topic suggestions as JSON in this format:
{
  "topics": [
    {
      "topic": "specific topic description",
      "whyNow": "timeliness factor",
      "competitorGap": "what existing content misses",
      "suggestedAngle": "our unique take",
      "emotionalTrigger": "curiosity|outrage|surprise|aspiration|fear",
      "potentialHooks": ["hook 1", "hook 2", "hook 3"],
      "confidence": 85,
      "category": "${category.id}"
    }
  ]
}`;
}

// ============================================================================
// Research Agent
// ============================================================================

export class ResearchAgent {
  private client: Anthropic;
  private model: string;
  private temperature: number;
  private repository: EducationalRepository;

  constructor(config: ResearchAgentConfig, repository: EducationalRepository) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.temperature = config.temperature || 0.8;
    this.repository = repository;
  }

  /**
   * Execute research for a given niche and optional category
   */
  async execute(input: ResearchInput): Promise<ResearchOutput> {
    const startTime = Date.now();

    // Validate input
    const validatedInput = ResearchInputSchema.parse(input);
    const { niche, category: requestedCategory, excludeTopics, count } = validatedInput;

    logger.info('Research Agent starting', { niche, category: requestedCategory });

    try {
      // Get topic categories
      const categories = await this.repository.getTopicCategories(niche);
      if (categories.length === 0) {
        throw new Error(`No topic categories found for niche: ${niche}`);
      }

      // Select category (use requested or pick one based on weights)
      let category: TopicCategoryRecord;
      if (requestedCategory) {
        const found = categories.find(c => c.id === requestedCategory);
        if (!found) {
          throw new Error(`Category not found: ${requestedCategory}`);
        }
        category = found;
      } else {
        category = this.selectCategoryByWeight(categories);
      }

      logger.info('Selected category', { categoryId: category.id, categoryName: category.name });

      // Get recent topics to avoid
      const recentTopics = await this.repository.getRecentTopics(niche, 20);
      const topicsToExclude = [...recentTopics, ...(excludeTopics || [])];

      // Get performance insights
      const performanceInsights = await this.getPerformanceInsights(category.id);

      // Generate topics with LLM
      const topics = await this.generateTopics(
        niche,
        category,
        topicsToExclude,
        performanceInsights
      );

      // Sort by confidence and take requested count
      const sortedTopics = topics
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, count);

      const duration = (Date.now() - startTime) / 1000;
      const cost = this.estimateCost();

      logger.info('Research Agent completed', {
        duration: `${duration.toFixed(2)}s`,
        topicsGenerated: sortedTopics.length,
        cost
      });

      const output: ResearchOutput = {
        topics: sortedTopics,
        researchedAt: new Date(),
        niche,
        cost
      };

      // Validate output
      return ResearchOutputSchema.parse(output);

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error('Research Agent failed', {
        error: (error as Error).message,
        duration: `${duration.toFixed(2)}s`
      });
      throw error;
    }
  }

  /**
   * Select a category based on weights (weighted random selection)
   */
  private selectCategoryByWeight(categories: TopicCategoryRecord[]): TopicCategoryRecord {
    const totalWeight = categories.reduce((sum, c) => sum + Number(c.weight), 0);
    let random = Math.random() * totalWeight;

    for (const category of categories) {
      random -= Number(category.weight);
      if (random <= 0) {
        return category;
      }
    }

    return categories[0]; // Fallback
  }

  /**
   * Get performance insights for a category
   */
  private async getPerformanceInsights(categoryId: string): Promise<string> {
    try {
      const performance = await this.repository.getPerformanceByCategory(categoryId, 10);

      if (performance.length === 0) {
        return ''; // No historical data yet
      }

      // Calculate averages
      const avgSaveRate = performance.reduce((sum, p) => sum + (Number(p.save_rate) || 0), 0) / performance.length;
      const avgCompletion = performance.reduce((sum, p) => sum + (Number(p.completion_rate) || 0), 0) / performance.length;

      // Find patterns in high-performing content
      const highPerformers = performance.filter(p => (Number(p.save_rate) || 0) > avgSaveRate);
      const hookStyles = highPerformers.map(p => p.hook_style).filter(Boolean);

      const insights: string[] = [];

      if (avgSaveRate > 0) {
        insights.push(`Average save rate: ${(avgSaveRate * 100).toFixed(2)}%`);
      }
      if (avgCompletion > 0) {
        insights.push(`Average completion rate: ${avgCompletion.toFixed(1)}%`);
      }
      if (hookStyles.length > 0) {
        const styleCount: Record<string, number> = {};
        hookStyles.forEach(s => { styleCount[s!] = (styleCount[s!] || 0) + 1; });
        const topStyle = Object.entries(styleCount).sort((a, b) => b[1] - a[1])[0];
        if (topStyle) {
          insights.push(`Best performing hook style: ${topStyle[0]}`);
        }
      }

      return insights.join('\n');
    } catch (error) {
      logger.warn('Failed to get performance insights', { error: (error as Error).message });
      return '';
    }
  }

  /**
   * Generate topics using Claude
   */
  private async generateTopics(
    niche: string,
    category: TopicCategoryRecord,
    excludeTopics: string[],
    performanceInsights: string
  ): Promise<TopicSuggestion[]> {
    const systemPrompt = buildSystemPrompt(niche);
    const userPrompt = buildUserPrompt(category, excludeTopics, performanceInsights);

    const response = await retry(
      async () => {
        return this.client.messages.create({
          model: this.model,
          max_tokens: 2048,
          temperature: this.temperature,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt
            }
          ]
        });
      },
      {
        maxAttempts: 3,
        backoffMs: 1000
      }
    );

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.topics || !Array.isArray(parsed.topics)) {
      throw new Error('Invalid response structure: missing topics array');
    }

    // Validate and transform topics
    return parsed.topics.map((t: any) => ({
      topic: t.topic,
      whyNow: t.whyNow,
      competitorGap: t.competitorGap,
      suggestedAngle: t.suggestedAngle,
      emotionalTrigger: t.emotionalTrigger,
      potentialHooks: t.potentialHooks || [],
      confidence: t.confidence || 75,
      category: category.id
    }));
  }

  /**
   * Estimate cost for this operation
   */
  private estimateCost(): number {
    // Claude 3.5 Sonnet pricing:
    // Input: $3/MTok, Output: $15/MTok
    // Approximate: 800 input tokens, 600 output tokens
    return 0.012; // ~$0.01 with buffer
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createResearchAgent(repository: EducationalRepository): ResearchAgent {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }

  return new ResearchAgent(
    {
      apiKey,
      model: process.env.RESEARCH_AGENT_MODEL || 'claude-3-5-sonnet-20241022',
      temperature: 0.8
    },
    repository
  );
}
