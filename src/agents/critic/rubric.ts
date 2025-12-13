/**
 * Critic Agent Quality Rubric
 *
 * Defines the evaluation criteria for educational video scripts.
 * Each dimension has a weight and specific criteria that contribute to the score.
 */

// Rubric configuration
export const QUALITY_RUBRIC = {
  hook_strength: {
    weight: 0.25,
    description: 'Hook grabs attention in under 3 seconds, creates curiosity gap or pattern interrupt',
    criteria: [
      'Under 3 seconds to deliver',
      'Uses specific number or surprising fact',
      'Creates immediate curiosity gap',
      'Avoids cliches (Did you know, Hey guys, In this video, Let me tell you)',
      'Challenges a common belief or reveals hidden truth'
    ],
    scoringGuide: {
      excellent: 'Hook is under 3 seconds, leads with specific number, creates strong curiosity gap, avoids all cliches',
      good: 'Hook is attention-grabbing but missing one element (e.g., no specific number)',
      fair: 'Hook is functional but generic, doesn\'t stand out from competitors',
      poor: 'Hook is too long, uses cliches, or fails to create curiosity'
    }
  },
  educational_value: {
    weight: 0.20,
    description: 'Delivers genuine insight or value that viewer didn\'t know before',
    criteria: [
      'Teaches something new and specific',
      'Includes real numbers, statistics, or formulas',
      'Not generic advice everyone already knows',
      'Explains the "why" not just the "what"',
      'Provides actionable takeaway'
    ],
    scoringGuide: {
      excellent: 'Reveals surprising insight with specific numbers, explains why it matters, gives clear action step',
      good: 'Good information but missing depth or specificity',
      fair: 'Information is mostly known but presented in new way',
      poor: 'Generic advice that adds no new value'
    }
  },
  pacing_rhythm: {
    weight: 0.15,
    description: 'Visual and narrative pacing keeps attention throughout',
    criteria: [
      'Visual change every 4-5 seconds (minimum 5-6 changes per video)',
      'Energy builds toward payoff',
      'No dead air or filler content',
      'Appropriate speed (slightly too fast = rewatches)',
      'Strong ending, energy doesn\'t fizzle'
    ],
    scoringGuide: {
      excellent: '6+ visual changes, energy peaks at payoff, strong ending',
      good: '5 visual changes, good energy flow but room for improvement',
      fair: '4 visual changes, some flat spots in energy',
      poor: 'Too few visual changes, energy is flat or inconsistent'
    }
  },
  save_worthiness: {
    weight: 0.15,
    description: 'Content is valuable enough to save for future reference',
    criteria: [
      'Contains specific formula, calculation, or framework',
      'Has memorable statistic worth referencing',
      'Includes step-by-step process or mini-framework',
      'Information not easily found elsewhere',
      'Would benefit from rewatching'
    ],
    scoringGuide: {
      excellent: 'Contains formula/framework AND memorable stat, viewer will save for reference',
      good: 'One strong save-worthy element (stat or framework)',
      fair: 'Interesting but not compelling enough to save',
      poor: 'Nothing worth saving or referencing later'
    }
  },
  structural_compliance: {
    weight: 0.10,
    description: 'Script follows the 30-second format requirements',
    criteria: [
      'Total duration 25-35 seconds',
      'Hook in first 3 seconds',
      '4-7 segments total',
      'Clear CTA at end',
      'Proper timestamp progression'
    ],
    scoringGuide: {
      excellent: 'Perfect 30-second structure with all elements',
      good: 'Minor deviation (e.g., 26 or 34 seconds)',
      fair: 'One structural issue (e.g., missing CTA)',
      poor: 'Multiple structural problems or wrong duration'
    }
  },
  emotional_resonance: {
    weight: 0.10,
    description: 'Content evokes intended emotional response',
    criteria: [
      'Aligns with target emotion (outrage, curiosity, surprise, aspiration, fear)',
      'Creates polarity/takes a stance',
      'Makes viewer feel something',
      'Triggers share impulse',
      'Avoids being boring or safe'
    ],
    scoringGuide: {
      excellent: 'Strong emotional hook, clear polarity, highly shareable',
      good: 'Emotional resonance present but could be stronger',
      fair: 'Some emotional element but feels safe',
      poor: 'No emotional connection, boring or generic'
    }
  },
  clarity_simplicity: {
    weight: 0.05,
    description: 'Message is clear and easy to understand',
    criteria: [
      'No jargon without explanation',
      'One main message per video',
      'Simple enough for casual viewer',
      'Complex ideas broken down',
      'Narration matches visual descriptions'
    ],
    scoringGuide: {
      excellent: 'Crystal clear message, complex idea made simple, visuals support narration',
      good: 'Clear but one minor clarity issue',
      fair: 'Mostly clear but some confusion possible',
      poor: 'Confusing, too complex, or jargon-heavy'
    }
  }
} as const;

export type QualityDimensionKey = keyof typeof QUALITY_RUBRIC;

/**
 * Build the prompt section for the rubric
 */
export function buildRubricPromptSection(): string {
  const sections = Object.entries(QUALITY_RUBRIC).map(([key, config]) => {
    return `
### ${key.toUpperCase().replace(/_/g, ' ')} (${(config.weight * 100).toFixed(0)}% weight)
${config.description}

Criteria:
${config.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Scoring Guide:
- 90-100 (Excellent): ${config.scoringGuide.excellent}
- 70-89 (Good): ${config.scoringGuide.good}
- 50-69 (Fair): ${config.scoringGuide.fair}
- 0-49 (Poor): ${config.scoringGuide.poor}`;
  });

  return sections.join('\n\n');
}

/**
 * Calculate weighted overall score from dimension scores
 */
export function calculateOverallScore(dimensionScores: Record<string, number>): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, config] of Object.entries(QUALITY_RUBRIC)) {
    const score = dimensionScores[key] ?? 0;
    weightedSum += score * config.weight;
    totalWeight += config.weight;
  }

  return Math.round(weightedSum / totalWeight);
}
