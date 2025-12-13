/**
 * Generator Agent Prompts
 *
 * Comprehensive prompts for generating 30-second educational scripts
 * with quality rules encoded directly in the prompt.
 */

import { TopicSuggestion } from '../research/schema';

export function buildSystemPrompt(niche: string): string {
  return `You are an expert short-form video scriptwriter specializing in ${niche} education for Instagram Reels.

You create 30-second scripts that are:
- EDUCATIONAL but never boring
- SPECIFIC with real numbers and examples
- STRUCTURED for maximum retention
- DESIGNED for saves and shares (not just views)

═══════════════════════════════════════════════════════════════════════════
STRUCTURE (30 seconds) - TIGHT AND PUNCHY
═══════════════════════════════════════════════════════════════════════════

0:00-0:03  HOOK: Pattern interrupt, curiosity gap (CRITICAL - 50% of success)
0:03-0:10  SETUP: Quick context, one sentence of "here's what you're missing"
0:10-0:22  PAYOFF: The answer, the math, the revelation (core value)
0:22-0:28  TAKEAWAY: One memorable insight or actionable point
0:28-0:30  CTA: Simple "Follow for more" (no complex engagement asks)

NOTE: 30 seconds means NO FILLER. Every second must earn its place.
If a sentence doesn't add value, cut it.

═══════════════════════════════════════════════════════════════════════════
HOOK RULES (The most important 3 seconds)
═══════════════════════════════════════════════════════════════════════════

GOOD hooks:
- Lead with the most surprising/contrarian element
- Use specific numbers ("73% of people..." not "Most people...")
- Create instant curiosity gap ("I tracked X for 30 days. The result shocked me.")
- Challenge a common belief ("Everything you know about X is wrong")

BAD hooks (NEVER use):
- "Did you know..." (lazy, overused)
- "In this video..." (boring, meta)
- "Hey guys..." (wastes precious seconds)
- "Let me tell you about..." (no value)
- Rhetorical questions without tension
- Anything that takes more than 3 seconds

═══════════════════════════════════════════════════════════════════════════
HOOK STYLES
═══════════════════════════════════════════════════════════════════════════

CONTRARIAN: Challenge conventional wisdom
  Example: "Your emergency fund is lying to you. Here's why."

CURIOSITY: Create an information gap
  Example: "I tracked every dollar for 90 days. The pattern was disturbing."

SHOCKING_STAT: Lead with a surprising number
  Example: "93% of Americans can't pass this basic money test."

STORY_START: Open mid-action
  Example: "Last week I found $47,000 I didn't know I was losing."

═══════════════════════════════════════════════════════════════════════════
PACING & ENERGY
═══════════════════════════════════════════════════════════════════════════

- Visual change every 4-5 seconds (minimum 5-6 visual changes per video)
- Build tension toward the payoff
- Make it slightly TOO FAST - forces rewatches
- End strong - don't let energy fizzle

═══════════════════════════════════════════════════════════════════════════
POLARITY PRINCIPLE (What makes content STAND OUT)
═══════════════════════════════════════════════════════════════════════════

Viral content has POLARITY - it takes a stance, creates tension, or challenges norms.
Add one of these elements:
- Finance + brutal honesty ("Your financial advisor is lying")
- History + modern parallels ("This 1920s scam is happening on TikTok")
- Science + absurdity ("Scientists paid people to do nothing. Here's what happened.")

═══════════════════════════════════════════════════════════════════════════
SAVE-WORTHY ELEMENTS (Critical for algorithm)
═══════════════════════════════════════════════════════════════════════════

Include at least ONE of these:
- A specific formula or calculation people can use
- A step-by-step mini-framework
- A surprising statistic they'll want to reference
- A simple test or quiz element

═══════════════════════════════════════════════════════════════════════════
WHAT TO AVOID (Auto-fail criteria)
═══════════════════════════════════════════════════════════════════════════

NEVER include:
- Financial advice ("You should buy/invest in...")
- Promises of returns ("Guaranteed X%...")
- Generic advice everyone knows
- Complex jargon without explanation
- More than 30 seconds of content

OUTPUT FORMAT: Respond with valid JSON only.`;
}

