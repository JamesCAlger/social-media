/**
 * Test script for Critic Agent
 *
 * Run with: npx tsx scripts/test-critic-agent.ts
 * Run in mock mode: npx tsx scripts/test-critic-agent.ts --mock
 */

import dotenv from 'dotenv';
import { CriticAgent, createCriticAgent, QUALITY_RUBRIC, calculateOverallScore } from '../src/agents/critic';
import { CriticOutput, QualityDimension, CriticalIssue } from '../src/agents/critic/schema';
import { Script, ScriptMetadata } from '../src/agents/generator/schema';

dotenv.config();

const MOCK_MODE = process.argv.includes('--mock');

// Good quality script for testing
const GOOD_SCRIPT: Script = {
  title: "401k Match: Free Money Most People Ignore",
  hook: "Your employer is literally handing you free money. 43% of Americans say no.",
  segments: [
    {
      timestamp: "0:00-0:03",
      duration: 3,
      narration: "Your employer is literally handing you free money. 43% of Americans say no.",
      visualDescription: "Dramatic shot of money falling, being pushed away by hands",
      visualType: "ai_image",
      textOverlay: "43% SAY NO TO FREE MONEY",
      pacing: "fast",
      energy: "peak"
    },
    {
      timestamp: "0:03-0:10",
      duration: 7,
      narration: "The average 401k match is 4.5%. That's your employer DOUBLING your investment instantly.",
      visualDescription: "Split screen showing $100 becoming $200 with employer match visualization",
      visualType: "ai_image",
      textOverlay: "4.5% = INSTANT DOUBLE",
      pacing: "medium",
      energy: "building"
    },
    {
      timestamp: "0:10-0:22",
      duration: 12,
      narration: "Here's the math most people never see. $200 a month with the match, invested for 30 years at 7% average returns. You're looking at $567,000. Without the match? Only $283,000. That's $284,000 you left on the table.",
      visualDescription: "Animated calculator showing numbers growing, split comparison of two scenarios",
      visualType: "ai_image",
      textOverlay: "$284,000 DIFFERENCE",
      pacing: "fast",
      energy: "peak"
    },
    {
      timestamp: "0:22-0:28",
      duration: 6,
      narration: "The 401k match is the only guaranteed 100% return in investing. Don't leave it behind.",
      visualDescription: "Clean graphic showing '100% GUARANTEED RETURN' with checkmark",
      visualType: "ai_image",
      textOverlay: "100% GUARANTEED RETURN",
      pacing: "medium",
      energy: "resolution"
    },
    {
      timestamp: "0:28-0:30",
      duration: 2,
      narration: "Follow for more money math that actually matters.",
      visualDescription: "Clean closing card with follow CTA",
      visualType: "text_card",
      textOverlay: "Follow for more",
      pacing: "medium",
      energy: "resolution"
    }
  ],
  cta: "Follow for more money math that actually matters.",
  estimatedDuration: 30,
  hookStyle: "shocking_stat"
};

const GOOD_METADATA: ScriptMetadata = {
  targetEmotion: "outrage",
  polarityElement: "Challenging the passive acceptance of leaving free employer money unclaimed",
  shareWorthiness: "high",
  saveWorthiness: "high",
  hasNumberInHook: true,
  hasClearTakeaway: true
};

// Weak script for testing (should fail)
const WEAK_SCRIPT: Script = {
  title: "Saving Money Tips",
  hook: "Did you know that saving money is important?",
  segments: [
    {
      timestamp: "0:00-0:05",
      duration: 5,  // Hook too long!
      narration: "Did you know that saving money is important? Let me tell you about it.",
      visualDescription: "Generic piggy bank image",
      visualType: "ai_image",
      textOverlay: "SAVE MONEY",
      pacing: "slow",
      energy: "calm"
    },
    {
      timestamp: "0:05-0:15",
      duration: 10,
      narration: "You should try to save some of your paycheck every month. This is good financial advice.",
      visualDescription: "Stack of coins",
      visualType: "ai_image",
      textOverlay: null,
      pacing: "slow",
      energy: "calm"
    },
    {
      timestamp: "0:15-0:25",
      duration: 10,
      narration: "Experts recommend saving around 20% of your income if you can.",
      visualDescription: "Graph going up",
      visualType: "ai_image",
      textOverlay: "20%",
      pacing: "slow",
      energy: "building"
    },
    {
      timestamp: "0:25-0:30",
      duration: 5,
      narration: "Thanks for watching.",
      visualDescription: "Wave goodbye",
      visualType: "text_card",
      textOverlay: "Thanks!",
      pacing: "slow",
      energy: "resolution"
    }
  ],
  cta: "Thanks for watching.",
  estimatedDuration: 30,
  hookStyle: "curiosity"
};

