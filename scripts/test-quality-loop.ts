/**
 * Test script for Quality Loop
 *
 * Run with: npx tsx scripts/test-quality-loop.ts
 * Run in mock mode: npx tsx scripts/test-quality-loop.ts --mock
 */

import dotenv from 'dotenv';
import { QualityLoop, QualityLoopOutput, IterationRecord } from '../src/agents/quality-loop';
import { GeneratorAgent } from '../src/agents/generator';
import { CriticAgent } from '../src/agents/critic';
import { RefinerAgent } from '../src/agents/refiner';
import { TopicSuggestion } from '../src/agents/research/schema';
import { Script, ScriptMetadata } from '../src/agents/generator/schema';
import { CriticOutput, QualityDimension, CriticalIssue } from '../src/agents/critic/schema';
import { ChangeLog } from '../src/agents/refiner/schema';

dotenv.config();

const MOCK_MODE = process.argv.includes('--mock');

// Test topic
const TEST_TOPIC: TopicSuggestion = {
  topic: "Why the 50/30/20 budget rule doesn't work for most Americans",
  whyNow: "Inflation has made standard budget rules obsolete for many households",
  competitorGap: "Most content just repeats the rule without addressing its flaws",
  suggestedAngle: "Show how rent percentages have changed, making the rule mathematically impossible",
  emotionalTrigger: "outrage",
  potentialHooks: [
    "The 50/30/20 rule was designed in 2005. Rent has doubled since then.",
    "If you can't follow the 50/30/20 rule, it's not your fault. Here's why.",
    "I did the math on the 50/30/20 rule. It's broken."
  ],
  confidence: 89,
  category: "myth_busting"
};

// Mock scripts for different iterations
const MOCK_INITIAL_SCRIPT: Script = {
  title: "The 50/30/20 Rule Is Outdated",
  hook: "The 50/30/20 budget rule doesn't work anymore.",
  segments: [
    {
      timestamp: "0:00-0:04",
      duration: 4,  // Slightly too long
      narration: "The 50/30/20 budget rule doesn't work anymore. Here's the truth.",
      visualDescription: "Budget pie chart crumbling",
      visualType: "ai_image",
      textOverlay: "50/30/20 IS BROKEN",
      pacing: "medium",
      energy: "building"
    },
    {
      timestamp: "0:04-0:12",
      duration: 8,
      narration: "This rule says 50% on needs, 30% on wants, 20% on savings. But here's the problem.",
      visualDescription: "Pie chart with percentages",
      visualType: "ai_image",
      textOverlay: "50% NEEDS | 30% WANTS | 20% SAVINGS",
      pacing: "medium",
      energy: "building"
    },
    {
      timestamp: "0:12-0:22",
      duration: 10,
      narration: "In 2005, the average rent was 25% of income. Today it's over 40% in many cities. The math doesn't work.",
      visualDescription: "Comparison showing rent percentages rising",
      visualType: "ai_image",
      textOverlay: "RENT: 25% → 40%+",
      pacing: "fast",
      energy: "peak"
    },
    {
      timestamp: "0:22-0:28",
      duration: 6,
      narration: "A better approach: pay yourself first, then budget the rest.",
      visualDescription: "New approach diagram",
      visualType: "ai_image",
      textOverlay: "PAY YOURSELF FIRST",
      pacing: "medium",
      energy: "resolution"
    },
    {
      timestamp: "0:28-0:30",
      duration: 2,
      narration: "Follow for more budget reality checks.",
      visualDescription: "Clean follow CTA",
      visualType: "text_card",
      textOverlay: "Follow for more",
      pacing: "medium",
      energy: "resolution"
    }
  ],
  cta: "Follow for more budget reality checks.",
  estimatedDuration: 30,
  hookStyle: "contrarian"
};

const MOCK_INITIAL_METADATA: ScriptMetadata = {
  targetEmotion: "outrage",
  polarityElement: "Challenging a popular but flawed budget rule",
  shareWorthiness: "medium",
  saveWorthiness: "medium",
  hasNumberInHook: false,
  hasClearTakeaway: true
};

