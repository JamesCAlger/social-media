const fs = require('fs');

// New templates.ts content with viral structure
const newContent = `import { IdeaOutput, ContentStrategy, HookStyle } from '../../core/types';

export interface PromptConfig {
  segmentCount: number;
  segmentDuration: number;
  hookStyle?: HookStyle;
}

const DEFAULT_CONFIG: PromptConfig = {
  segmentCount: 1,
  segmentDuration: 8,
  hookStyle: 'guess_the_color',
};

/**
 * Viral prompt structure based on research
 * Key elements: technical camera specs, lighting, human hand, audio instructions
 */
export function createViralPromptSystemPrompt(config: PromptConfig = DEFAULT_CONFIG): string {
  const { segmentCount, segmentDuration, hookStyle } = config;

  const hookInstruction = getHookInstruction(hookStyle);

  return \`
You are a specialized AI that generates highly detailed video prompts for AI video generation (optimized for Veo 3 / WAN 2.5).

Your task is to generate \${segmentCount === 1 ? '1 video prompt' : \`\${segmentCount} sequential video prompts\`} (\${segmentDuration} seconds \${segmentCount === 1 ? 'total' : 'each'}).

**VIRAL VIDEO STRUCTURE (Critical for engagement):**
\${hookInstruction}

**TECHNICAL SPECIFICATIONS (Include in every prompt):**
- Camera: Hyper-realistic cinematic close-up, ultra-sharp macro lens, shallow depth of field
- Lighting: Professional studio lighting, soft glow, light refracting through transparent materials
- Quality: 8K detail level, photorealistic textures, crystal-clear visuals
- Framing: Object perfectly centered, clean background, no distractions
- Hand: A human hand clearly visible holding the knife (adds authenticity)

**PROMPT STRUCTURE (Follow this order):**
1. Camera and lighting setup (macro lens, studio lighting, shallow DOF)
2. Subject description (material, color, texture, transparency)
3. Object positioning (centered on wooden cutting board)
4. Hand and tool description (human hand, sharp stainless steel knife)
5. Action description (deliberate, smooth slicing motion)
6. Material response (how the material reacts - cracks, reveals, cascades)
7. Sound cues (for audio sync - crunching, tinkling, crackling)

**AUDIO INSTRUCTIONS:**
- ASMR sounds only - no talking, no music
- Describe the exact sounds: glass cracking, gems tinkling, crystal resonance
- Sound must sync perfectly with visual action

**Output Format:**
Return ONLY a valid JSON object with this structure:
{
  "prompts": [
    {
      "sequence": 1,
      "videoPrompt": "Your detailed prompt here (150-250 words)...",
      "audioPrompt": "ASMR sound description (crisp, detailed)...",
      "duration": \${segmentDuration},
      "resolution": "720p",
      "aspectRatio": "9:16"
    }
  ]
}
\`.trim();
}

/**
 * Get hook-specific instructions based on hookStyle
 */
function getHookInstruction(hookStyle?: HookStyle): string {
  const instructions: Record<HookStyle, string> = {
    immediate_action: \`
HOOK: IMMEDIATE ACTION (Frame 1 = Mid-action)
- Start the video MID-SLICE - knife already cutting through the object
- NO setup, NO anticipation - immediate visual payoff
- First frame must show the satisfying action already happening
- Pure visual hook - no text needed\`,

    wait_for_it: \`
HOOK: WAIT FOR IT (Anticipation Build)
- Start with the knife hovering above the object
- Slow, deliberate descent building anticipation
- The "wait for it" moment before the satisfying slice
- Text overlay: "wait for it..." will be added\`,

    question: \`
HOOK: QUESTION (Engagement Hook)
- Frame the shot to create curiosity about what's inside
- Show the mysterious exterior before revealing interior
- Text overlay: "Why is this so satisfying?" will be added
- Focus on the unknown/surprise element\`,

    result_first: \`
HOOK: RESULT FIRST (Show the Payoff)
- Start by showing the RESULT - gems spilling out, interior revealed
- Then cut to the beginning of the slice
- Reverse storytelling - satisfy curiosity immediately, then show how
- This creates "how did they do that?" engagement\`,

    mystery: \`
HOOK: MYSTERY (What's Inside?)
- Emphasize the opaque/mysterious exterior
- Build intrigue about what could be hidden inside
- Text overlay: "What's inside?" will be added
- Dramatic reveal moment when sliced\`,

    sound_focus: \`
HOOK: SOUND FOCUS (Audio-First)
- Emphasize the SOUND in the prompt - make it crisp and detailed
- Text overlay: "Turn your sound on 🔊" will be added
- Audio should be the star - glass cracking, gems cascading
- Visual supports the satisfying audio experience\`,

    guess_the_color: \`
HOOK: GUESS THE COLOR (Current Default)
- Show exterior color clearly
- Build anticipation for interior color reveal
- Text overlay: "guess the color" will be added
- Interior gems should be CONTRASTING color to exterior\`,

    visual: \`
HOOK: VISUAL (Legacy - Pure Visual)
- Standard satisfying visual progression
- Focus on material textures and smooth motion
- No specific hook structure\`,

    text_overlay: \`
HOOK: TEXT OVERLAY (Legacy - Generic)
- Standard text overlay hook
- Generic engaging text will be added
- Focus on clear, engaging visuals\`,
  };

  return instructions[hookStyle || 'guess_the_color'] || instructions.guess_the_color;
}

/**
 * Legacy system prompt (kept for backward compatibility)
 */
export function createPromptEngineeringSystemPrompt(config: PromptConfig = DEFAULT_CONFIG): string {
  return createViralPromptSystemPrompt(config);
}

export function createPromptEngineeringUserPrompt(idea: IdeaOutput, config: PromptConfig = DEFAULT_CONFIG): string {
  const { segmentCount, segmentDuration, hookStyle } = config;

  const hookContext = hookStyle ? \`\\n**Hook Style:** \${hookStyle} (follow the hook instructions from system prompt)\` : '';

  if (segmentCount === 1) {
    return \`
Generate 1 video prompt (\${segmentDuration} seconds) based on this idea:

**Idea:** \${idea.idea}
**Context:** \${idea.culturalContext}
**Environment:** \${idea.environment}
**Sound Concept:** \${idea.soundConcept}\${hookContext}

**CRITICAL VIRAL ELEMENTS TO INCLUDE:**
1. "Hyper-realistic cinematic close-up" - start with this phrase
2. "Ultra-sharp macro lens, shallow depth of field" - camera specs
3. "Professional studio lighting" - lighting description
4. "A human hand clearly visible" - adds authenticity
5. "Sharp stainless steel knife" - tool description
6. "Perfectly centered on natural wooden cutting board" - positioning
7. Describe how light refracts through the transparent material
8. Describe the EXACT sounds (crackling, tinkling, crunching)

**PROMPT LENGTH:** 150-250 words with ALL technical specifications included.

Focus on making the first frame IMMEDIATELY engaging - this is critical for viral performance.
\`.trim();
  }

  return \`
Generate \${segmentCount} video prompts based on this idea:

**Idea:** \${idea.idea}
**Context:** \${idea.culturalContext}
**Environment:** \${idea.environment}
**Sound Concept:** \${idea.soundConcept}\${hookContext}

Create \${segmentCount} sequential prompts (\${segmentDuration} seconds each) that:
\${segmentCount >= 1 ? '1. Show the initial state with full technical setup (camera, lighting, positioning)' : ''}
\${segmentCount >= 2 ? '2. Continue the action mid-process with material response details' : ''}
\${segmentCount >= 3 ? '3. Complete the reveal with satisfying conclusion' : ''}

**CRITICAL VIRAL ELEMENTS TO INCLUDE IN EACH PROMPT:**
1. "Hyper-realistic cinematic close-up" - camera style
2. "Ultra-sharp macro lens, shallow depth of field" - camera specs
3. "Professional studio lighting" - lighting description
4. "A human hand clearly visible" - adds authenticity
5. Describe light refraction through transparent materials
6. Describe exact ASMR sounds for audio sync

Each prompt should be 150-250 words and optimized for viral performance.
\`.trim();
}

/**
 * Get prompt config from ContentStrategy
 */
export function getPromptConfigFromStrategy(strategy?: ContentStrategy): PromptConfig {
  if (!strategy) {
    return DEFAULT_CONFIG;
  }

  return {
    segmentCount: strategy.segmentCount || 1,
    segmentDuration: strategy.segmentDuration || 8,
    hookStyle: strategy.hookStyle as HookStyle || 'guess_the_color',
  };
}

/**
 * Get all available hook styles for A/B testing
 */
export function getAvailableHookStyles(): HookStyle[] {
  return [
    'immediate_action',
    'wait_for_it',
    'question',
    'result_first',
    'mystery',
    'sound_focus',
    'guess_the_color',
  ];
}

/**
 * Get hook style description for UI/logging
 */
export function getHookStyleDescription(hookStyle: HookStyle): string {
  const descriptions: Record<HookStyle, string> = {
    immediate_action: 'Start mid-action, no setup, pure visual payoff',
    wait_for_it: 'Build anticipation with "wait for it..." text',
    question: 'Engagement hook with "Why is this so satisfying?"',
    result_first: 'Show the satisfying result first, then how',
    mystery: 'Create intrigue with "What\\'s inside?"',
    sound_focus: 'Audio-first with "Turn your sound on"',
    guess_the_color: 'Engagement with "Guess the color inside"',
    visual: 'Legacy pure visual hook',
    text_overlay: 'Legacy generic text overlay',
  };

  return descriptions[hookStyle] || 'Unknown hook style';
}
`;

fs.writeFileSync('src/layers/02-prompt-engineering/templates.ts', newContent);
console.log('Updated templates.ts with viral structure and hook styles');