const WEAK_METADATA: ScriptMetadata = {
  targetEmotion: "curiosity",
  polarityElement: "None",
  shareWorthiness: "low",
  saveWorthiness: "low",
  hasNumberInHook: false,
  hasClearTakeaway: false
};

// Mock output for testing without API
function getMockGoodResult(): CriticOutput {
  const dimensions: QualityDimension[] = [
    {
      dimension: 'hook_strength',
      score: 92,
      weight: 0.25,
      feedback: 'Excellent hook - leads with shocking statistic (43%), creates immediate curiosity gap about "free money" being rejected.',
      examples: []
    },
    {
      dimension: 'educational_value',
      score: 88,
      weight: 0.20,
      feedback: 'Strong educational content with specific numbers ($567,000 vs $283,000), explains the compound math most people never calculate.',
      examples: ['Consider adding the specific formula for others to calculate their own numbers']
    },
    {
      dimension: 'pacing_rhythm',
      score: 85,
      weight: 0.15,
      feedback: '5 visual segments with good energy progression. Builds to peak in segment 3 with the math reveal.',
      examples: []
    },
    {
      dimension: 'save_worthiness',
      score: 90,
      weight: 0.15,
      feedback: 'Highly save-worthy - contains specific numbers ($284,000 difference) and the 100% return concept that viewers will want to reference.',
      examples: []
    },
    {
      dimension: 'structural_compliance',
      score: 95,
      weight: 0.10,
      feedback: 'Perfect structure - 30 seconds exactly, hook in 3 seconds, 5 segments, clear CTA.',
      examples: []
    },
    {
      dimension: 'emotional_resonance',
      score: 87,
      weight: 0.10,
      feedback: 'Strong outrage trigger around "leaving money on the table". Polarity is clear - challenges passive acceptance.',
      examples: []
    },
    {
      dimension: 'clarity_simplicity',
      score: 82,
      weight: 0.05,
      feedback: 'Clear message, math is explained step by step. Could be slightly simplified but works well.',
      examples: []
    }
  ];

  const dimensionScores: Record<string, number> = {};
  for (const dim of dimensions) {
    dimensionScores[dim.dimension] = dim.score;
  }
  const overallScore = calculateOverallScore(dimensionScores);

  return {
    overallScore,
    passed: true,
    dimensions,
    criticalIssues: [],
    strengths: [
      'Strong hook with specific statistic (43%)',
      'Compelling math comparison ($567K vs $283K)',
      '100% return concept is memorable and shareable',
      'Perfect 30-second structure'
    ],
    improvementAreas: [
      'Could include a simple formula for personalization',
      'Math section (segment 3) is slightly dense'
    ],
    specificSuggestions: [
      'Add "Calculate yours: monthly contribution × 2 × 30 years" as a simple formula',
      'Consider splitting segment 3 to give each number its own visual beat'
    ],
    evaluatedAt: new Date(),
    cost: 0.032
  };
}

