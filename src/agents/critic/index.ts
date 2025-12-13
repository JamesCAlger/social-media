/**
 * Critic Agent
 *
 * Evaluates educational video scripts against a quality rubric.
 * Returns scores, feedback, and specific improvement suggestions.
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../core/logger';
import { retry } from '../../utils/retry';
import {
  CriticInput,
  CriticInputSchema,
  CriticOutput,
  CriticOutputSchema,
  QualityDimension,
  CriticalIssue
} from './schema';
import { QUALITY_RUBRIC, buildRubricPromptSection, calculateOverallScore, QualityDimensionKey } from './rubric';
import { Script, ScriptMetadata } from '../generator/schema';

// ============================================================================
// Configuration
// ============================================================================

interface CriticAgentConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  passingScore?: number;
}

// ============================================================================
// Prompts
// ============================================================================

function buildSystemPrompt(): string {
  return `You are an expert content quality evaluator specializing in short-form educational video scripts for Instagram Reels.

Your job is to rigorously evaluate scripts against a detailed quality rubric and provide actionable feedback.

You are STRICT but FAIR. Your goal is to help create content that:
1. Captures attention in the first 3 seconds
2. Delivers genuine educational value
3. Is save-worthy and share-worthy
4. Maintains viewer attention throughout
5. Avoids generic advice and compliance issues

═══════════════════════════════════════════════════════════════════════════════
QUALITY RUBRIC
═══════════════════════════════════════════════════════════════════════════════
${buildRubricPromptSection()}

═══════════════════════════════════════════════════════════════════════════════
CRITICAL ISSUES (Auto-fail if present)
═══════════════════════════════════════════════════════════════════════════════

Flag these as critical issues:
- duration_violation: Total duration outside 25-35 seconds
- hook_too_long: Hook segment takes more than 3 seconds
- no_specific_numbers: No concrete statistics or numbers in the script
- weak_hook: Hook uses cliches or doesn't create curiosity
- no_takeaway: Missing clear actionable insight
- pacing_issue: Fewer than 5 visual changes in 30 seconds
- generic_advice: Content is well-known advice without new angle
- compliance_risk: Sounds like financial advice ("you should invest...")

═══════════════════════════════════════════════════════════════════════════════
EVALUATION PRINCIPLES
═══════════════════════════════════════════════════════════════════════════════

1. Be specific in feedback - don't just say "hook is weak", explain WHY and HOW to fix
2. Provide examples when suggesting improvements
3. Acknowledge what's working well (strengths)
4. Prioritize feedback by impact on quality
5. Consider the target audience (casual Instagram viewers)
6. A passing score is 80+, but be honest if script falls short

OUTPUT: Respond with valid JSON only.`;
}

function buildUserPrompt(script: Script, metadata: ScriptMetadata, niche: string, iteration: number): string {
  const segmentsText = script.segments.map((seg, i) => {
    return `Segment ${i + 1} [${seg.timestamp}] (${seg.duration}s):
  Narration: "${seg.narration}"
  Visual: ${seg.visualType} - "${seg.visualDescription}"
  Text Overlay: ${seg.textOverlay || 'none'}
  Pacing: ${seg.pacing}, Energy: ${seg.energy}`;
  }).join('\n\n');

  return `Evaluate this ${niche} educational script (Iteration ${iteration}):

═══════════════════════════════════════════════════════════════════════════════
SCRIPT
═══════════════════════════════════════════════════════════════════════════════

Title: ${script.title}
Hook Style: ${script.hookStyle}
Hook: "${script.hook}"
Estimated Duration: ${script.estimatedDuration} seconds
CTA: "${script.cta}"

SEGMENTS:
${segmentsText}

═══════════════════════════════════════════════════════════════════════════════
METADATA
═══════════════════════════════════════════════════════════════════════════════

Target Emotion: ${metadata.targetEmotion}
Polarity Element: ${metadata.polarityElement}
Share-worthiness: ${metadata.shareWorthiness}
Save-worthiness: ${metadata.saveWorthiness}
Has Number in Hook: ${metadata.hasNumberInHook}
Has Clear Takeaway: ${metadata.hasClearTakeaway}

═══════════════════════════════════════════════════════════════════════════════
EVALUATE AND RETURN JSON
═══════════════════════════════════════════════════════════════════════════════

Return your evaluation as JSON:
{
  "dimensions": [
    {
      "dimension": "hook_strength",
      "score": 0-100,
      "weight": 0.25,
      "feedback": "Specific feedback for this dimension",
      "examples": ["Example improvement suggestion if score < 80"]
    },
    // ... repeat for all 7 dimensions
  ],
  "criticalIssues": [
    {
      "type": "issue_type",
      "description": "What's wrong and why it matters",
      "segment": 0,  // optional, which segment has the issue
      "severity": "critical|major|minor"
    }
  ],
  "strengths": ["What's working well..."],
  "improvementAreas": ["What needs work..."],
  "specificSuggestions": [
    "Concrete suggestion 1: Replace X with Y because...",
    "Concrete suggestion 2: In segment 3, change..."
  ]
}

Be thorough but concise. Focus on actionable feedback.`;
}

// ============================================================================
// Critic Agent
// ============================================================================

export class CriticAgent {
  private client: Anthropic;
  private model: string;
  private temperature: number;
  private passingScore: number;

  constructor(config: CriticAgentConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.temperature = config.temperature || 0.3; // Lower temperature for consistent evaluation
    this.passingScore = config.passingScore || 80;
  }

  /**
   * Execute script evaluation
   */
  async execute(input: CriticInput): Promise<CriticOutput> {
    const startTime = Date.now();

    // Validate input
    const validatedInput = CriticInputSchema.parse(input);
    const { script, metadata, niche, iterationNumber } = validatedInput;

    logger.info('Critic Agent starting', {
      title: script.title,
      niche,
      iteration: iterationNumber
    });

    try {
      // Build prompts
      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(script, metadata, niche, iterationNumber);

      // Evaluate with LLM
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

      // Validate dimensions
      const dimensions = this.validateDimensions(parsed.dimensions || []);
      const criticalIssues = this.validateCriticalIssues(parsed.criticalIssues || []);

      // Calculate overall score
      const dimensionScores: Record<string, number> = {};
      for (const dim of dimensions) {
        dimensionScores[dim.dimension] = dim.score;
      }
      const overallScore = calculateOverallScore(dimensionScores);

      // Determine if passed
      const passed = overallScore >= this.passingScore &&
                     !criticalIssues.some(i => i.severity === 'critical');

      const duration = (Date.now() - startTime) / 1000;
      const cost = this.estimateCost();

      logger.info('Critic Agent completed', {
        duration: `${duration.toFixed(2)}s`,
        overallScore,
        passed,
        criticalIssues: criticalIssues.length,
        cost
      });

      const output: CriticOutput = {
        overallScore,
        passed,
        dimensions,
        criticalIssues,
        strengths: parsed.strengths || [],
        improvementAreas: parsed.improvementAreas || [],
        specificSuggestions: parsed.specificSuggestions || [],
        evaluatedAt: new Date(),
        cost
      };

      // Validate output
      return CriticOutputSchema.parse(output);

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error('Critic Agent failed', {
        error: (error as Error).message,
        duration: `${duration.toFixed(2)}s`
      });
      throw error;
    }
  }

  /**
   * Validate and structure dimensions
   */
  private validateDimensions(raw: any[]): QualityDimension[] {
    const validDimensions = Object.keys(QUALITY_RUBRIC) as QualityDimensionKey[];

    return raw.map(dim => {
      // Ensure dimension key is valid
      const dimensionKey = validDimensions.includes(dim.dimension as QualityDimensionKey)
        ? dim.dimension
        : 'clarity_simplicity';

      return {
        dimension: dimensionKey,
        score: Math.min(100, Math.max(0, Number(dim.score) || 0)),
        weight: QUALITY_RUBRIC[dimensionKey as QualityDimensionKey].weight,
        feedback: dim.feedback || '',
        examples: dim.examples || []
      };
    }).filter(dim => validDimensions.includes(dim.dimension as QualityDimensionKey));
  }

  /**
   * Validate critical issues
   */
  private validateCriticalIssues(raw: any[]): CriticalIssue[] {
    const validTypes = [
      'duration_violation', 'hook_too_long', 'no_specific_numbers',
      'weak_hook', 'no_takeaway', 'pacing_issue', 'generic_advice', 'compliance_risk'
    ];

    return raw
      .filter(issue => validTypes.includes(issue.type))
      .map(issue => ({
        type: issue.type,
        description: issue.description || '',
        segment: issue.segment !== undefined ? Number(issue.segment) : undefined,
        severity: ['critical', 'major', 'minor'].includes(issue.severity)
          ? issue.severity
          : 'major'
      }));
  }

  /**
   * Estimate cost for this operation
   */
  private estimateCost(): number {
    // Claude 3.5 Sonnet pricing:
    // Input: $3/MTok, Output: $15/MTok
    // Approximate: 3000 input tokens, 1500 output tokens
    return 0.032; // ~$0.03 with buffer
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createCriticAgent(): CriticAgent {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }

  return new CriticAgent({
    apiKey,
    model: process.env.CRITIC_AGENT_MODEL || 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    passingScore: 80
  });
}

// Re-export types and rubric
export { QUALITY_RUBRIC, buildRubricPromptSection, calculateOverallScore } from './rubric';
