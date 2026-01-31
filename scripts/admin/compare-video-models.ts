import { VideoGenerationLayer } from '../src/layers/03-video-generation';
import { logger } from '../src/core/logger';
import * as fs from 'fs';
import * as path from 'path';

interface ComparisonResult {
  model: string;
  prompt: string;
  promptId: string;
  videoUrl: string;
  cost: number;
  generationTime: number;
  success: boolean;
  error?: string;
  metadata?: any;
}

interface TestPrompt {
  id: string;
  prompt: string;
  category: string;
}

const TEST_PROMPTS: TestPrompt[] = [
  {
    id: 'soap-cutting',
    category: 'ASMR - Cutting',
    prompt: 'Close-up shot of hands gently cutting pastel pink soap bars with a sharp knife, slow motion, soft natural lighting, relaxing and satisfying movements, smooth textures, 9:16 vertical format',
  },
  {
    id: 'sand-pouring',
    category: 'ASMR - Pouring',
    prompt: 'Extreme close-up of fine white kinetic sand slowly pouring between fingers, soft diffused lighting, calming and mesmerizing flow, gentle movements, 9:16 vertical format',
  },
  {
    id: 'foam-squeezing',
    category: 'ASMR - Squeezing',
    prompt: 'Hands slowly squeezing colorful foam slime with satisfying texture, soft pastel colors (pink, blue, purple), gentle movements, relaxing atmosphere, smooth and glossy surface, 9:16 vertical format',
  },
  {
    id: 'water-droplet',
    category: 'ASMR - Natural',
    prompt: 'Slow-motion close-up of crystal clear water droplets falling into a calm pool, creating perfect ripples, soft natural sunlight, peaceful and meditative atmosphere, 9:16 vertical format',
  },
  {
    id: 'brush-strokes',
    category: 'ASMR - Artistic',
    prompt: 'Close-up of soft makeup brush gently sweeping across smooth surface, creating satisfying patterns, pastel powder clouds, delicate movements, calming aesthetic, 9:16 vertical format',
  },
];

// Models to compare
const MODELS = ['ray2-flash', 'kling-turbo', 'wan25'];

async function compareModels() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   VIDEO MODEL COMPARISON TEST              ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const results: ComparisonResult[] = [];
  const startTime = Date.now();

  // Create output directory
  const outputDir = path.join(process.cwd(), 'test-output', `comparison-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });

  logger.info('Starting video model comparison test', {
    models: MODELS,
    promptCount: TEST_PROMPTS.length,
    totalTests: MODELS.length * TEST_PROMPTS.length,
    outputDir,
  });

  // Test each prompt with each model
  for (let i = 0; i < TEST_PROMPTS.length; i++) {
    const testPrompt = TEST_PROMPTS[i];

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`PROMPT ${i + 1}/${TEST_PROMPTS.length}: ${testPrompt.id}`);
    console.log(`Category: ${testPrompt.category}`);
    console.log(`${'═'.repeat(60)}\n`);

    for (const modelId of MODELS) {
      console.log(`\n🎬 Testing model: ${modelId.toUpperCase()}`);
      console.log(`${'─'.repeat(40)}`);

      const testStartTime = Date.now();

      try {
        // Set model in environment
        process.env.VIDEO_MODEL = modelId;

        const layer = new VideoGenerationLayer();
        const result = await layer.execute({
          contentId: `test-${testPrompt.id}-${modelId}-${Date.now()}`,
          prompts: [{
            segmentNumber: 1,
            prompt: testPrompt.prompt,
            visualDescription: testPrompt.prompt,
            cameraMovement: 'static',
            duration: 5,
          }],
        });

        const generationTime = (Date.now() - testStartTime) / 1000;
        const video = result.videos[0];

        results.push({
          model: modelId,
          prompt: testPrompt.prompt,
          promptId: testPrompt.id,
          videoUrl: video.url,
          cost: video.cost,
          generationTime,
          success: true,
          metadata: {
            fileSize: video.fileSize,
            duration: video.duration,
            storagePath: video.storagePath,
          },
        });

        console.log(`✅ SUCCESS`);
        console.log(`   Cost: $${video.cost.toFixed(2)}`);
        console.log(`   Time: ${generationTime.toFixed(1)}s`);
        console.log(`   URL:  ${video.url.substring(0, 80)}...`);

        logger.info(`Video generated successfully with ${modelId}`, {
          promptId: testPrompt.id,
          cost: video.cost,
          generationTime,
          url: video.url,
        });
      } catch (error: any) {
        const generationTime = (Date.now() - testStartTime) / 1000;

        results.push({
          model: modelId,
          prompt: testPrompt.prompt,
          promptId: testPrompt.id,
          videoUrl: '',
          cost: 0,
          generationTime,
          success: false,
          error: error.message,
        });

        console.log(`❌ FAILED`);
        console.log(`   Error: ${error.message}`);
        console.log(`   Time:  ${generationTime.toFixed(1)}s`);

        logger.error(`Video generation failed with ${modelId}`, {
          promptId: testPrompt.id,
          error: error.message,
          generationTime,
        });
      }

      // Wait 3 seconds between requests to avoid rate limiting
      console.log(`\n⏳ Waiting 3 seconds before next test...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;

  // Generate comprehensive report
  generateComparisonReport(results, totalTime, outputDir);
}

