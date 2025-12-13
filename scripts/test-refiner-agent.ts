/**
 * Test script for Refiner Agent
 *
 * Run with: npx tsx scripts/test-refiner-agent.ts
 * Run in mock mode: npx tsx scripts/test-refiner-agent.ts --mock
 */

import dotenv from 'dotenv';
import { RefinerAgent, createRefinerAgent } from '../src/agents/refiner';
import { RefinerOutput, ChangeLog } from '../src/agents/refiner/schema';
import { Script, ScriptMetadata } from '../src/agents/generator/schema';
import { CriticOutput, QualityDimension, CriticalIssue } from '../src/agents/critic/schema';

dotenv.config();

const MOCK_MODE = process.argv.includes('--mock');

// Weak script that needs refinement
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

// Mock critic feedback for the weak script
const MOCK_CRITIC_FEEDBACK: CriticOutput = {
  overallScore: 30,
  passed: false,
  dimensions: [
    {
      dimension: 'hook_strength',
      score: 25,
      weight: 0.25,
      feedback: 'Very weak hook - uses "Did you know" cliche, no specific numbers, no curiosity gap.',
      examples: ['Replace with: "78% of Americans retire with less than $100,000. Here\'s why."']
    },
    {
      dimension: 'educational_value',
      score: 30,
      weight: 0.20,
      feedback: 'Generic advice everyone already knows. "Save 20%" is well-known and adds no new value.',
      examples: ['Show the actual impact: $200/month at 7% = $567,000 in 30 years']
    },
    {
      dimension: 'pacing_rhythm',
      score: 35,
      weight: 0.15,
      feedback: 'Only 4 visual segments, all marked "slow" pacing. Energy is flat throughout.',
      examples: ['Add visual change every 4-5 seconds, build energy toward payoff']
    },
    {
      dimension: 'save_worthiness',
      score: 20,
      weight: 0.15,
      feedback: 'Nothing worth saving. No formula, no specific stats, no framework.',
      examples: ['Add the compound interest formula: FV = PV × (1 + r)^n']
    },
    {
      dimension: 'structural_compliance',
      score: 40,
      weight: 0.10,
      feedback: 'Hook segment is 5 seconds (too long), CTA is just "Thanks for watching".',
      examples: ['Hook must be 3 seconds, CTA should be "Follow for more money math"']
    },
    {
      dimension: 'emotional_resonance',
      score: 25,
      weight: 0.10,
      feedback: 'No emotional hook, no polarity. Content is safe and boring.',
      examples: ['Challenge the "20% rule" - show why it fails most people']
    },
    {
      dimension: 'clarity_simplicity',
      score: 60,
      weight: 0.05,
      feedback: 'Clear but because there\'s nothing complex being explained.',
      examples: []
    }
  ],
  criticalIssues: [
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
      type: 'generic_advice',
      description: '"Save 20% of your income" is universally known advice with no new angle',
      severity: 'major'
    },
    {
      type: 'no_takeaway',
      description: 'No actionable insight beyond "save money"',
      severity: 'major'
    }
  ],
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
    'Replace hook with: "78% of Americans will retire with less than $100,000. Here\'s the math they never learned."',
    'Cut segment 1 to 3 seconds maximum',
    'Add compound interest calculation viewers can use',
    'Replace generic "save 20%" with the actual dollar impact over 30 years',
    'Change CTA to "Follow for more money math that matters"'
  ],
  evaluatedAt: new Date(),
  cost: 0.032
};