export function buildUserPrompt(topic: TopicSuggestion, hookStyleOverride?: string): string {
  const hookStyle = hookStyleOverride || getRecommendedHookStyle(topic.emotionalTrigger);

  return `Create a 30-second educational script for Instagram Reels.

TOPIC: ${topic.topic}
CATEGORY: ${topic.category}
EMOTIONAL TRIGGER: ${topic.emotionalTrigger}
SUGGESTED ANGLE: ${topic.suggestedAngle}
COMPETITOR GAP: ${topic.competitorGap}
WHY NOW: ${topic.whyNow}

USE HOOK STYLE: ${hookStyle}

POTENTIAL HOOKS (for inspiration, you can modify):
${topic.potentialHooks.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

Generate a complete script with exactly 5 segments that adds up to 30 seconds.

Return valid JSON in this exact format:
{
  "script": {
    "title": "Short title for internal reference",
    "hook": "The exact opening line (must be under 3 seconds to say)",
    "segments": [
      {
        "timestamp": "0:00-0:03",
        "duration": 3,
        "narration": "Exact words for segment 1 (the hook)",
        "visualDescription": "What the viewer sees - describe for AI image generation",
        "visualType": "ai_image",
        "textOverlay": "KEY TEXT ON SCREEN",
        "pacing": "fast",
        "energy": "peak"
      },
      {
        "timestamp": "0:03-0:10",
        "duration": 7,
        "narration": "Exact words for segment 2 (setup/context)",
        "visualDescription": "Visual description",
        "visualType": "ai_image",
        "textOverlay": "Text overlay or null",
        "pacing": "medium",
        "energy": "building"
      },
      {
        "timestamp": "0:10-0:22",
        "duration": 12,
        "narration": "Exact words for segment 3 (main payoff - this is the longest)",
        "visualDescription": "Visual description",
        "visualType": "ai_image",
        "textOverlay": "Key numbers or insight",
        "pacing": "fast",
        "energy": "peak"
      },
      {
        "timestamp": "0:22-0:28",
        "duration": 6,
        "narration": "Exact words for segment 4 (takeaway)",
        "visualDescription": "Visual description",
        "visualType": "ai_image",
        "textOverlay": "Memorable takeaway",
        "pacing": "medium",
        "energy": "resolution"
      },
      {
        "timestamp": "0:28-0:30",
        "duration": 2,
        "narration": "Follow for more [topic area].",
        "visualDescription": "Clean closing visual",
        "visualType": "text_card",
        "textOverlay": "Follow for more",
        "pacing": "medium",
        "energy": "resolution"
      }
    ],
    "cta": "Follow for more [topic area].",
    "estimatedDuration": 30,
    "hookStyle": "${hookStyle}"
  },
  "metadata": {
    "targetEmotion": "${topic.emotionalTrigger}",
    "polarityElement": "Describe what makes this content stand out",
    "shareWorthiness": "high",
    "saveWorthiness": "high",
    "hasNumberInHook": true,
    "hasClearTakeaway": true
  }
}

IMPORTANT:
- The hook MUST grab attention in under 3 seconds
- Segment durations MUST add up to exactly 30 seconds
- Each narration should be speakable in the allocated time (~150 words/minute = 2.5 words/second)
- Visual descriptions should be specific enough for AI image generation
- Include at least one specific number or statistic`;
}

/**
 * Map emotional trigger to recommended hook style
 */
function getRecommendedHookStyle(emotionalTrigger: string): string {
  const mapping: Record<string, string> = {
    'outrage': 'contrarian',
    'curiosity': 'curiosity',
    'surprise': 'shocking_stat',
    'aspiration': 'story_start',
    'fear': 'contrarian'
  };
  return mapping[emotionalTrigger] || 'curiosity';
}
