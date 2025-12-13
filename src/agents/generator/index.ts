/**
 * Generator Agent
 *
 * Generates 30-second educational video scripts from topic suggestions.
 * Uses LLM with comprehensive prompt engineering for high-quality scripts.
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../core/logger';
import { retry } from '../../utils/retry';
import {
  GeneratorInput,
  GeneratorInputSchema,
  GeneratorOutput,
  GeneratorOutputSchema,
  Script,
  ScriptSchema,
  ScriptMetadata,
  ScriptMetadataSchema
} from './schema';
import { buildSystemPrompt, buildUserPrompt } from './prompts';

// ============================================================================
// Configuration
// ============================================================================

interface GeneratorAgentConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
}

// ============================================================================
// Generator Agent
// ============================================================================

export class GeneratorAgent {
  private client: Anthropic;
  private model: string;
  private temperature: number;

  constructor(config: GeneratorAgentConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.temperature = config.temperature || 0.7;
  }

  /**
   * Execute script generation for a given topic
   */
  async execute(input: GeneratorInput): Promise<GeneratorOutput> {
    const startTime = Date.now();

    // Validate input
    const validatedInput = GeneratorInputSchema.parse(input);
    const { topic, niche, hookStyleOverride } = validatedInput;

    logger.info('Generator Agent starting', {
      topic: topic.topic,
      niche,
      category: topic.category
    });

    try {
      // Build prompts
      const systemPrompt = buildSystemPrompt(niche);
      const userPrompt = buildUserPrompt(topic, hookStyleOverride);

      // Generate script with LLM
      const response = await retry(
        async () => {
          return this.client.messages.create({
            model: this.model,
            max_tokens: 4096,
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

      // Validate script structure
      if (!parsed.script || !parsed.metadata) {
        throw new Error('Invalid response structure: missing script or metadata');
      }

      // Validate and parse script
      const script = this.validateScript(parsed.script);
      const metadata = this.validateMetadata(parsed.metadata);

      // Validate duration adds up correctly
      this.validateDuration(script);

      const duration = (Date.now() - startTime) / 1000;
      const cost = this.estimateCost();

      logger.info('Generator Agent completed', {
        duration: `${duration.toFixed(2)}s`,
        title: script.title,
        segmentCount: script.segments.length,
        hookStyle: script.hookStyle,
        cost
      });

      const output: GeneratorOutput = {
        script,
        metadata,
        topicUsed: topic.topic,
        category: topic.category,
        generatedAt: new Date(),
        cost
      };

      // Validate output
      return GeneratorOutputSchema.parse(output);

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error('Generator Agent failed', {
        error: (error as Error).message,
        duration: `${duration.toFixed(2)}s`
      });
      throw error;
    }
  }

  /**
   * Validate script structure
   */
  private validateScript(raw: any): Script {
    // Ensure segments are properly structured
    const segments = (raw.segments || []).map((seg: any) => ({
      timestamp: seg.timestamp,
      duration: Number(seg.duration),
      narration: seg.narration,
      visualDescription: seg.visualDescription,
      visualType: seg.visualType || 'ai_image',
      textOverlay: seg.textOverlay || null,
      pacing: seg.pacing || 'medium',
      energy: seg.energy || 'building'
    }));

    const script = {
      title: raw.title,
      hook: raw.hook,
      segments,
      cta: raw.cta,
      estimatedDuration: Number(raw.estimatedDuration) || 30,
      hookStyle: raw.hookStyle
    };

    return ScriptSchema.parse(script);
  }

  /**
   * Validate metadata structure
   */
  private validateMetadata(raw: any): ScriptMetadata {
    const metadata = {
      targetEmotion: raw.targetEmotion,
      polarityElement: raw.polarityElement,
      shareWorthiness: raw.shareWorthiness || 'medium',
      saveWorthiness: raw.saveWorthiness || 'medium',
      hasNumberInHook: Boolean(raw.hasNumberInHook),
      hasClearTakeaway: Boolean(raw.hasClearTakeaway)
    };

    return ScriptMetadataSchema.parse(metadata);
  }

  /**
   * Validate that segment durations add up to target duration
   */
  private validateDuration(script: Script): void {
    const totalDuration = script.segments.reduce((sum, seg) => sum + seg.duration, 0);

    if (totalDuration < 25 || totalDuration > 35) {
      logger.warn('Script duration outside target range', {
        totalDuration,
        expectedRange: '25-35 seconds'
      });
    }

    // Check if duration matches estimated
    if (Math.abs(totalDuration - script.estimatedDuration) > 2) {
      logger.warn('Duration mismatch', {
        segmentTotal: totalDuration,
        estimated: script.estimatedDuration
      });
    }
  }

  /**
   * Estimate cost for this operation
   */
  private estimateCost(): number {
    // Claude 3.5 Sonnet pricing:
    // Input: $3/MTok, Output: $15/MTok
    // Approximate: 2000 input tokens, 1000 output tokens
    return 0.021; // ~$0.02 with buffer
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createGeneratorAgent(): GeneratorAgent {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }

  return new GeneratorAgent({
    apiKey,
    model: process.env.GENERATOR_AGENT_MODEL || 'claude-3-5-sonnet-20241022',
    temperature: 0.7
  });
}
