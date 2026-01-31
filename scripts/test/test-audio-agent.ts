/**
 * Test Audio Agent
 *
 * Usage:
 *   npx tsx scripts/test-audio-agent.ts           # Run with API calls
 *   npx tsx scripts/test-audio-agent.ts --mock    # Run with mock data (no API costs)
 */

import { createAudioAgent } from '../src/agents/audio';
import { Script } from '../src/agents/generator/schema';
import * as fs from 'fs';
import * as path from 'path';

const mockMode = process.argv.includes('--mock');

// Create a sample script for testing
function createSampleScript(): Script {
  return {
    title: 'The 50/30/20 Budget Rule Explained',
    hook: 'Most people budget wrong. Here\'s the one rule that actually works.',
    hookStyle: 'contrarian',
    estimatedDuration: 30,
    cta: 'Follow for more money tips',
    segments: [
      {
        timestamp: '0:00-0:05',
        duration: 5,
        narration: 'Most people budget wrong. Here\'s the one rule that actually works.',
        visualDescription: 'A sleek calculator surrounded by floating dollar bills',
        visualType: 'ai_image',
        textOverlay: 'The 50/30/20 Rule',
        pacing: 'fast',
        energy: 'peak'
      },
      {
        timestamp: '0:05-0:12',
        duration: 7,
        narration: 'It\'s called the 50/30/20 rule. 50% of your income goes to needs like rent and food.',
        visualDescription: 'Modern apartment interior with minimalist furniture',
        visualType: 'ai_image',
        textOverlay: '50% = Needs',
        pacing: 'medium',
        energy: 'building'
      },
      {
        timestamp: '0:12-0:19',
        duration: 7,
        narration: '30% goes to wants. Dining out, entertainment, those new shoes you\'ve been eyeing.',
        visualDescription: 'Elegant dinner table setting with soft lighting',
        visualType: 'ai_image',
        textOverlay: '30% = Wants',
        pacing: 'medium',
        energy: 'building'
      },
      {
        timestamp: '0:19-0:26',
        duration: 7,
        narration: 'And 20% goes straight to savings. This is how wealth is built over time.',
        visualDescription: 'Golden piggy bank with coins stacking up',
        visualType: 'ai_image',
        textOverlay: '20% = Savings',
        pacing: 'medium',
        energy: 'building'
      },
      {
        timestamp: '0:26-0:30',
        duration: 4,
        narration: 'Follow for more money tips that actually work.',
        visualDescription: 'Summary card with pie chart',
        visualType: 'text_card',
        textOverlay: '50% Needs | 30% Wants | 20% Savings',
        pacing: 'medium',
        energy: 'resolution'
      }
    ]
  };
}

async function main() {
  console.log('\n🎙️ Testing Audio Agent...\n');
  console.log(`Mode: ${mockMode ? 'MOCK (no API calls)' : 'LIVE (will make API calls)'}\n`);

  // Create unique content ID for this test
  const contentId = `test-audio-${Date.now()}`;
  const outputDir = path.join('./content', contentId, 'audio');

  // Create the agent
  const audioAgent = createAudioAgent({
    mockMode,
    outputBaseDir: './content'
  });

  // Create sample script
  const script = createSampleScript();

  // Calculate total narration
  const fullNarration = script.segments.map(s => s.narration).join(' ');

  console.log('📝 Test Script:');
  console.log(`   Title: ${script.title}`);
  console.log(`   Segments: ${script.segments.length}`);
  console.log(`   Total Duration: ${script.estimatedDuration}s`);
  console.log(`   Total Characters: ${fullNarration.length}`);
  console.log('');

  try {
    console.log('🚀 Generating audio...\n');

    const result = await audioAgent.execute({
      script,
      contentId,
      niche: 'finance',
      outputDir
    });

    console.log('✅ Audio Generation Complete!\n');
    console.log('📊 Results:');
    console.log(`   Content ID: ${result.contentId}`);
    console.log(`   Voiceover Duration: ${result.voiceover.duration.toFixed(2)}s`);
    console.log(`   Character Count: ${result.voiceover.characterCount}`);
    console.log(`   Voice Speed: ${result.voiceover.speed}x`);
    console.log(`   Total Cost: $${result.totalCost.toFixed(4)}`);
    console.log(`   Total Time: ${(result.totalTimeMs / 1000).toFixed(2)}s`);
    console.log(`   Output Dir: ${result.outputDir}`);
    console.log('');

    console.log('🎤 Voiceover Details:');
    console.log(`   Provider: ${result.voiceover.provider}`);
    console.log(`   Voice ID: ${result.voiceover.voiceId}`);
    console.log(`   Custom Clone: ${result.voiceover.isCustomClone}`);
    console.log(`   Path: ${result.voiceover.localPath}`);
    console.log('');

    console.log('⏱️ Segment Timings:');
    for (const timing of result.segmentTimings) {
      console.log(`   [${timing.segmentIndex + 1}] ${timing.startTime.toFixed(2)}s - ${timing.endTime.toFixed(2)}s (${timing.duration}s)`);
      console.log(`       "${timing.narration.substring(0, 50)}..."`);
    }
    console.log('');

    // Verify file was created
    console.log('🔍 Verifying files...');
    const exists = fs.existsSync(result.voiceover.localPath);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${path.basename(result.voiceover.localPath)}`);

    if (exists) {
      const stats = fs.statSync(result.voiceover.localPath);
      console.log(`   Size: ${stats.size} bytes`);
    }
    console.log('');

    if (exists) {
      console.log('✅ Audio file created successfully!\n');
    } else {
      console.log('⚠️ Audio file is missing\n');
    }

    // Cleanup if in mock mode
    if (mockMode) {
      console.log('🧹 Cleaning up mock files...');
      fs.rmSync(path.join('./content', contentId), { recursive: true, force: true });
      console.log('   Removed test directory\n');
    } else {
      console.log(`💡 Audio saved to: ${outputDir}\n`);
    }

    return result;

  } catch (error) {
    console.error('\n❌ Audio generation failed:', (error as Error).message);
    console.error(error);
    process.exit(1);
  }
}

main();