function generateComparisonReport(
  results: ComparisonResult[],
  totalTime: number,
  outputDir: string
) {
  console.log('\n\n╔════════════════════════════════════════════╗');
  console.log('║          COMPARISON REPORT                 ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Group by model
  const byModel: Record<string, ComparisonResult[]> = {};
  results.forEach(r => {
    if (!byModel[r.model]) byModel[r.model] = [];
    byModel[r.model].push(r);
  });

  // Calculate statistics for each model
  const modelStats: any[] = [];

  Object.entries(byModel).forEach(([model, modelResults]) => {
    const successResults = modelResults.filter(r => r.success);
    const successCount = successResults.length;
    const successRate = (successCount / modelResults.length) * 100;
    const avgCost = successResults.length > 0
      ? successResults.reduce((sum, r) => sum + r.cost, 0) / successResults.length
      : 0;
    const avgTime = successResults.length > 0
      ? successResults.reduce((sum, r) => sum + r.generationTime, 0) / successResults.length
      : 0;
    const totalCost = successResults.reduce((sum, r) => sum + r.cost, 0);

    modelStats.push({
      model,
      successCount,
      totalTests: modelResults.length,
      successRate,
      avgCost,
      avgTime,
      totalCost,
      results: modelResults,
    });

    console.log(`\n📊 ${model.toUpperCase()}`);
    console.log(`${'─'.repeat(40)}`);
    console.log(`   Success Rate:    ${successCount}/${modelResults.length} (${successRate.toFixed(0)}%)`);
    console.log(`   Avg Cost:        $${avgCost.toFixed(2)} per 5-second clip`);
    console.log(`   Avg Time:        ${avgTime.toFixed(1)}s`);
    console.log(`   Total Cost:      $${totalCost.toFixed(2)}`);
    console.log(`\n   Results:`);

    modelResults.forEach(r => {
      if (r.success) {
        console.log(`     ✓ ${r.promptId}: $${r.cost.toFixed(2)} in ${r.generationTime.toFixed(1)}s`);
      } else {
        console.log(`     ✗ ${r.promptId}: FAILED (${r.error})`);
      }
    });
  });

  // Compare models
  console.log(`\n\n📈 COST COMPARISON (for 3×5sec clips in pipeline)`);
  console.log(`${'─'.repeat(60)}`);

  modelStats.forEach(stat => {
    const costFor3Clips = stat.avgCost * 3;
    console.log(`   ${stat.model.padEnd(15)}: $${costFor3Clips.toFixed(2)} per video`);
  });

  // Recommendations
  console.log(`\n\n💡 RECOMMENDATIONS`);
  console.log(`${'─'.repeat(60)}`);

  const sortedByCost = [...modelStats].sort((a, b) => a.avgCost - b.avgCost);
  const cheapest = sortedByCost[0];
  const mostReliable = [...modelStats].sort((a, b) => b.successRate - a.successRate)[0];
  const fastest = [...modelStats].sort((a, b) => a.avgTime - b.avgTime)[0];

  console.log(`   💰 Cheapest:       ${cheapest.model} ($${cheapest.avgCost.toFixed(2)}/clip)`);
  console.log(`   ✅ Most Reliable:  ${mostReliable.model} (${mostReliable.successRate.toFixed(0)}% success)`);
  console.log(`   ⚡ Fastest:        ${fastest.model} (${fastest.avgTime.toFixed(1)}s avg)`);

  if (cheapest.model === 'ray2-flash') {
    console.log(`\n   ⭐ Ray 2 Flash is recommended for cost optimization`);
    console.log(`      - 60% cheaper than WAN 2.5`);
    console.log(`      - Same provider (fal.ai) = easy integration`);
    console.log(`      - Fast generation times`);
  } else if (cheapest.model === 'kling-turbo') {
    console.log(`\n   ⭐ Kling 2.5 Turbo is recommended for best value`);
    console.log(`      - 58% cheaper than WAN 2.5`);
    console.log(`      - Superior prompt adherence`);
    console.log(`      - Best motion physics`);
  }

  console.log(`\n   🔄 Next Steps:`);
  console.log(`      1. Manually review video quality at URLs above`);
  console.log(`      2. Rate each video for ASMR suitability (1-5 stars)`);
  console.log(`      3. Calculate quality/cost score`);
  console.log(`      4. Update .env with chosen model:`);
  console.log(`         VIDEO_MODEL=${cheapest.model}`);

  console.log(`\n\n⏱️  Total Test Time: ${totalTime.toFixed(1)}s (${(totalTime / 60).toFixed(1)} minutes)`);
  console.log(`💾 Results saved to: ${outputDir}\n`);

  // Save detailed JSON report
  const jsonReport = {
    timestamp: new Date().toISOString(),
    totalTime,
    models: MODELS,
    prompts: TEST_PROMPTS,
    results,
    statistics: modelStats,
    recommendations: {
      cheapest: cheapest.model,
      mostReliable: mostReliable.model,
      fastest: fastest.model,
    },
  };

  const jsonPath = path.join(outputDir, 'comparison-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));

  // Save CSV for easy analysis
  const csvPath = path.join(outputDir, 'comparison-results.csv');
  const csvLines = [
    'Model,Prompt ID,Success,Cost,Generation Time,Video URL,Error',
    ...results.map(r =>
      `${r.model},${r.promptId},${r.success},${r.cost},${r.generationTime},${r.videoUrl},"${r.error || ''}"`
    ),
  ];
  fs.writeFileSync(csvPath, csvLines.join('\n'));

  // Save markdown report
  const mdPath = path.join(outputDir, 'REPORT.md');
  const mdContent = generateMarkdownReport(results, modelStats, totalTime);
  fs.writeFileSync(mdPath, mdContent);

  console.log(`   - JSON: ${jsonPath}`);
  console.log(`   - CSV:  ${csvPath}`);
  console.log(`   - MD:   ${mdPath}`);

  logger.info('Comparison test completed', {
    totalTests: results.length,
    successCount: results.filter(r => r.success).length,
    totalTime,
    outputDir,
  });
}

function generateMarkdownReport(
  results: ComparisonResult[],
  modelStats: any[],
  totalTime: number
): string {
  let md = `# Video Model Comparison Report\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Total Test Time:** ${totalTime.toFixed(1)}s (${(totalTime / 60).toFixed(1)} minutes)\n\n`;

  md += `## Summary\n\n`;
  md += `| Model | Success Rate | Avg Cost | Avg Time | Total Cost |\n`;
  md += `|-------|--------------|----------|----------|------------|\n`;

  modelStats.forEach(stat => {
    md += `| ${stat.model} | ${stat.successCount}/${stat.totalTests} (${stat.successRate.toFixed(0)}%) | $${stat.avgCost.toFixed(2)} | ${stat.avgTime.toFixed(1)}s | $${stat.totalCost.toFixed(2)} |\n`;
  });

  md += `\n## Cost Comparison (for 3×5sec clips)\n\n`;
  modelStats.forEach(stat => {
    const costFor3 = stat.avgCost * 3;
    md += `- **${stat.model}**: $${costFor3.toFixed(2)} per video\n`;
  });

  md += `\n## Detailed Results\n\n`;

  TEST_PROMPTS.forEach(prompt => {
    md += `### ${prompt.id} (${prompt.category})\n\n`;
    md += `**Prompt:** ${prompt.prompt}\n\n`;
    md += `| Model | Status | Cost | Time | Video URL |\n`;
    md += `|-------|--------|------|------|----------|\n`;

    const promptResults = results.filter(r => r.promptId === prompt.id);
    promptResults.forEach(r => {
      if (r.success) {
        md += `| ${r.model} | ✅ Success | $${r.cost.toFixed(2)} | ${r.generationTime.toFixed(1)}s | [View](${r.videoUrl}) |\n`;
      } else {
        md += `| ${r.model} | ❌ Failed | - | ${r.generationTime.toFixed(1)}s | ${r.error} |\n`;
      }
    });
    md += `\n`;
  });

  md += `## Manual Quality Assessment\n\n`;
  md += `Rate each video on a scale of 1-5 stars:\n\n`;

  TEST_PROMPTS.forEach(prompt => {
    md += `### ${prompt.id}\n\n`;
    md += `| Model | Visual Quality | Prompt Adherence | Motion Smoothness | ASMR Suitability | Overall |\n`;
    md += `|-------|----------------|------------------|-------------------|------------------|----------|\n`;
    MODELS.forEach(model => {
      md += `| ${model} | ⭐⭐⭐⭐☆ | ⭐⭐⭐⭐☆ | ⭐⭐⭐⭐☆ | ⭐⭐⭐⭐☆ | ?/20 |\n`;
    });
    md += `\n`;
  });

  md += `## Recommendations\n\n`;
  const cheapest = modelStats.sort((a, b) => a.avgCost - b.avgCost)[0];
  md += `- **Cheapest:** ${cheapest.model} ($${cheapest.avgCost.toFixed(2)}/clip)\n`;
  md += `- **Best Value:** TBD after manual quality review\n\n`;

  md += `## Next Steps\n\n`;
  md += `1. Watch all generated videos\n`;
  md += `2. Fill in quality assessment table above\n`;
  md += `3. Calculate quality/cost ratio: (Total Stars / 20) / Cost\n`;
  md += `4. Choose winning model\n`;
  md += `5. Update \`.env\`:\n`;
  md += `   \`\`\`bash\n`;
  md += `   VIDEO_MODEL=${cheapest.model}\n`;
  md += `   \`\`\`\n`;

  return md;
}

// Run comparison
compareModels()
  .then(() => {
    console.log('\n✅ Comparison test complete!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Comparison test failed:', error);
    logger.error('Comparison test failed', { error: error.message });
    process.exit(1);
  });
