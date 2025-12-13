/**
 * Refiner Agent
 *
 * Takes a script that didn't pass the Critic evaluation and improves it
 * based on the specific feedback provided.
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../core/logger';
import { retry } from '../../utils/retry';
import {
  RefinerInput,
  RefinerInputSchema,
  RefinerOutput,
  RefinerOutputSchema,
  ChangeLog
} from './schema';
import { Script, ScriptMetadata, ScriptSchema, ScriptMetadataSchema } from '../generator/schema';
import { CriticOutput } from '../critic/schema';

// ============================================================================
// Configuration
// ============================================================================

interface RefinerAgentConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
}

// ============================================================================
// Prompts
// ============================================================================

function buildSystemPrompt(): string {
  return `You are an expert script editor specializing in improving short-form educational video scripts for Instagram Reels.

You receive:
1. An original script that needs improvement
2. Detailed feedback from a quality evaluator

Your job is to REFINE the script by:
1. Addressing all critical issues first (these are non-negotiable)
2. Improving weak dimensions based on specific feedback
3. Implementing suggested changes
4. Maintaining what's already working well

═══════════════════════════════════════════════════════════════════════════════
REFINEMENT RULES
═══════════════════════════════════════════════════════════════════════════════

1. CRITICAL ISSUES must be fixed:
   - duration_violation: Adjust segment durations to hit 25-35 seconds total
   - hook_too_long: Shorten hook to 3 seconds max
   - no_specific_numbers: Add concrete statistics/numbers
   - weak_hook: Rewrite hook with curiosity gap + specific number
   - no_takeaway: Add clear actionable insight
   - pacing_issue: Add more visual changes
   - generic_advice: Find unique angle or specific insight
   - compliance_risk: Remove anything sounding like financial advice

2. PRESERVE what's working:
   - Don't change segments that scored well
   - Keep effective hooks if they're not flagged
   - Maintain the core educational message

3. IMPROVE dimensions scoring below 80:
   - Use the specific feedback provided
   - Implement suggested examples when given

4. MAINTAIN STRUCTURE:
   - Must have exactly 5 segments
   - Duration must total 30 seconds
   - Hook must be 3 seconds
   - End with CTA segment

═══════════════════════════════════════════════════════════════════════════════
REFINEMENT APPROACH
═══════════════════════════════════════════════════════════════════════════════

For HOOK issues:
- Lead with the most surprising statistic
- Create immediate curiosity gap
- Remove cliches ("Did you know", "Let me tell you", "Hey guys")
- Make it impossible to scroll past

For EDUCATIONAL VALUE issues:
- Add specific numbers, formulas, or frameworks
- Show the math or reveal the hidden pattern
- Make it save-worthy with reference material

For PACING issues:
- Ensure visual change every 4-5 seconds
- Build energy toward the payoff (segment 3)
- End strong, don't let energy fizzle

For GENERIC CONTENT issues:
- Find the contrarian angle
- Challenge conventional wisdom
- Add specificity that competitors lack

OUTPUT: Return valid JSON with the refined script and changelog.`;
}

function buildUserPrompt(
  script: Script,
  metadata: ScriptMetadata,
  feedback: CriticOutput,
  niche: string,
  iteration: number
): string {
  const segmentsText = script.segments.map((seg, i) => {
    return `Segment ${i + 1} [${seg.timestamp}] (${seg.duration}s):
  Narration: "${seg.narration}"
  Visual: "${seg.visualDescription}"
  Text Overlay: ${seg.textOverlay || 'none'}
  Pacing: ${seg.pacing}, Energy: ${seg.energy}`;
  }).join('\n\n');

  const dimensionsFeedback = feedback.dimensions.map(dim => {
    const status = dim.score >= 80 ? '✓' : '✗';
    return `${status} ${dim.dimension}: ${dim.score}/100
   ${dim.feedback}${dim.examples && dim.examples.length > 0 ? '\n   Examples: ' + dim.examples.join('; ') : ''}`;
  }).join('\n\n');

  const criticalIssuesText = feedback.criticalIssues.length > 0
    ? feedback.criticalIssues.map(issue => {
        const segment = issue.segment !== undefined ? ` [Segment ${issue.segment + 1}]` : '';
        return `- [${issue.severity.toUpperCase()}]${segment} ${issue.type}: ${issue.description}`;
      }).join('\n')
    : 'None';

  return `REFINE this ${niche} script (Iteration ${iteration}):

═══════════════════════════════════════════════════════════════════════════════
ORIGINAL SCRIPT
═══════════════════════════════════════════════════════════════════════════════

Title: ${script.title}
Hook Style: ${script.hookStyle}
Hook: "${script.hook}"
Estimated Duration: ${script.estimatedDuration} seconds
CTA: "${script.cta}"

SEGMENTS:
${segmentsText}

═══════════════════════════════════════════════════════════════════════════════
CRITIC FEEDBACK (Score: ${feedback.overallScore}/100 - ${feedback.passed ? 'PASSED' : 'FAILED'})
═══════════════════════════════════════════════════════════════════════════════

CRITICAL ISSUES (must fix):
${criticalIssuesText}

DIMENSION SCORES:
${dimensionsFeedback}

STRENGTHS (preserve these):
${feedback.strengths.map(s => `+ ${s}`).join('\n')}

IMPROVEMENT AREAS:
${feedback.improvementAreas.map(s => `- ${s}`).join('\n')}

SPECIFIC SUGGESTIONS:
${feedback.specificSuggestions.map(s => `→ ${s}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
REFINE AND RETURN JSON
═══════════════════════════════════════════════════════════════════════════════

Return your refined script as JSON:
{
  "refinedScript": {
    "title": "...",
    "hook": "...",
    "segments": [
      {
        "timestamp": "0:00-0:03",
        "duration": 3,
        "narration": "...",
        "visualDescription": "...",
        "visualType": "ai_image",
        "textOverlay": "...",
        "pacing": "fast",
        "energy": "peak"
      }
      // ... exactly 5 segments
    ],
    "cta": "...",
    "estimatedDuration": 30,
    "hookStyle": "contrarian|curiosity|shocking_stat|story_start"
  },
  "refinedMetadata": {
    "targetEmotion": "...",
    "polarityElement": "...",
    "shareWorthiness": "high",
    "saveWorthiness": "high",
    "hasNumberInHook": true,
    "hasClearTakeaway": true
  },
  "changesMade": [
    {
      "segmentIndex": 0,
      "field": "narration",
      "before": "Original text (truncated)...",
      "after": "New text (truncated)...",
      "reason": "Why this change addresses the feedback"
    }
  ],
  "addressedIssues": ["hook_too_long", "weak_hook"],
  "remainingConcerns": ["Any issues that couldn't be fully resolved"]
}

IMPORTANT:
- Segment durations MUST total exactly 30 seconds
- Hook segment MUST be 3 seconds or less
- Preserve what's working, fix what's broken
- Be specific in changelog about what changed and why`;
}

// ============================================================================
// Refiner Agent
// ============================================================================

export class RefinerAgent {
  private client: Anthropic;
  private model: string;
  private temperature: number;

  constructor(config: RefinerAgentConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.temperature = config.temperature || 0.5; // Moderate creativity for refinement
  }

  /**
   * Execute script refinement
   */
  async execute(input: RefinerInput): Promise<RefinerOutput> {
    const startTime = Date.now();

    // Validate input
    const validatedInput = RefinerInputSchema.parse(input);
    const { script, metadata, criticFeedback, niche, iterationNumber } = validatedInput;

    logger.info('Refiner Agent starting', {
      title: script.title,
      currentScore: criticFeedback.overallScore,
      criticalIssues: criticFeedback.criticalIssues.length,
      iteration: iterationNumber
    });

    try {
      // Build prompts
      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(script, metadata, criticFeedback, niche, iterationNumber);

      // Refine with LLM
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

      // Validate refined script
      const refinedScript = this.validateScript(parsed.refinedScript);
      const refinedMetadata = this.validateMetadata(parsed.refinedMetadata);
      const changesMade = this.validateChanges(parsed.changesMade || []);

      const duration = (Date.now() - startTime) / 1000;
      const cost = this.estimateCost();

      logger.info('Refiner Agent completed', {
        duration: `${duration.toFixed(2)}s`,
        changesMade: changesMade.length,
        addressedIssues: parsed.addressedIssues?.length || 0,
        cost
      });

      const output: RefinerOutput = {
        refinedScript,
        refinedMetadata,
        changesMade,
        addressedIssues: parsed.addressedIssues || [],
        remainingConcerns: parsed.remainingConcerns || [],
        iterationNumber,
        refinedAt: new Date(),
        cost
      };

      // Validate output
      return RefinerOutputSchema.parse(output);

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error('Refiner Agent failed', {
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
   * Validate change log entries
   */
  private validateChanges(raw: any[]): ChangeLog[] {
    return raw.map(change => ({
      segmentIndex: change.segmentIndex !== undefined ? Number(change.segmentIndex) : undefined,
      field: String(change.field || 'unknown'),
      before: String(change.before || '').substring(0, 100),
      after: String(change.after || '').substring(0, 100),
      reason: String(change.reason || '')
    }));
  }

  /**
   * Estimate cost for this operation
   */
  private estimateCost(): number {
    // Claude 3.5 Sonnet pricing:
    // Input: $3/MTok, Output: $15/MTok
    // Approximate: 3500 input tokens (includes feedback), 1500 output tokens
    return 0.033; // ~$0.03 with buffer
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createRefinerAgent(): RefinerAgent {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }

  return new RefinerAgent({
    apiKey,
    model: process.env.REFINER_AGENT_MODEL || 'claude-3-5-sonnet-20241022',
    temperature: 0.5
  });
}