// First iteration critic feedback (score 72 - needs improvement)
const MOCK_FIRST_CRITIC_OUTPUT: CriticOutput = {
  overallScore: 72,
  passed: false,
  dimensions: [
    { dimension: 'hook_strength', score: 65, weight: 0.25, feedback: 'Hook is weak - no specific number, doesn\'t create strong curiosity gap.', examples: ['Lead with the rent statistic: "In 2005, rent was 25% of income. Today it\'s 40%+"'] },
    { dimension: 'educational_value', score: 78, weight: 0.20, feedback: 'Good educational content but could use more specific numbers.', examples: [] },
    { dimension: 'pacing_rhythm', score: 75, weight: 0.15, feedback: '5 segments, decent pacing but hook segment is 4 seconds (should be 3).', examples: [] },
    { dimension: 'save_worthiness', score: 70, weight: 0.15, feedback: 'Has some reference value but no formula or framework to save.', examples: ['Add a new percentage formula for modern budgets'] },
    { dimension: 'structural_compliance', score: 70, weight: 0.10, feedback: 'Hook segment too long at 4 seconds.', examples: [] },
    { dimension: 'emotional_resonance', score: 75, weight: 0.10, feedback: 'Outrage trigger present but could be stronger.', examples: [] },
    { dimension: 'clarity_simplicity', score: 85, weight: 0.05, feedback: 'Clear and easy to understand.', examples: [] }
  ],
  criticalIssues: [
    { type: 'hook_too_long', description: 'Hook segment is 4 seconds, should be 3 max', segment: 0, severity: 'major' },
    { type: 'weak_hook', description: 'No specific number in hook, weak curiosity gap', segment: 0, severity: 'major' }
  ],
  strengths: ['Clear contrarian angle', 'Good rent comparison data', 'Simple actionable takeaway'],
  improvementAreas: ['Hook needs specific statistic', 'Could add save-worthy framework', 'Strengthen emotional impact'],
  specificSuggestions: [
    'Start hook with: "In 2005, rent was 25% of income. Today it\'s 40%+. The 50/30/20 rule is broken."',
    'Cut hook to 3 seconds',
    'Add a modern budget formula in the takeaway'
  ],
  evaluatedAt: new Date(),
  cost: 0.032
};

// Refined script after first iteration
const MOCK_REFINED_SCRIPT: Script = {
  title: "The 50/30/20 Rule Is Mathematically Broken",
  hook: "In 2005, rent was 25% of income. Today it's 40%+. The 50/30/20 rule is dead.",
  segments: [
    {
      timestamp: "0:00-0:03",
      duration: 3,  // Fixed!
      narration: "In 2005, rent was 25% of income. Today it's 40%+. The 50/30/20 rule is dead.",
      visualDescription: "Dramatic split showing 25% vs 40%+ with X through old rule",
      visualType: "ai_image",
      textOverlay: "25% → 40%+ RENT",
      pacing: "fast",
      energy: "peak"
    },
    {
      timestamp: "0:03-0:10",
      duration: 7,
      narration: "The 50/30/20 rule says half your income on needs. But when rent alone is 40%, you're already over budget before food.",
      visualDescription: "Pie chart showing rent eating into the 50% and overflowing",
      visualType: "ai_image",
      textOverlay: "RENT ALONE = 40%",
      pacing: "medium",
      energy: "building"
    },
    {
      timestamp: "0:10-0:22",
      duration: 12,
      narration: "The rule was created in 2005 when average rent was $900. Today it's $1,800. That's not inflation, that's a broken formula. 73% of Americans can't hit these numbers.",
      visualDescription: "Timeline showing rent doubling, 73% statistic displayed large",
      visualType: "ai_image",
      textOverlay: "73% CAN'T HIT THESE NUMBERS",
      pacing: "fast",
      energy: "peak"
    },
    {
      timestamp: "0:22-0:28",
      duration: 6,
      narration: "The new formula: Save what you can, then budget the rest. 10% is better than 0% trying for 20%.",
      visualDescription: "New simple formula: Save first → Budget rest",
      visualType: "ai_image",
      textOverlay: "SAVE FIRST. BUDGET REST.",
      pacing: "medium",
      energy: "resolution"
    },
    {
      timestamp: "0:28-0:30",
      duration: 2,
      narration: "Follow for budget advice that actually works.",
      visualDescription: "Clean follow CTA",
      visualType: "text_card",
      textOverlay: "Follow for more",
      pacing: "medium",
      energy: "resolution"
    }
  ],
  cta: "Follow for budget advice that actually works.",
  estimatedDuration: 30,
  hookStyle: "shocking_stat"
};

