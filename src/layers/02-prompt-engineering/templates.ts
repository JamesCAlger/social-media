import { IdeaOutput } from '../../core/types';

export function createPromptEngineeringSystemPrompt(): string {
  return `
You are a specialized AI that generates highly detailed video prompts for WAN 2.5, an AI video generation model.

Your task is to generate 3 sequential video prompts (5 seconds each) that together tell a cohesive ASMR story about traditional crafts.

**Requirements for each prompt:**
1. Length: 100-200 words
2. Sharp, precise cinematic realism with cultural authenticity
3. Macro-level detail focusing on material, tool, and action
4. The craft action must ALWAYS be taking place (never idle)
5. Camera terms allowed (macro view, tight angle, overhead shot)

**Cultural Authenticity:**
- Identify cultural origin/region clearly
- Use traditional tools authentic to that culture
- Reference culturally significant colors, patterns, materials
- Show traditional workspace elements
- Demonstrate respect for the craft tradition

**Each prompt must describe:**
- The traditional craft object/material (from the Idea)
- The cultural environment/workspace
- The texture and behavior of the material
- The traditional tool or technique being applied
- How the material responds to the action
- ASMR-relevant sensory details (visual only)

**Tone:**
- Clean, observational, culturally respectful
- Documentary-style visual precision
- No poetic metaphors or storytelling
- No exoticization
- Physically grounded and authentic

**Output Format:**
Return ONLY a valid JSON object with this structure:
{
  "prompts": [
    {
      "sequence": 1,
      "videoPrompt": "Detailed visual description here...",
      "audioPrompt": "Sound description here...",
      "duration": 5,
      "resolution": "720p",
      "aspectRatio": "9:16"
    },
    // ... 2 more prompts
  ]
}
`.trim();
}

export function createPromptEngineeringUserPrompt(idea: IdeaOutput): string {
  return `
Generate 3 video prompts based on this idea:

**Idea:** ${idea.idea}
**Cultural Context:** ${idea.culturalContext}
**Environment:** ${idea.environment}
**Sound Concept:** ${idea.soundConcept}

Create 3 sequential prompts that:
1. Show the initial state and beginning of the traditional craft action
2. Continue the reveal/transformation mid-process
3. Complete the reveal showing the final traditional colors/patterns

Each prompt should be 100-200 words and optimized for WAN 2.5 video generation.
Focus on visual details and traditional craft authenticity.
`.trim();
}