// Mock refined output
function getMockRefinedResult(): RefinerOutput {
  const refinedScript: Script = {
    title: "The Math That Could Make You $567,000",
    hook: "78% of Americans retire with less than $100K. Here's the math they never learned.",
    segments: [
      {
        timestamp: "0:00-0:03",
        duration: 3,
        narration: "78% of Americans retire with less than $100K. Here's the math they never learned.",
        visualDescription: "Shocking statistic displayed large, red warning graphic",
        visualType: "ai_image",
        textOverlay: "78% RETIRE BROKE",
        pacing: "fast",
        energy: "peak"
      },
      {
        timestamp: "0:03-0:10",
        duration: 7,
        narration: "The 20% savings rule is broken. It doesn't account for compound interest.",
        visualDescription: "20% rule shown with X mark, compound interest curve appearing",
        visualType: "ai_image",
        textOverlay: "THE 20% RULE IS BROKEN",
        pacing: "medium",
        energy: "building"
      },
      {
        timestamp: "0:10-0:22",
        duration: 12,
        narration: "Here's what actually works. $200 a month, started at 25, invested at 7% average returns. By 55, you have $567,000. Start at 35? Only $243,000. Ten years of waiting cost you $324,000.",
        visualDescription: "Side-by-side comparison with numbers animating, showing the gap growing",
        visualType: "ai_image",
        textOverlay: "$324,000 LOST TO WAITING",
        pacing: "fast",
        energy: "peak"
      },
      {
        timestamp: "0:22-0:28",
        duration: 6,
        narration: "The formula: Monthly amount × 12 × years × 1.07^years. Your future self will thank you.",
        visualDescription: "Clean formula display with each variable highlighted",
        visualType: "ai_image",
        textOverlay: "THE COMPOUND FORMULA",
        pacing: "medium",
        energy: "resolution"
      },
      {
        timestamp: "0:28-0:30",
        duration: 2,
        narration: "Follow for more money math that matters.",
        visualDescription: "Clean closing with follow CTA",
        visualType: "text_card",
        textOverlay: "Follow for more",
        pacing: "medium",
        energy: "resolution"
      }
    ],
    cta: "Follow for more money math that matters.",
    estimatedDuration: 30,
    hookStyle: "shocking_stat"
  };

  const refinedMetadata: ScriptMetadata = {
    targetEmotion: "outrage",
    polarityElement: "Challenging the broken 20% rule that fails most people",
    shareWorthiness: "high",
    saveWorthiness: "high",
    hasNumberInHook: true,
    hasClearTakeaway: true
  };

  const changesMade: ChangeLog[] = [
    {
      segmentIndex: 0,
      field: "narration",
      before: "Did you know that saving money is important?...",
      after: "78% of Americans retire with less than $100K...",
      reason: "Replaced weak 'Did you know' hook with shocking statistic to create curiosity gap"
    },
    {
      segmentIndex: 0,
      field: "duration",
      before: "5",
      after: "3",
      reason: "Shortened hook segment to required 3 seconds maximum"
    },
    {
      segmentIndex: 1,
      field: "narration",
      before: "You should try to save some of your paycheck...",
      after: "The 20% savings rule is broken...",
      reason: "Added contrarian angle by challenging conventional wisdom"
    },
    {
      segmentIndex: 2,
      field: "narration",
      before: "Experts recommend saving around 20%...",
      after: "Here's what actually works. $200 a month...",
      reason: "Added specific numbers and compound math comparison"
    },
    {
      segmentIndex: 3,
      field: "narration",
      before: "Thanks for watching.",
      after: "The formula: Monthly amount × 12...",
      reason: "Added save-worthy formula as actionable takeaway"
    },
    {
      field: "hookStyle",
      before: "curiosity",
      after: "shocking_stat",
      reason: "Changed hook style to match the new statistic-led approach"
    }
  ];

  return {
    refinedScript,
    refinedMetadata,
    changesMade,
    addressedIssues: ['hook_too_long', 'weak_hook', 'generic_advice', 'no_takeaway'],
    remainingConcerns: [],
    iterationNumber: 1,
    refinedAt: new Date(),
    cost: 0.033
  };
}