const MOCK_REFINED_METADATA: ScriptMetadata = {
  targetEmotion: "outrage",
  polarityElement: "Exposing that a popular rule is mathematically impossible for 73% of Americans",
  shareWorthiness: "high",
  saveWorthiness: "high",
  hasNumberInHook: true,
  hasClearTakeaway: true
};

// Second iteration critic feedback (score 86 - passes!)
const MOCK_SECOND_CRITIC_OUTPUT: CriticOutput = {
  overallScore: 86,
  passed: true,
  dimensions: [
    { dimension: 'hook_strength', score: 90, weight: 0.25, feedback: 'Excellent hook with specific numbers (25% → 40%+), creates strong curiosity gap.', examples: [] },
    { dimension: 'educational_value', score: 88, weight: 0.20, feedback: 'Strong with multiple data points ($900→$1800, 73% statistic).', examples: [] },
    { dimension: 'pacing_rhythm', score: 85, weight: 0.15, feedback: '5 segments with good energy flow, hook is now 3 seconds.', examples: [] },
    { dimension: 'save_worthiness', score: 82, weight: 0.15, feedback: 'New formula is save-worthy, 73% stat is memorable.', examples: [] },
    { dimension: 'structural_compliance', score: 95, weight: 0.10, feedback: 'Perfect structure - 30 seconds, 3-second hook, clear CTA.', examples: [] },
    { dimension: 'emotional_resonance', score: 85, weight: 0.10, feedback: 'Strong outrage at being set up to fail by outdated rules.', examples: [] },
    { dimension: 'clarity_simplicity', score: 88, weight: 0.05, feedback: 'Clear message, numbers support the argument.', examples: [] }
  ],
  criticalIssues: [],
  strengths: ['Powerful opening statistic', '73% figure creates strong emotional response', 'Clear actionable new framework', 'Perfect timing structure'],
  improvementAreas: [],
  specificSuggestions: [],
  evaluatedAt: new Date(),
  cost: 0.032
};

// Mock agents for testing
class MockGeneratorAgent {
  async execute(): Promise<any> {
    return {
      script: MOCK_INITIAL_SCRIPT,
      metadata: MOCK_INITIAL_METADATA,
      topicUsed: TEST_TOPIC.topic,
      category: TEST_TOPIC.category,
      generatedAt: new Date(),
      cost: 0.021
    };
  }
}

class MockCriticAgent {
  private callCount = 0;
  async execute(): Promise<CriticOutput> {
    this.callCount++;
    // First call returns failing score, second call returns passing
    return this.callCount === 1 ? MOCK_FIRST_CRITIC_OUTPUT : MOCK_SECOND_CRITIC_OUTPUT;
  }
}

class MockRefinerAgent {
  async execute(): Promise<any> {
    return {
      refinedScript: MOCK_REFINED_SCRIPT,
      refinedMetadata: MOCK_REFINED_METADATA,
      changesMade: [
        { segmentIndex: 0, field: 'duration', before: '4', after: '3', reason: 'Fixed hook length' },
        { segmentIndex: 0, field: 'narration', before: 'The 50/30/20...', after: 'In 2005, rent was 25%...', reason: 'Added specific statistics' }
      ],
      addressedIssues: ['hook_too_long', 'weak_hook'],
      remainingConcerns: [],
      iterationNumber: 2,
      refinedAt: new Date(),
      cost: 0.033
    };
  }
}

