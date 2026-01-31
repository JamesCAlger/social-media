/**
 * Test Educational Pipeline (Full End-to-End)
 *
 * Usage:
 *   npx tsx scripts/test-educational-pipeline.ts           # Run with APIs
 *   npx tsx scripts/test-educational-pipeline.ts --mock    # Run with mock data (no API costs)
 */

import { createEducationalPipeline } from '../src/agents/pipeline';
import * as fs from 'fs';

const mockMode = process.argv.includes('--mock');

async function main() {
  console.log('\n🎓 Testing Educational Content Pipeline...\n');
  console.log(`Mode: ${mockMode ? 'MOCK (no API calls)' : 'LIVE (will make API calls)'}`);
  console.log('═'.repeat(60) + '\n');

  // Create pipeline
  const pipeline = createEducationalPipeline({
    niche: 'finance',
    targetQualityScore: 80,
    maxQualityIterations: 3,
    mockMode
  });

  // Provide a topic (skip research in this test)
  const testTopic = {
    topic: 'Why your savings account is actually losing you money',
    category: 'savings_budgeting',
    whyNow: 'Fed rate cuts in news, inflation concerns high, people questioning their savings strategy',
    competitorGap: 'Most videos explain WHAT but not the MATH showing real losses over time',
    suggestedAngle: 'Show exact dollar amounts lost over 10 years with inflation calculator',
    emotionalTrigger: 'outrage' as const,
    potentialHooks: [
      'Your bank is legally stealing from you. Here\'s the math.',
      'I calculated how much my savings account cost me.',
      'The savings account scam nobody talks about.'
    ],
    confidence: 85
  };

  console.log('📋 Test Configuration:');
  console.log(`   Niche: finance`);
  console.log(`   Topic: ${testTopic.topic}`);
  console.log(`   Target Quality: 80`);
  console.log(`   Max Iterations: 3`);
  console.log('');

  const startTime = Date.now();

  try {
    console.log('🚀 Starting Pipeline...\n');
    console.log('─'.repeat(60));

    const result = await pipeline.execute({
      niche: 'finance',
      topic: testTopic
    });

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('─'.repeat(60));
    console.log('\n✅ Pipeline Completed Successfully!\n');
    console.log('═'.repeat(60));

    console.log('\n📊 RESULTS SUMMARY\n');

    console.log('📝 Content:');
    console.log(`   Content ID: ${result.contentId}`);
    console.log(`   Niche: ${result.niche}`);
    console.log(`   Title: ${result.script.title}`);
    console.log(`   Hook: "${result.script.hook}"`);
    console.log(`   Duration: ${result.finalVideo.duration}s`);
    console.log('');

    console.log('⭐ Quality:');
    console.log(`   Final Score: ${result.qualityScore}/100`);
    console.log(`   Iterations: ${result.qualityIterations}`);
    console.log(`   Hook Style: ${result.script.hookStyle}`);
    console.log('');

    console.log('🎥 Video:');
    console.log(`   Resolution: ${result.finalVideo.resolution}`);
    console.log(`   Aspect Ratio: ${result.finalVideo.aspectRatio}`);
    console.log(`   File Size: ${result.finalVideo.fileSize} bytes`);
    console.log(`   Path: ${result.finalVideo.localPath}`);
    if (result.videoR2Url) {
      console.log(`   R2 URL: ${result.videoR2Url}`);
    }
    console.log('');

    console.log('💰 Costs:');
    console.log(`   Total Cost: $${result.totalCost.toFixed(4)}`);
    console.log('');

    console.log('⏱️ Stage Breakdown:');
    for (const stage of result.stageResults) {
      const status = stage.success ? '✅' : '❌';
      const duration = (stage.durationMs / 1000).toFixed(2);
      const cost = stage.cost > 0 ? ` ($${stage.cost.toFixed(4)})` : '';
      console.log(`   ${status} ${stage.stage.padEnd(15)} ${duration}s${cost}`);
    }
    console.log(`   ────────────────────────`);
    console.log(`   Total: ${totalTime}s ($${result.totalCost.toFixed(4)})`);
    console.log('');

    if (result.reviewFlags && result.reviewFlags.length > 0) {
      console.log('⚠️ Review Flags:');
      for (const flag of result.reviewFlags) {
        console.log(`   - ${flag}`);
      }
      console.log('');
    }

    console.log('📋 Script Segments:');
    for (const segment of result.script.segments) {
      console.log(`   [${segment.timestamp}] ${segment.visualType}`);
      console.log(`      "${segment.narration.substring(0, 60)}..."`);
    }
    console.log('');

    // Create review request
    const reviewRequest = pipeline.createReviewRequest(result);
    console.log('📬 Review Request:');
    console.log(`   Priority: ${reviewRequest.priority}`);
    console.log(`   Quality Score: ${reviewRequest.qualityScore}`);
    console.log(`   Flags: ${reviewRequest.flags.length > 0 ? reviewRequest.flags.join(', ') : 'None'}`);
    console.log('');

    console.log('═'.repeat(60));
    console.log(`\n🎉 Pipeline test ${mockMode ? '(mock)' : '(live)'} completed in ${totalTime}s\n`);

    // Cleanup if mock mode
    if (mockMode) {
      const contentDir = `./content/${result.contentId}`;
      if (fs.existsSync(contentDir)) {
        console.log('🧹 Cleaning up mock files...');
        fs.rmSync(contentDir, { recursive: true, force: true });
        console.log('   Removed test directory\n');
      }
    } else {
      console.log(`💡 Content saved to: ./content/${result.contentId}\n`);
    }

    return result;

  } catch (error) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('─'.repeat(60));
    console.error(`\n❌ Pipeline failed after ${totalTime}s`);
    console.error(`   Error: ${(error as Error).message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
