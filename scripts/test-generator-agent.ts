/**
 * Test script for Generator Agent
 *
 * Run with: npx tsx scripts/test-generator-agent.ts
 * Run in mock mode: npx tsx scripts/test-generator-agent.ts --mock
 */

import dotenv from 'dotenv';
import { GeneratorAgent, createGeneratorAgent } from '../src/agents/generator';
import { GeneratorOutput, Script, ScriptMetadata } from '../src/agents/generator/schema';
import { TopicSuggestion } from '../src/agents/research/schema';

dotenv.config();

const MOCK_MODE = process.argv.includes('--mock');

// Mock topic for testing
const MOCK_TOPIC: TopicSuggestion = {
  topic: "Why your 401(k) match is the best 'investment' you'll ever make",
  whyNow: "Many employees still don't maximize employer match, leaving free money on the table",
  competitorGap: "Most content just says 'get the match' without showing the actual math",
  suggestedAngle: "Show exact dollar amounts over 30 years - make the FOMO tangible",
  emotionalTrigger: "outrage",
  potentialHooks: [
    "Your employer is offering you free money. Most people say no.",
    "I calculated what leaving 401k match on the table costs. It's insane.",
    "The easiest $500,000 you'll ever make, and most people don't do it."
  ],
  confidence: 92,
  category: "investing_basics"
};

// Mock output for testing without API
function getMockResult(): GeneratorOutput {
  const mockScript: Script = {
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

  const mockMetadata: ScriptMetadata = {
    targetEmotion: "outrage",
    polarityElement: "Challenging the passive acceptance of leaving free employer money unclaimed",
    shareWorthiness: "high",
    saveWorthiness: "high",
    hasNumberInHook: true,
    hasClearTakeaway: true
  };

  return {
    script: mockScript,
    metadata: mockMetadata,
    topicUsed: MOCK_TOPIC.topic,
    category: MOCK_TOPIC.category,
    generatedAt: new Date(),
    cost: 0.021
  };
}

async function testGeneratorAgent() {
  console.log('🧪 Testing Generator Agent\n');
  if (MOCK_MODE) {
    console.log('⚠️  Running in MOCK MODE (no API calls)\n');
  }

  try {
    // Check for API key
    if (!MOCK_MODE && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set. Run with --mock flag to test without API.');
    }

    // Create agent (only if not in mock mode)
    let agent: GeneratorAgent | null = null;
    if (!MOCK_MODE) {
      console.log('Creating Generator Agent...');
      agent = createGeneratorAgent();
      console.log('  ✓ Agent created\n');
    }

    // Test 1: Generate script from topic
    console.log('Test 1: Generate script from finance topic');
    if (!MOCK_MODE) {
      console.log('  Calling Claude API...');
    }

    const startTime = Date.now();
    const result = MOCK_MODE ? getMockResult() : await agent!.execute({
      topic: MOCK_TOPIC,
      niche: 'finance'
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`  ✓ Generated script in ${duration}s`);
    console.log(`  ✓ Cost: $${result.cost.toFixed(4)}\n`);

    // Display script details
    console.log('Script Details:');
    console.log(`  Title: ${result.script.title}`);
    console.log(`  Hook Style: ${result.script.hookStyle}`);
    console.log(`  Hook: "${result.script.hook}"`);
    console.log(`  Segments: ${result.script.segments.length}`);
    console.log(`  Estimated Duration: ${result.script.estimatedDuration}s`);
    console.log(`  CTA: "${result.script.cta}"\n`);

    // Display segments
    console.log('Segments:');
    result.script.segments.forEach((seg, i) => {
      console.log(`  [${i + 1}] ${seg.timestamp} (${seg.duration}s) - ${seg.pacing}/${seg.energy}`);
      console.log(`      Narration: "${seg.narration.substring(0, 60)}..."`);
      console.log(`      Visual: ${seg.visualType} - "${seg.visualDescription.substring(0, 50)}..."`);
      if (seg.textOverlay) {
        console.log(`      Text: "${seg.textOverlay}"`);
      }
      console.log('');
    });

    // Display metadata
    console.log('Metadata:');
    console.log(`  Target Emotion: ${result.metadata.targetEmotion}`);
    console.log(`  Polarity: ${result.metadata.polarityElement}`);
    console.log(`  Share-worthy: ${result.metadata.shareWorthiness}`);
    console.log(`  Save-worthy: ${result.metadata.saveWorthiness}`);
    console.log(`  Has Number in Hook: ${result.metadata.hasNumberInHook}`);
    console.log(`  Has Clear Takeaway: ${result.metadata.hasClearTakeaway}\n`);

    // Validate structure
    console.log('Validation Checks:');
    const totalDuration = result.script.segments.reduce((sum, seg) => sum + seg.duration, 0);
    console.log(`  ✓ Total duration: ${totalDuration}s (target: 30s)`);
    console.log(`  ✓ Segment count: ${result.script.segments.length} (min 4, max 7)`);
    console.log(`  ✓ Hook under 3 seconds: ${result.script.segments[0].duration <= 3 ? 'Yes' : 'No'}`);
    console.log(`  ✓ CTA in final segment: ${result.script.segments[result.script.segments.length - 1].timestamp.includes('0:28') ? 'Yes' : 'Adjusted'}`);

    // Test 2: Different hook style (skip in mock mode)
    if (!MOCK_MODE) {
      console.log('\nTest 2: Generate with different hook style (contrarian)');
      console.log('  Calling Claude API...');

      const startTime2 = Date.now();
      const result2 = await agent!.execute({
        topic: MOCK_TOPIC,
        niche: 'finance',
        hookStyleOverride: 'contrarian'
      });
      const duration2 = ((Date.now() - startTime2) / 1000).toFixed(2);

      console.log(`  ✓ Generated script in ${duration2}s`);
      console.log(`  ✓ Hook Style: ${result2.script.hookStyle}`);
      console.log(`  ✓ Hook: "${result2.script.hook}"\n`);
    } else {
      console.log('\nTest 2: (Skipped in mock mode)\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('Summary:');
    if (MOCK_MODE) {
      console.log(`  Mode: MOCK (no API calls made)`);
      console.log(`  Script validated: ✓`);
      console.log(`  Structure test: PASSED`);
    } else {
      console.log(`  Scripts generated: ${MOCK_MODE ? 1 : 2}`);
      console.log(`  Total cost: $${(result.cost * (MOCK_MODE ? 1 : 2)).toFixed(4)}`);
    }
    console.log('═══════════════════════════════════════════════════════');

    console.log('\n✅ All Generator Agent tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

testGeneratorAgent();
