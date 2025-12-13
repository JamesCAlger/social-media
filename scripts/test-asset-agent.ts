/**
 * Test Asset Agent
 *
 * Usage:
 *   npx tsx scripts/test-asset-agent.ts           # Run with API calls
 *   npx tsx scripts/test-asset-agent.ts --mock    # Run with mock data (no API costs)
 */

import { createAssetAgent } from '../src/agents/asset';
import { Script, ScriptSegment } from '../src/agents/generator/schema';
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
        visualDescription: 'A sleek calculator surrounded by floating dollar bills and percentage symbols, premium aesthetic',
        visualType: 'ai_image',
        textOverlay: 'The 50/30/20 Rule',
        pacing: 'fast',
        energy: 'peak'
      },
      {
        timestamp: '0:05-0:12',
        duration: 7,
        narration: 'It\'s called the 50/30/20 rule. 50% of your income goes to needs like rent and food.',
        visualDescription: 'Modern apartment interior with minimalist furniture, representing stable living',
        visualType: 'ai_image',
        textOverlay: '50% = Needs',
        pacing: 'medium',
        energy: 'building'
      },
      {
        timestamp: '0:12-0:19',
        duration: 7,
        narration: '30% goes to wants - dining out, entertainment, those new shoes you\'ve been eyeing.',
        visualDescription: 'Elegant dinner table setting with soft lighting, premium lifestyle aesthetic',
        visualType: 'ai_image',
        textOverlay: '30% = Wants',
        pacing: 'medium',
        energy: 'building'
      },
      {
        timestamp: '0:19-0:26',
        duration: 7,
        narration: 'And 20% goes straight to savings. This is how wealth is built over time.',
        visualDescription: 'Golden piggy bank with coins stacking up, growth visualization, wealth aesthetic',
        visualType: 'ai_image',
        textOverlay: '20% = Savings',
        pacing: 'medium',
        energy: 'building'
      },
      {
        timestamp: '0:26-0:30',
        duration: 4,
        narration: 'Follow for more money tips that actually work.',
        visualDescription: 'Summary card with pie chart showing 50/30/20 split',
        visualType: 'text_card',
        textOverlay: '50% Needs | 30% Wants | 20% Savings',
        pacing: 'medium',
        energy: 'resolution'
      }
    ]
  };
}

async function main() {
  console.log('\n🎨 Testing Asset Agent...\n');
  console.log(`Mode: ${mockMode ? 'MOCK (no API calls)' : 'LIVE (will make API calls)'}\n`);

  // Create unique content ID for this test
  const contentId = `test-asset-${Date.now()}`;
  const outputDir = path.join('./content', contentId, 'assets');

  // Create the agent
  const assetAgent = createAssetAgent({
    mockMode,
    outputBaseDir: './content'
  });

  // Create sample script
  const script = createSampleScript();

  console.log('📝 Test Script:');
  console.log(`   Title: ${script.title}`);
  console.log(`   Segments: ${script.segments.length}`);
  console.log(`   AI Images: ${script.segments.filter(s => s.visualType === 'ai_image').length}`);
  console.log(`   Text Cards: ${script.segments.filter(s => s.visualType === 'text_card').length}`);
  console.log('');

  try {
    console.log('🚀 Generating assets...\n');

    const result = await assetAgent.execute({
      script,
      contentId,
      niche: 'finance',
      outputDir
    });

    console.log('✅ Asset Generation Complete!\n');
    console.log('📊 Results:');
    console.log(`   Content ID: ${result.contentId}`);
    console.log(`   Total Images: ${result.totalImages}`);
    console.log(`   Text Cards: ${result.textCards}`);
    console.log(`   Total Cost: $${result.totalCost.toFixed(3)}`);
    console.log(`   Total Time: ${(result.totalTimeMs / 1000).toFixed(2)}s`);
    console.log(`   Output Dir: ${result.outputDir}`);
    console.log('');

    console.log('📁 Generated Assets:');
    for (const asset of result.assets) {
      console.log(`   [${asset.segmentIndex + 1}] ${asset.type}`);
      console.log(`       Timestamp: ${asset.timestamp}`);
      console.log(`       Duration: ${asset.duration}s`);
      console.log(`       Path: ${asset.localPath}`);
      if (asset.prompt) {
        console.log(`       Prompt: ${asset.prompt.substring(0, 60)}...`);
      }
      if (asset.generationTimeMs) {
        console.log(`       Gen Time: ${asset.generationTimeMs}ms`);
      }
      console.log('');
    }

    // Verify files were created
    console.log('🔍 Verifying files...');
    let allFilesExist = true;
    for (const asset of result.assets) {
      const exists = fs.existsSync(asset.localPath);
      const status = exists ? '✅' : '❌';
      console.log(`   ${status} ${path.basename(asset.localPath)}`);
      if (!exists) allFilesExist = false;
    }
    console.log('');

    if (allFilesExist) {
      console.log('✅ All files created successfully!\n');
    } else {
      console.log('⚠️ Some files are missing\n');
    }

    // Cleanup if in mock mode
    if (mockMode) {
      console.log('🧹 Cleaning up mock files...');
      fs.rmSync(path.join('./content', contentId), { recursive: true, force: true });
      console.log('   Removed test directory\n');
    } else {
      console.log(`💡 Assets saved to: ${outputDir}\n`);
    }

    return result;

  } catch (error) {
    console.error('\n❌ Asset generation failed:', (error as Error).message);
    console.error(error);
    process.exit(1);
  }
}

main();