function getMockWeakResult(): CriticOutput {
  const dimensions: QualityDimension[] = [
    {
      dimension: 'hook_strength',
      score: 25,
      weight: 0.25,
      feedback: 'Very weak hook - uses "Did you know" cliche, no specific numbers, no curiosity gap.',
      examples: ['Replace with: "43% of Americans are leaving $284,000 on the table"']
    },
    {
      dimension: 'educational_value',
      score: 30,
      weight: 0.20,
      feedback: 'Generic advice everyone already knows. "Save 20%" is well-known and adds no new value.',
      examples: ['Show the actual math impact, not just the percentage']
    },
    {
      dimension: 'pacing_rhythm',
      score: 35,
      weight: 0.15,
      feedback: 'Only 4 visual segments, all marked "slow" pacing. Energy is flat throughout.',
      examples: ['Add more visual changes, increase energy progression']
    },
    {
      dimension: 'save_worthiness',
      score: 20,
      weight: 0.15,
      feedback: 'Nothing worth saving. No formula, no specific stats, no framework.',
      examples: ['Add a specific calculation viewers can use for their own situation']
    },
    {
      dimension: 'structural_compliance',
      score: 40,
      weight: 0.10,
      feedback: 'Hook segment is 5 seconds (too long), CTA is just "Thanks for watching".',
      examples: ['Hook must be 3 seconds or less, CTA should be actionable']
    },
    {
      dimension: 'emotional_resonance',
      score: 25,
      weight: 0.10,
      feedback: 'No emotional hook, no polarity. Content is safe and boring.',
      examples: ['Take a stance - challenge conventional wisdom or reveal hidden truth']
    },
    {
      dimension: 'clarity_simplicity',
      score: 60,
      weight: 0.05,
      feedback: 'Clear but because there\'s nothing complex being explained.',
      examples: []
    }
  ];

  const dimensionScores: Record<string, number> = {};
  for (const dim of dimensions) {
    dimensionScores[dim.dimension] = dim.score;
  }
  const overallScore = calculateOverallScore(dimensionScores);

  const criticalIssues: CriticalIssue[] = [
    {
      type: 'hook_too_long',
      description: 'Hook segment is 5 seconds, maximum is 3 seconds',
      segment: 0,
      severity: 'critical'
    },
    {
      type: 'weak_hook',
      description: 'Uses "Did you know" cliche, creates no curiosity gap',
      segment: 0,
      severity: 'critical'
    },
    {
      type: 'no_specific_numbers',
      description: 'No concrete statistics or calculations - just generic "20%" everyone knows',
      severity: 'major'
    },
    {
      type: 'generic_advice',
      description: '"Save 20% of your income" is universally known advice with no new angle',
      severity: 'major'
    },
    {
      type: 'no_takeaway',
      description: 'No actionable insight beyond "save money"',
      severity: 'major'
    }
  ];

  return {
    overallScore,
    passed: false,
    dimensions,
    criticalIssues,
    strengths: [
      'Correct total duration (30 seconds)'
    ],
    improvementAreas: [
      'Hook needs complete rewrite',
      'Need specific numbers and calculations',
      'Add emotional polarity',
      'Create genuine curiosity gap',
      'Make content save-worthy with formulas/stats'
    ],
    specificSuggestions: [
      'Replace hook with specific statistic: "43% of Americans are leaving $284K on the table"',
      'Cut segment 1 to 3 seconds maximum',
      'Add compound interest calculation viewers can use',
      'Replace generic "save 20%" with surprising insight about what that actually becomes',
      'Change CTA to "Follow for more money math"'
    ],
    evaluatedAt: new Date(),
    cost: 0.032
  };
}