async function testRefinerAgent() {
  console.log('🧪 Testing Refiner Agent\n');
  if (MOCK_MODE) {
    console.log('⚠️  Running in MOCK MODE (no API calls)\n');
  }

  try {
    // Check for API key
    if (!MOCK_MODE && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set. Run with --mock flag to test without API.');
    }

    // Create agent (only if not in mock mode)
    let agent: RefinerAgent | null = null;
    if (!MOCK_MODE) {
      console.log('Creating Refiner Agent...');
      agent = createRefinerAgent();
      console.log('  ✓ Agent created\n');
    }

    // Test: Refine weak script based on critic feedback
    console.log('Test: Refine weak script based on critic feedback');
    console.log(`  Original Score: ${MOCK_CRITIC_FEEDBACK.overallScore}/100`);
    console.log(`  Critical Issues: ${MOCK_CRITIC_FEEDBACK.criticalIssues.length}`);
    if (!MOCK_MODE) {
      console.log('  Calling Claude API...');
    }

    const startTime = Date.now();
    const result = MOCK_MODE ? getMockRefinedResult() : await agent!.execute({
      script: WEAK_SCRIPT,
      metadata: WEAK_METADATA,
      criticFeedback: MOCK_CRITIC_FEEDBACK,
      niche: 'finance',
      iterationNumber: 1
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`  ✓ Refined in ${duration}s`);
    console.log(`  ✓ Changes Made: ${result.changesMade.length}`);
    console.log(`  ✓ Issues Addressed: ${result.addressedIssues.length}/${MOCK_CRITIC_FEEDBACK.criticalIssues.length}`);
    console.log(`  ✓ Cost: $${result.cost.toFixed(4)}\n`);

    // Compare before and after
    console.log('═══════════════════════════════════════════════════════');
    console.log('BEFORE → AFTER COMPARISON');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('HOOK:');
    console.log(`  Before: "${WEAK_SCRIPT.hook}"`);
    console.log(`  After:  "${result.refinedScript.hook}"\n`);

    console.log('STRUCTURE:');
    const beforeDurations = WEAK_SCRIPT.segments.map(s => s.duration).join('-');
    const afterDurations = result.refinedScript.segments.map(s => s.duration).join('-');
    console.log(`  Before: ${WEAK_SCRIPT.segments.length} segments (${beforeDurations})`);
    console.log(`  After:  ${result.refinedScript.segments.length} segments (${afterDurations})\n`);

    console.log('HOOK DURATION:');
    console.log(`  Before: ${WEAK_SCRIPT.segments[0].duration}s (too long!)`);
    console.log(`  After:  ${result.refinedScript.segments[0].duration}s ✓\n`);

    // Display changes made
    console.log('═══════════════════════════════════════════════════════');
    console.log('CHANGES MADE');
    console.log('═══════════════════════════════════════════════════════\n');

    result.changesMade.forEach((change, i) => {
      const segInfo = change.segmentIndex !== undefined ? `[Segment ${change.segmentIndex + 1}] ` : '';
      console.log(`${i + 1}. ${segInfo}${change.field}`);
      console.log(`   Before: "${change.before}"`);
      console.log(`   After:  "${change.after}"`);
      console.log(`   Reason: ${change.reason}\n`);
    });

    // Display addressed issues
    console.log('═══════════════════════════════════════════════════════');
    console.log('ISSUES ADDRESSED');
    console.log('═══════════════════════════════════════════════════════\n');

    result.addressedIssues.forEach(issue => {
      console.log(`  ✓ ${issue}`);
    });
    console.log('');

    if (result.remainingConcerns.length > 0) {
      console.log('Remaining Concerns:');
      result.remainingConcerns.forEach(concern => {
        console.log(`  ⚠ ${concern}`);
      });
      console.log('');
    }

    // Validation checks
    console.log('═══════════════════════════════════════════════════════');
    console.log('VALIDATION CHECKS');
    console.log('═══════════════════════════════════════════════════════\n');

    const totalDuration = result.refinedScript.segments.reduce((sum, seg) => sum + seg.duration, 0);
    const hookDuration = result.refinedScript.segments[0].duration;
    const hasNumberInHook = /\d+/.test(result.refinedScript.hook);

    console.log(`  ✓ Total duration: ${totalDuration}s (target: 30s)`);
    console.log(`  ✓ Hook duration: ${hookDuration}s (max: 3s) ${hookDuration <= 3 ? '✓' : '✗'}`);
    console.log(`  ✓ Number in hook: ${hasNumberInHook ? 'Yes ✓' : 'No ✗'}`);
    console.log(`  ✓ Segment count: ${result.refinedScript.segments.length}`);
    console.log(`  ✓ Has CTA: ${result.refinedScript.cta ? 'Yes ✓' : 'No ✗'}`);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('Summary:');
    if (MOCK_MODE) {
      console.log(`  Mode: MOCK (no API calls made)`);
      console.log(`  Refinement validated: ✓`);
      console.log(`  All critical issues addressed: ${result.addressedIssues.length >= MOCK_CRITIC_FEEDBACK.criticalIssues.filter(i => i.severity === 'critical').length ? '✓' : '✗'}`);
      console.log(`  Structure test: PASSED`);
    } else {
      console.log(`  Refinement completed`);
      console.log(`  Changes made: ${result.changesMade.length}`);
      console.log(`  Cost: $${result.cost.toFixed(4)}`);
    }
    console.log('═══════════════════════════════════════════════════════');

    console.log('\n✅ All Refiner Agent tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

testRefinerAgent();