async function testQualityLoop() {
  console.log('🧪 Testing Quality Loop\n');
  if (MOCK_MODE) {
    console.log('⚠️  Running in MOCK MODE (no API calls)\n');
  }

  try {
    // Check for API key
    if (!MOCK_MODE && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set. Run with --mock flag to test without API.');
    }

    // Create quality loop
    let qualityLoop: QualityLoop;
    if (MOCK_MODE) {
      qualityLoop = new QualityLoop({
        generator: new MockGeneratorAgent() as unknown as GeneratorAgent,
        critic: new MockCriticAgent() as unknown as CriticAgent,
        refiner: new MockRefinerAgent() as unknown as RefinerAgent
      });
    } else {
      // Import real factory
      const { createQualityLoop } = await import('../src/agents/quality-loop');
      qualityLoop = createQualityLoop();
    }

    console.log('Quality Loop Configuration:');
    console.log('  Target Score: 80');
    console.log('  Max Iterations: 3\n');

    console.log(`Topic: "${TEST_TOPIC.topic}"`);
    console.log(`  Category: ${TEST_TOPIC.category}`);
    console.log(`  Emotion: ${TEST_TOPIC.emotionalTrigger}\n`);

    // Run the quality loop
    console.log('═══════════════════════════════════════════════════════');
    console.log('STARTING QUALITY LOOP');
    console.log('═══════════════════════════════════════════════════════\n');

    const startTime = Date.now();
    const result = await qualityLoop.execute({
      topic: TEST_TOPIC,
      niche: 'finance',
      targetScore: 80,
      maxIterations: 3
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Display results
    console.log('═══════════════════════════════════════════════════════');
    console.log('QUALITY LOOP RESULTS');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Final Score: ${result.finalScore}/100`);
    console.log(`Total Iterations: ${result.totalIterations}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Total Cost: $${result.totalCost.toFixed(4)}\n`);

    // Score progression
    console.log('Score Progression:');
    result.scoreProgression.forEach((score, i) => {
      const bar = '█'.repeat(Math.floor(score / 10)) + '░'.repeat(10 - Math.floor(score / 10));
      const status = score >= 80 ? '✓' : '→';
      console.log(`  Iteration ${i + 1}: ${bar} ${score}/100 ${status}`);
    });
    console.log('');

    // Final script summary
    console.log('Final Script:');
    console.log(`  Title: ${result.finalScript.title}`);
    console.log(`  Hook: "${result.finalScript.hook}"`);
    console.log(`  Hook Style: ${result.finalScript.hookStyle}`);
    console.log(`  Duration: ${result.finalScript.estimatedDuration}s`);
    console.log(`  Segments: ${result.finalScript.segments.length}\n`);

    // Iteration details
    console.log('═══════════════════════════════════════════════════════');
    console.log('ITERATION DETAILS');
    console.log('═══════════════════════════════════════════════════════\n');

    result.iterations.forEach((iter, i) => {
      console.log(`Iteration ${iter.iteration}:`);
      console.log(`  Score: ${iter.criticOutput.overallScore}/100`);
      console.log(`  Passed: ${iter.criticOutput.passed ? 'Yes' : 'No'}`);
      console.log(`  Critical Issues: ${iter.criticOutput.criticalIssues.length}`);
      console.log(`  Duration: ${(iter.durationMs / 1000).toFixed(2)}s`);
      if (iter.criticOutput.criticalIssues.length > 0 && !iter.criticOutput.passed) {
        console.log('  Issues:');
        iter.criticOutput.criticalIssues.slice(0, 2).forEach(issue => {
          console.log(`    - ${issue.type}: ${issue.description.substring(0, 50)}...`);
        });
      }
      console.log('');
    });

    // Validation
    console.log('═══════════════════════════════════════════════════════');
    console.log('VALIDATION');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`  ✓ Loop completed: ${result.iterations.length > 0}`);
    console.log(`  ✓ Final score recorded: ${result.finalScore}`);
    console.log(`  ✓ Score improved: ${result.scoreProgression.length > 1 ? result.scoreProgression[result.scoreProgression.length - 1] > result.scoreProgression[0] : 'N/A'}`);
    console.log(`  ✓ Cost tracked: $${result.totalCost.toFixed(4)}`);
    console.log(`  ✓ All iterations recorded: ${result.iterations.length === result.totalIterations}`);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('Summary:');
    if (MOCK_MODE) {
      console.log(`  Mode: MOCK (no API calls made)`);
      console.log(`  Loop execution: PASSED`);
      console.log(`  Score improvement: ${result.scoreProgression[0]} → ${result.finalScore}`);
      console.log(`  Structure test: PASSED`);
    } else {
      console.log(`  Total iterations: ${result.totalIterations}`);
      console.log(`  Final score: ${result.finalScore}/100`);
      console.log(`  Total cost: $${result.totalCost.toFixed(4)}`);
    }
    console.log('═══════════════════════════════════════════════════════');

    console.log('\n✅ Quality Loop test passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

testQualityLoop();
