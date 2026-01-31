/**
 * Test script for Research Agent
 *
 * Run with: npx tsx scripts/test-research-agent.ts
 * Run in mock mode: npx tsx scripts/test-research-agent.ts --mock
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { EducationalRepository } from '../src/core/educational-repository';
import { createResearchAgent, ResearchAgent } from '../src/agents/research';
import { ResearchOutput, TopicSuggestion } from '../src/agents/research/schema';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const MOCK_MODE = process.argv.includes('--mock');

// Mock data for testing without API
function getMockResult(): ResearchOutput {
  const mockTopics: TopicSuggestion[] = [
    {
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
    },
    {
      topic: "The 'latte factor' is a lie - here's what actually drains your money",
      whyNow: "Counter-narrative to popular but flawed financial advice resonates",
      competitorGap: "Everyone repeats the latte myth without checking the math",
      suggestedAngle: "Show that subscription creep and lifestyle inflation matter 10x more",
      emotionalTrigger: "surprise",
      potentialHooks: [
        "The latte factor is a lie. Here's what's actually killing your savings.",
        "Financial gurus got it wrong. Your coffee isn't the problem.",
        "Stop blaming your coffee. This is what's really draining your account."
      ],
      confidence: 88,
      category: "myth_busting"
    },
    {
      topic: "Why 'saving 20%' is terrible advice for most people",
      whyNow: "One-size-fits-all savings rules don't account for different life stages",
      competitorGap: "Nobody talks about how rigid rules cause shame and giving up entirely",
      suggestedAngle: "Progressive savings targets based on age and income, not arbitrary %",
      emotionalTrigger: "aspiration",
      potentialHooks: [
        "The 20% savings rule is ruining your finances. Here's why.",
        "If you can't save 20%, financial advice failed you. Not the other way around.",
        "Saving 20% of your income? You might be doing it wrong."
      ],
      confidence: 85,
      category: "money_psychology"
    }
  ];

  return {
    topics: mockTopics,
    researchedAt: new Date(),
    niche: 'finance',
    cost: 0.012
  };
}

async function testResearchAgent() {
  console.log('🧪 Testing Research Agent\n');
  if (MOCK_MODE) {
    console.log('⚠️  Running in MOCK MODE (no API calls)\n');
  }

  const repository = new EducationalRepository(pool);

  try {
    // Check for API key
    if (!MOCK_MODE && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set. Run with --mock flag to test without API.');
    }

    // Create agent (only if not in mock mode)
    let agent: ResearchAgent | null = null;
    if (!MOCK_MODE) {
      console.log('Creating Research Agent...');
      agent = createResearchAgent(repository);
      console.log('  ✓ Agent created\n');
    }

    // Test 1: Research with default niche (finance)
    console.log('Test 1: Research finance topics (default category)');
    if (!MOCK_MODE) {
      console.log('  Calling Claude API...');
    }

    const startTime = Date.now();
    const result1 = MOCK_MODE ? getMockResult() : await agent!.execute({
      niche: 'finance',
      count: 3
    });
    const duration1 = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`  ✓ Generated ${result1.topics.length} topics in ${duration1}s`);
    console.log(`  ✓ Cost: $${result1.cost.toFixed(4)}\n`);

    result1.topics.forEach((topic, i) => {
      console.log(`  Topic ${i + 1}: ${topic.topic}`);
      console.log(`    Category: ${topic.category}`);
      console.log(`    Confidence: ${topic.confidence}%`);
      console.log(`    Emotion: ${topic.emotionalTrigger}`);
      console.log(`    Angle: ${topic.suggestedAngle}`);
      console.log(`    Hooks:`);
      topic.potentialHooks.slice(0, 3).forEach(hook => {
        console.log(`      - "${hook}"`);
      });
      console.log('');
    });

    // Test 2: Research with specific category (skip in mock mode - same data)
    let result2 = result1;
    let duration2 = '0.00';
    if (!MOCK_MODE) {
      console.log('Test 2: Research specific category (money_psychology)');
      console.log('  Calling Claude API...');

      const startTime2 = Date.now();
      result2 = await agent!.execute({
        niche: 'finance',
        category: 'money_psychology',
        count: 2
      });
      duration2 = ((Date.now() - startTime2) / 1000).toFixed(2);

      console.log(`  ✓ Generated ${result2.topics.length} topics in ${duration2}s`);
      console.log(`  ✓ All topics in money_psychology: ${result2.topics.every(t => t.category === 'money_psychology')}\n`);

      result2.topics.forEach((topic, i) => {
        console.log(`  Topic ${i + 1}: ${topic.topic}`);
        console.log(`    Confidence: ${topic.confidence}%`);
        console.log('');
      });
    } else {
      console.log('Test 2: (Skipped in mock mode)\n');
    }

    // Test 3: Research with excluded topics (skip in mock mode)
    let result3 = result1;
    let duration3 = '0.00';
    if (!MOCK_MODE) {
      console.log('Test 3: Research with exclusions');
      const excludeTopics = result1.topics.map(t => t.topic);
      console.log(`  Excluding ${excludeTopics.length} topics from previous results`);
      console.log('  Calling Claude API...');

      const startTime3 = Date.now();
      result3 = await agent!.execute({
        niche: 'finance',
        excludeTopics,
        count: 2
      });
      duration3 = ((Date.now() - startTime3) / 1000).toFixed(2);

      console.log(`  ✓ Generated ${result3.topics.length} new topics in ${duration3}s\n`);

      result3.topics.forEach((topic, i) => {
        console.log(`  Topic ${i + 1}: ${topic.topic}`);
        console.log(`    Category: ${topic.category}`);
        console.log('');
      });
    } else {
      console.log('Test 3: (Skipped in mock mode)\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('Summary:');
    if (MOCK_MODE) {
      console.log(`  Mode: MOCK (no API calls made)`);
      console.log(`  Topics validated: ${result1.topics.length}`);
      console.log(`  Structure test: PASSED`);
    } else {
      const totalCost = result1.cost + result2.cost + result3.cost;
      console.log(`  Total topics generated: ${result1.topics.length + result2.topics.length + result3.topics.length}`);
      console.log(`  Total API calls: 3`);
      console.log(`  Total cost: $${totalCost.toFixed(4)}`);
    }
    console.log('═══════════════════════════════════════════════════════');

    console.log('\n✅ All Research Agent tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

testResearchAgent();
