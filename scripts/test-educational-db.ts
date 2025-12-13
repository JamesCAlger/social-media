/**
 * Test script for educational pipeline database operations
 *
 * Run with: npx tsx scripts/test-educational-db.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { EducationalRepository } from '../src/core/educational-repository';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runTests() {
  const repo = new EducationalRepository(pool);
  let testContentId: string | null = null;

  console.log('🧪 Testing Educational Repository\n');

  try {
    // Test 1: Get topic categories
    console.log('Test 1: Get topic categories');
    const categories = await repo.getTopicCategories('finance');
    console.log(`  ✓ Found ${categories.length} categories`);
    categories.forEach(c => {
      console.log(`    - ${c.id}: ${c.name} (weight: ${c.weight})`);
    });

    // Test 2: Create educational content
    console.log('\nTest 2: Create educational content');
    testContentId = await repo.createContent({
      niche: 'finance',
      topic_category: 'savings_budgeting',
      topic: 'Why your emergency fund needs 6 months, not 3'
    });
    console.log(`  ✓ Created content with ID: ${testContentId}`);

    // Test 3: Get content
    console.log('\nTest 3: Get content by ID');
    const content = await repo.getContent(testContentId);
    if (content) {
      console.log(`  ✓ Retrieved content: ${content.topic}`);
      console.log(`    Status: ${content.status}`);
      console.log(`    Category: ${content.topic_category}`);
    } else {
      throw new Error('Content not found');
    }

    // Test 4: Update content with script
    console.log('\nTest 4: Update content with script');
    const testScript = {
      title: 'Emergency Fund Reality Check',
      hook: 'Your emergency fund is a lie. Here\'s the math.',
      segments: [
        {
          timestamp: '0:00-0:03',
          duration: 3,
          narration: 'Your emergency fund is a lie. Here\'s the math.',
          visualDescription: 'Piggy bank shattering',
          visualType: 'ai_image' as const,
          textOverlay: 'YOUR EMERGENCY FUND IS A LIE',
          pacing: 'fast' as const,
          energy: 'peak' as const
        },
        {
          timestamp: '0:03-0:10',
          duration: 7,
          narration: 'Financial advisors say save 3 months expenses. But the average job search takes 5 months.',
          visualDescription: 'Calendar pages flying',
          visualType: 'ai_image' as const,
          textOverlay: '3 months vs 5 months',
          pacing: 'medium' as const,
          energy: 'building' as const
        },
        {
          timestamp: '0:10-0:22',
          duration: 12,
          narration: 'If you lose your job with only 3 months saved, you\'re borrowing by month 4. Credit card debt averages 24% APR.',
          visualDescription: 'Debt accumulation visualization',
          visualType: 'text_card' as const,
          textOverlay: 'Month 4: DEBT MODE',
          pacing: 'fast' as const,
          energy: 'peak' as const
        },
        {
          timestamp: '0:22-0:28',
          duration: 6,
          narration: 'Six months buys you time. Time to find the RIGHT job, not just ANY job.',
          visualDescription: 'Calm person reviewing options',
          visualType: 'ai_image' as const,
          textOverlay: '6 months = OPTIONS',
          pacing: 'medium' as const,
          energy: 'resolution' as const
        },
        {
          timestamp: '0:28-0:30',
          duration: 2,
          narration: 'Follow for more money math.',
          visualDescription: 'Follow button',
          visualType: 'text_card' as const,
          textOverlay: 'Follow for more 💰',
          pacing: 'medium' as const,
          energy: 'resolution' as const
        }
      ],
      cta: 'Follow for more money math.',
      estimatedDuration: 30,
      hookStyle: 'contrarian' as const
    };

    await repo.updateContent(testContentId, {
      initial_script: testScript,
      status: 'scripting'
    });
    console.log('  ✓ Updated content with script');

    // Verify update
    const updatedContent = await repo.getContent(testContentId);
    if (updatedContent?.initial_script) {
      console.log(`  ✓ Script title: ${(updatedContent.initial_script as any).title}`);
    }

    // Test 5: Update with quality scores
    console.log('\nTest 5: Update with quality scores');
    await repo.updateContent(testContentId, {
      quality_score: 82.5,
      hook_score: 88,
      pacing_score: 79,
      unique_angle_score: 85,
      engagement_score: 80,
      clarity_score: 82,
      status: 'pending_review'
    });
    console.log('  ✓ Updated quality scores');

    // Test 6: Get recent content
    console.log('\nTest 6: Get recent content');
    const recentContent = await repo.getRecentContent({ niche: 'finance', limit: 5 });
    console.log(`  ✓ Found ${recentContent.length} recent content items`);

    // Test 7: Get recent topics
    console.log('\nTest 7: Get recent topics');
    const recentTopics = await repo.getRecentTopics('finance', 10);
    console.log(`  ✓ Found ${recentTopics.length} recent topics`);
    recentTopics.forEach(t => console.log(`    - ${t}`));

    // Test 8: Create performance record
    console.log('\nTest 8: Create performance record');
    await repo.createOrUpdatePerformance(testContentId, {
      views: 1000,
      likes: 50,
      saves: 30,
      shares: 15,
      three_second_retention: 72.5,
      completion_rate: 65.0,
      hook_style: 'contrarian',
      topic_category: 'savings_budgeting'
    });
    console.log('  ✓ Created performance record');

    // Test 9: Get performance
    console.log('\nTest 9: Get performance');
    const performance = await repo.getPerformance(testContentId);
    if (performance) {
      console.log(`  ✓ Performance: ${performance.views} views, ${performance.saves} saves`);
    }

    // Test 10: Increment category post count
    console.log('\nTest 10: Increment category post count');
    await repo.incrementCategoryPostCount('savings_budgeting');
    const updatedCategory = await repo.getTopicCategory('savings_budgeting');
    console.log(`  ✓ savings_budgeting post count: ${updatedCategory?.post_count}`);

    // Test 11: Create A/B test
    console.log('\nTest 11: Create A/B test');
    const testId = `test_${Date.now()}`;
    await repo.createABTest({
      test_id: testId,
      variable: 'hook',
      topic: 'Emergency fund sizing',
      hypothesis: 'Contrarian hooks outperform curiosity hooks'
    });
    console.log(`  ✓ Created A/B test: ${testId}`);

    // Test 12: Get A/B test
    console.log('\nTest 12: Get A/B test');
    const abTest = await repo.getABTest(testId);
    if (abTest) {
      console.log(`  ✓ A/B test variable: ${abTest.variable}`);
      console.log(`  ✓ Status: ${abTest.status}`);
    }

    // Test 13: Log prompt change
    console.log('\nTest 13: Log prompt change');
    await repo.logPromptChange({
      agent_name: 'Generator',
      prompt_section: 'hook_rules',
      previous_text: 'Use curiosity hooks',
      new_text: 'Use contrarian hooks for finance topics',
      reasoning: 'A/B test showed 23% higher 3-sec retention',
      data_points_used: 8,
      confidence: 'high',
      triggered_by: 'Performance Agent'
    });
    console.log('  ✓ Logged prompt change');

    // Test 14: Get prompt history
    console.log('\nTest 14: Get prompt history');
    const history = await repo.getPromptHistory('Generator', 5);
    console.log(`  ✓ Found ${history.length} prompt history entries`);

    console.log('\n✅ All tests passed!\n');

    // Cleanup: Delete test content
    console.log('Cleaning up test data...');
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM educational_performance WHERE content_id = $1', [testContentId]);
      await client.query('DELETE FROM educational_content WHERE id = $1', [testContentId]);
      await client.query('DELETE FROM ab_tests WHERE test_id = $1', [testId]);
      await client.query('DELETE FROM prompt_history WHERE agent_name = $1 AND prompt_section = $2',
        ['Generator', 'hook_rules']);
      console.log('  ✓ Test data cleaned up');
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runTests();