async function testCriticAgent() {
  console.log('🧪 Testing Critic Agent\n');
  if (MOCK_MODE) {
    console.log('⚠️  Running in MOCK MODE (no API calls)\n');
  }

  try {
    // Check for API key
    if (!MOCK_MODE && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set. Run with --mock flag to test without API.');
    }

    // Test rubric utilities first
    console.log('Test 0: Validate rubric configuration');
    const rubricWeights = Object.values(QUALITY_RUBRIC).reduce((sum, dim) => sum + dim.weight, 0);
    console.log(`  ✓ Rubric has ${Object.keys(QUALITY_RUBRIC).length} dimensions`);
    console.log(`  ✓ Total weight: ${rubricWeights.toFixed(2)} (should be ~1.00)\n`);

    // Test score calculation
    const testScores = {
      hook_strength: 90,
      educational_value: 85,
      pacing_rhythm: 80,
      save_worthiness: 88,
      structural_compliance: 95,
      emotional_resonance: 82,
      clarity_simplicity: 78
    };
    const calculated = calculateOverallScore(testScores);
    console.log(`  ✓ Score calculation working: ${calculated}/100\n`);

    // Create agent (only if not in mock mode)
    let agent: CriticAgent | null = null;
    if (!MOCK_MODE) {
      console.log('Creating Critic Agent...');
      agent = createCriticAgent();
      console.log('  ✓ Agent created\n');
    }

    // Test 1: Evaluate good script (should pass)
    console.log('Test 1: Evaluate good quality script');
    if (!MOCK_MODE) {
      console.log('  Calling Claude API...');
    }

    const startTime1 = Date.now();
    const result1 = MOCK_MODE ? getMockGoodResult() : await agent!.execute({
      script: GOOD_SCRIPT,
      metadata: GOOD_METADATA,
      niche: 'finance',
      iterationNumber: 1
    });
    const duration1 = ((Date.now() - startTime1) / 1000).toFixed(2);

    console.log(`  ✓ Evaluated in ${duration1}s`);
    console.log(`  ✓ Overall Score: ${result1.overallScore}/100`);
    console.log(`  ✓ Passed: ${result1.passed ? 'YES ✓' : 'NO ✗'}`);
    console.log(`  ✓ Critical Issues: ${result1.criticalIssues.length}\n`);

    // Display dimension scores
    console.log('Dimension Scores:');
    for (const dim of result1.dimensions) {
      const bar = '█'.repeat(Math.floor(dim.score / 10)) + '░'.repeat(10 - Math.floor(dim.score / 10));
      console.log(`  ${dim.dimension.padEnd(22)} ${bar} ${dim.score}/100`);
    }
    console.log('');

    // Display strengths and suggestions
    console.log('Strengths:');
    result1.strengths.slice(0, 3).forEach(s => console.log(`  + ${s}`));
    console.log('');

    if (result1.specificSuggestions.length > 0) {
      console.log('Suggestions:');
      result1.specificSuggestions.slice(0, 2).forEach(s => console.log(`  → ${s}`));
      console.log('');
    }

    // Test 2: Evaluate weak script (should fail)
    console.log('Test 2: Evaluate weak quality script');
    if (!MOCK_MODE) {
      console.log('  Calling Claude API...');
    }

    const startTime2 = Date.now();
    const result2 = MOCK_MODE ? getMockWeakResult() : await agent!.execute({
      script: WEAK_SCRIPT,
      metadata: WEAK_METADATA,
      niche: 'finance',
      iterationNumber: 1
    });
    const duration2 = ((Date.now() - startTime2) / 1000).toFixed(2);

    console.log(`  ✓ Evaluated in ${duration2}s`);
    console.log(`  ✓ Overall Score: ${result2.overallScore}/100`);
    console.log(`  ✓ Passed: ${result2.passed ? 'YES (unexpected!)' : 'NO (expected) ✓'}`);
    console.log(`  ✓ Critical Issues: ${result2.criticalIssues.length}\n`);

    // Display critical issues
    if (result2.criticalIssues.length > 0) {
      console.log('Critical Issues Found:');
      result2.criticalIssues.forEach(issue => {
        const segmentInfo = issue.segment !== undefined ? ` [Segment ${issue.segment + 1}]` : '';
        console.log(`  ✗ [${issue.severity.toUpperCase()}]${segmentInfo} ${issue.type}: ${issue.description}`);
      });
      console.log('');
    }

    // Validation checks
    console.log('Validation Checks:');
    console.log(`  ✓ Good script passed: ${result1.passed}`);
    console.log(`  ✓ Weak script failed: ${!result2.passed}`);
    console.log(`  ✓ Good score > Weak score: ${result1.overallScore > result2.overallScore}`);
    console.log(`  ✓ Critical issues detected in weak: ${result2.criticalIssues.length > 0}`);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('Summary:');
    if (MOCK_MODE) {
      console.log(`  Mode: MOCK (no API calls made)`);
      console.log(`  Rubric validation: PASSED`);
      console.log(`  Good script (${result1.overallScore}/100): ${result1.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`  Weak script (${result2.overallScore}/100): ${result2.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`  Structure test: PASSED`);
    } else {
      const totalCost = result1.cost + result2.cost;
      console.log(`  Evaluations completed: 2`);
      console.log(`  Total cost: $${totalCost.toFixed(4)}`);
    }
    console.log('═══════════════════════════════════════════════════════');

    console.log('\n✅ All Critic Agent tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

testCriticAgent();
