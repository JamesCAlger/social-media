# Video Model Comparison & Implementation Guide

**Last Updated:** 2025-10-31
**Purpose:** Implement and compare Ray 2 Flash, Kling 2.5 Turbo, and WAN 2.5 for optimal cost/quality balance

---

## Table of Contents

1. [Overview](#overview)
2. [Model Specifications](#model-specifications)
3. [Cost Analysis](#cost-analysis)
4. [Implementation Architecture](#implementation-architecture)
5. [Step-by-Step Implementation](#step-by-step-implementation)
6. [Testing & Comparison Strategy](#testing--comparison-strategy)
7. [Integration with Existing Pipeline](#integration-with-existing-pipeline)
8. [Troubleshooting](#troubleshooting)

---

## Overview

We're evaluating three AI video generation models to optimize the cost-to-quality ratio for our automated ASMR content pipeline:

1. **Luma Ray 2 Flash** (fal.ai) - Fastest, cheapest
2. **Kling 2.5 Turbo** (Kie.ai) - Best quality-to-price ratio
3. **WAN 2.5** (fal.ai) - Current baseline

### Goals
- Reduce video generation costs by 40-60%
- Maintain or improve video quality
- Keep implementation simple (prefer fal.ai when possible)
- Support easy model switching via configuration

---

## Model Specifications

### 1. Luma Ray 2 Flash (fal.ai)

| Specification | Value |
|--------------|-------|
| **Provider** | fal.ai |
| **Model ID** | `fal-ai/luma-dream-machine/ray-2-flash` |
| **Cost** | $0.04/second = $0.20 per 5-second clip |
| **Quality** | High, optimized for speed |
| **Supported Modes** | Text-to-video, Image-to-video |
| **Max Duration** | Up to 10 seconds |
| **Output Resolution** | 720p (suitable for Instagram Reels) |
| **Generation Speed** | ~20-40 seconds |
| **Best For** | Fast iteration, cost optimization |

**API Endpoint:**
```
https://fal.ai/models/fal-ai/luma-dream-machine/ray-2-flash/text-to-video
```

---

### 2. Kling 2.5 Turbo (Kie.ai)

| Specification | Value |
|--------------|-------|
| **Provider** | Kie.ai |
| **Model ID** | `kling-v2.5-turbo` |
| **Cost** | $0.042/second = $0.21 per 5-second clip |
| **Quality** | Excellent - industry-leading prompt adherence |
| **Supported Modes** | Text-to-video, Image-to-video |
| **Max Duration** | 5-10 seconds |
| **Output Resolution** | 720p, 1080p |
| **Generation Speed** | ~30-60 seconds |
| **Best For** | Superior motion physics, complex scenes |

**API Endpoint:**
```
https://kie.ai/api/v1/videos/generations
```

**Key Features:**
- 3x faster than previous Kling models
- Better prompt comprehension (handles multi-step instructions)
- Superior motion and physics simulation
- Excellent for dynamic content (ASMR actions, movement)

---

### 3. WAN 2.5 (fal.ai) - BASELINE

| Specification | Value |
|--------------|-------|
| **Provider** | fal.ai |
| **Model ID** | `fal-ai/wan-25-preview` |
| **Cost** | $0.10/second = $0.50 per 5-second clip |
| **Quality** | High |
| **Output Resolution** | 480p, 720p, 1080p |
| **Current Usage** | Layer 3 (Video Generation) |
| **Best For** | Baseline comparison |

---

## Cost Analysis

### Cost Comparison for 3×5-second Clips (Current Pipeline)

| Model | Cost per 5sec | Cost for 3×5sec | Savings vs WAN 2.5 | Monthly Savings (30 videos) |
|-------|---------------|-----------------|-------------------|----------------------------|
| **Ray 2 Flash** | $0.20 | **$0.60** | **60% (-$0.90)** | **$27.00** |
| **Kling 2.5 Turbo** | $0.21 | **$0.63** | **58% (-$0.87)** | **$26.10** |
| **WAN 2.5** (baseline) | $0.50 | $1.50 | — | — |

### Total Pipeline Cost Breakdown

| Component | Current (WAN 2.5) | With Ray 2 Flash | With Kling 2.5 |
|-----------|-------------------|------------------|----------------|
| Idea Generation | $0.01 | $0.01 | $0.01 |
| Prompt Engineering | $0.02 | $0.02 | $0.02 |
| Video Generation (3×5sec) | $1.50 | **$0.60** | **$0.63** |
| **Total per video** | **$1.53** | **$0.63** | **$0.66** |
| **Monthly (30 videos)** | **$45.90** | **$18.90** | **$19.80** |
| **Annual Savings** | — | **$324/year** | **$313/year** |

---

## Implementation Architecture

### Current Layer 3 Structure
```
src/layers/03-video-generation/
├── index.ts              # Main layer coordinator
├── providers/
│   ├── fal-provider.ts   # Current: WAN 2.5 only
│   └── index.ts
├── schema.ts             # Input/output validation
└── prompts.ts
```

### New Multi-Model Architecture
```
src/layers/03-video-generation/
├── index.ts              # Main layer coordinator (updated)
├── providers/
│   ├── fal-provider.ts   # WAN 2.5 + Ray 2 Flash
│   ├── kie-provider.ts   # NEW: Kling 2.5 Turbo
│   └── index.ts          # Provider factory (updated)
├── models/
│   ├── ray2-flash.ts     # NEW: Ray 2 Flash config
│   ├── kling-turbo.ts    # NEW: Kling 2.5 config
│   └── wan25.ts          # NEW: WAN 2.5 config
├── schema.ts             # Input/output validation
└── prompts.ts
```

### Configuration System

Add to `.env`:
```bash
# Video Generation Model Selection
VIDEO_MODEL=ray2-flash              # Options: ray2-flash, kling-turbo, wan25
VIDEO_MODEL_PROVIDER=fal            # Options: fal, kie

# Model-specific API Keys
FAL_API_KEY=your-fal-key            # For Ray 2 Flash + WAN 2.5
KIE_API_KEY=your-kie-key            # For Kling 2.5 Turbo

# Testing/Comparison Mode
ENABLE_MODEL_COMPARISON=false       # Set to true for A/B testing
COMPARISON_MODELS=ray2-flash,kling-turbo,wan25  # Comma-separated
```

---

## Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
cd "C:\Users\alger\Documents\000. Projects\000. social media"

# Install Kie.ai SDK (no official SDK, use axios)
npm install axios
```

### Step 2: Create Model Configuration Files

#### **File: `src/layers/03-video-generation/models/ray2-flash.ts`**

```typescript
import { ModelConfig } from '../types';

export const ray2FlashConfig: ModelConfig = {
  id: 'ray2-flash',
  name: 'Luma Ray 2 Flash',
  provider: 'fal',
  apiEndpoint: 'fal-ai/luma-dream-machine/ray-2-flash/text-to-video',
  costPerSecond: 0.04,
  maxDuration: 10,
  supportedResolutions: ['720p'],
  defaultResolution: '720p',
  features: {
    textToVideo: true,
    imageToVideo: true,
    controlNet: false,
  },
  pricing: {
    perSecond: 0.04,
    per5Second: 0.20,
  },
};
```

#### **File: `src/layers/03-video-generation/models/kling-turbo.ts`**

```typescript
import { ModelConfig } from '../types';

export const klingTurboConfig: ModelConfig = {
  id: 'kling-turbo',
  name: 'Kling 2.5 Turbo',
  provider: 'kie',
  apiEndpoint: 'https://kie.ai/api/v1/videos/generations',
  costPerSecond: 0.042,
  maxDuration: 10,
  supportedResolutions: ['720p', '1080p'],
  defaultResolution: '720p',
  features: {
    textToVideo: true,
    imageToVideo: true,
    controlNet: false,
  },
  pricing: {
    perSecond: 0.042,
    per5Second: 0.21,
  },
};
```

#### **File: `src/layers/03-video-generation/models/wan25.ts`**

```typescript
import { ModelConfig } from '../types';

export const wan25Config: ModelConfig = {
  id: 'wan25',
  name: 'WAN 2.5',
  provider: 'fal',
  apiEndpoint: 'fal-ai/wan-25-preview/text-to-video',
  costPerSecond: 0.10,
  maxDuration: 10,
  supportedResolutions: ['480p', '720p', '1080p'],
  defaultResolution: '720p',
  features: {
    textToVideo: true,
    imageToVideo: true,
    controlNet: false,
  },
  pricing: {
    perSecond: 0.10,
    per5Second: 0.50,
  },
};
```

### Step 3: Create Kie.ai Provider

#### **File: `src/layers/03-video-generation/providers/kie-provider.ts`**

```typescript
import axios from 'axios';
import { VideoProvider, GenerateVideoParams, GeneratedVideo } from '../types';
import { logger } from '../../../core/logger';

export class KieProvider implements VideoProvider {
  private apiKey: string;
  private baseUrl = 'https://kie.ai/api/v1';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Kie.ai API key is required');
    }
    this.apiKey = apiKey;
  }

  async generateVideo(params: GenerateVideoParams): Promise<GeneratedVideo> {
    const { prompt, duration = 5, modelConfig } = params;

    logger.info('Generating video with Kie.ai Kling 2.5 Turbo', {
      prompt: prompt.substring(0, 100),
      duration,
      model: modelConfig.id,
    });

    try {
      // Step 1: Submit generation request
      const createResponse = await axios.post(
        `${this.baseUrl}/videos/generations`,
        {
          model: 'kling-v2.5-turbo',
          prompt,
          duration,
          aspect_ratio: '9:16',
          mode: 'standard', // or 'professional' for higher quality
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const taskId = createResponse.data.id;
      logger.info('Kie.ai video generation started', { taskId });

      // Step 2: Poll for completion
      const video = await this.pollForCompletion(taskId, duration);

      // Step 3: Calculate cost
      const cost = duration * modelConfig.costPerSecond;

      return {
        url: video.url,
        duration: video.duration,
        fileSize: video.file_size,
        resolution: '720p',
        cost,
        model: modelConfig.id,
        provider: 'kie',
        metadata: {
          taskId,
          generationTime: video.generation_time,
        },
      };
    } catch (error: any) {
      logger.error('Kie.ai video generation failed', {
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(`Kie.ai generation failed: ${error.message}`);
    }
  }

  private async pollForCompletion(taskId: string, maxWaitTime = 120): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < maxWaitTime * 1000) {
      try {
        const response = await axios.get(
          `${this.baseUrl}/videos/generations/${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
            },
          }
        );

        const status = response.data.status;

        if (status === 'succeeded') {
          logger.info('Kie.ai video generation completed', { taskId });
          return response.data;
        } else if (status === 'failed') {
          throw new Error(`Video generation failed: ${response.data.error}`);
        }

        // Still processing, wait and retry
        logger.debug('Kie.ai video still processing', { taskId, status });
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error: any) {
        logger.error('Error polling Kie.ai status', { taskId, error: error.message });
        throw error;
      }
    }

    throw new Error(`Kie.ai video generation timeout after ${maxWaitTime}s`);
  }
}
```

### Step 4: Update Fal Provider to Support Ray 2 Flash

#### **File: `src/layers/03-video-generation/providers/fal-provider.ts` (Update)**

Add Ray 2 Flash support to your existing fal provider:

```typescript
import fal from '@fal-ai/client';
import { VideoProvider, GenerateVideoParams, GeneratedVideo } from '../types';
import { logger } from '../../../core/logger';

export class FalProvider implements VideoProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Fal.ai API key is required');
    }
    this.apiKey = apiKey;
    fal.config({ credentials: apiKey });
  }

  async generateVideo(params: GenerateVideoParams): Promise<GeneratedVideo> {
    const { prompt, duration = 5, modelConfig } = params;

    logger.info(`Generating video with fal.ai ${modelConfig.name}`, {
      prompt: prompt.substring(0, 100),
      duration,
      model: modelConfig.id,
    });

    try {
      // Determine which endpoint to use based on model
      const endpoint = modelConfig.apiEndpoint;

      const result = await fal.subscribe(endpoint, {
        input: {
          prompt,
          duration,
          ...(modelConfig.id === 'wan25' && { resolution: '720p' }),
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            logger.debug(`fal.ai ${modelConfig.name} progress`, update);
          }
        },
      });

      // Calculate cost
      const cost = duration * modelConfig.costPerSecond;

      return {
        url: result.video.url,
        duration: result.video.duration || duration,
        fileSize: result.video.file_size,
        resolution: modelConfig.defaultResolution,
        cost,
        model: modelConfig.id,
        provider: 'fal',
        metadata: {
          requestId: result.requestId,
        },
      };
    } catch (error: any) {
      logger.error(`fal.ai ${modelConfig.name} generation failed`, {
        error: error.message,
      });
      throw new Error(`fal.ai generation failed: ${error.message}`);
    }
  }
}
```

### Step 5: Update Provider Factory

#### **File: `src/layers/03-video-generation/providers/index.ts` (Update)**

```typescript
import { VideoProvider } from '../types';
import { FalProvider } from './fal-provider';
import { KieProvider } from './kie-provider';
import { ray2FlashConfig } from '../models/ray2-flash';
import { klingTurboConfig } from '../models/kling-turbo';
import { wan25Config } from '../models/wan25';

export function createVideoProvider(modelId: string): {
  provider: VideoProvider;
  config: ModelConfig;
} {
  const modelMap = {
    'ray2-flash': ray2FlashConfig,
    'kling-turbo': klingTurboConfig,
    'wan25': wan25Config,
  };

  const config = modelMap[modelId];
  if (!config) {
    throw new Error(`Unknown video model: ${modelId}`);
  }

  let provider: VideoProvider;

  switch (config.provider) {
    case 'fal':
      const falApiKey = process.env.FAL_API_KEY;
      if (!falApiKey) throw new Error('FAL_API_KEY not found in environment');
      provider = new FalProvider(falApiKey);
      break;

    case 'kie':
      const kieApiKey = process.env.KIE_API_KEY;
      if (!kieApiKey) throw new Error('KIE_API_KEY not found in environment');
      provider = new KieProvider(kieApiKey);
      break;

    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }

  return { provider, config };
}
```

### Step 6: Update Layer 3 Main File

#### **File: `src/layers/03-video-generation/index.ts` (Update)**

```typescript
import { createVideoProvider } from './providers';
import { logger } from '../../core/logger';
import { PromptOutput } from '../02-prompt-engineering/schema';
import { VideoGenerationOutput } from './schema';

export class VideoGenerationLayer {
  async execute(input: PromptOutput): Promise<VideoGenerationOutput> {
    const modelId = process.env.VIDEO_MODEL || 'ray2-flash';

    logger.info('Starting video generation', {
      contentId: input.contentId,
      model: modelId,
      promptCount: input.prompts.length,
    });

    const { provider, config } = createVideoProvider(modelId);
    const generatedVideos = [];

    for (let i = 0; i < input.prompts.length; i++) {
      const videoPrompt = input.prompts[i];

      logger.info(`Generating video ${i + 1}/${input.prompts.length}`, {
        contentId: input.contentId,
        segment: videoPrompt.segmentNumber,
      });

      const video = await provider.generateVideo({
        prompt: videoPrompt.prompt,
        duration: 5,
        modelConfig: config,
      });

      generatedVideos.push({
        segmentNumber: videoPrompt.segmentNumber,
        storagePath: `./content/${input.contentId}/raw/video_${i + 1}.mp4`,
        url: video.url,
        duration: video.duration,
        fileSize: video.fileSize,
        cost: video.cost,
        model: video.model,
      });
    }

    const totalCost = generatedVideos.reduce((sum, v) => sum + v.cost, 0);

    logger.info('Video generation complete', {
      contentId: input.contentId,
      model: modelId,
      totalCost: `$${totalCost.toFixed(2)}`,
      videoCount: generatedVideos.length,
    });

    return {
      contentId: input.contentId,
      videos: generatedVideos,
      totalCost,
      model: modelId,
    };
  }
}
```

---

## Testing & Comparison Strategy

### Test Objectives

1. **Quality Comparison:** Visual quality, prompt adherence, motion smoothness
2. **Cost Verification:** Confirm actual costs match documentation
3. **Speed Comparison:** Generation time for each model
4. **Reliability:** Success rate, error handling
5. **ASMR Suitability:** How well each model handles soft textures, gentle movements

### Testing Script

Create a new test script to generate comparison videos:

#### **File: `scripts/compare-video-models.ts`**

```typescript
import { VideoGenerationLayer } from '../src/layers/03-video-generation';
import { logger } from '../src/core/logger';

interface ComparisonResult {
  model: string;
  prompt: string;
  videoUrl: string;
  cost: number;
  generationTime: number;
  success: boolean;
  error?: string;
}

async function compareModels() {
  // Test prompts for ASMR content
  const testPrompts = [
    {
      id: 'soap-cutting',
      prompt: 'Close-up shot of hands gently cutting pastel pink soap bars with a sharp knife, slow motion, soft natural lighting, relaxing and satisfying movements, 9:16 vertical format',
    },
    {
      id: 'sand-pouring',
      prompt: 'Extreme close-up of fine white sand slowly pouring between fingers, soft diffused lighting, calming and mesmerizing flow, 9:16 vertical format',
    },
    {
      id: 'foam-squeezing',
      prompt: 'Hands slowly squeezing colorful foam slime with satisfying sounds, soft pastel colors, gentle movements, relaxing atmosphere, 9:16 vertical format',
    },
  ];

  const models = ['ray2-flash', 'kling-turbo', 'wan25'];
  const results: ComparisonResult[] = [];

  logger.info('Starting video model comparison test');

  for (const testPrompt of testPrompts) {
    logger.info(`\n=== Testing prompt: ${testPrompt.id} ===`);

    for (const modelId of models) {
      logger.info(`\nGenerating with model: ${modelId}`);

      const startTime = Date.now();

      try {
        // Set model in environment
        process.env.VIDEO_MODEL = modelId;

        const layer = new VideoGenerationLayer();
        const result = await layer.execute({
          contentId: `test-${testPrompt.id}-${modelId}`,
          prompts: [{
            segmentNumber: 1,
            prompt: testPrompt.prompt,
            visualDescription: testPrompt.prompt,
            cameraMovement: 'static',
            duration: 5,
          }],
        });

        const generationTime = (Date.now() - startTime) / 1000;

        results.push({
          model: modelId,
          prompt: testPrompt.id,
          videoUrl: result.videos[0].url,
          cost: result.videos[0].cost,
          generationTime,
          success: true,
        });

        logger.info(`✅ Success with ${modelId}`, {
          cost: `$${result.videos[0].cost.toFixed(2)}`,
          time: `${generationTime.toFixed(1)}s`,
          url: result.videos[0].url,
        });
      } catch (error: any) {
        const generationTime = (Date.now() - startTime) / 1000;

        results.push({
          model: modelId,
          prompt: testPrompt.id,
          videoUrl: '',
          cost: 0,
          generationTime,
          success: false,
          error: error.message,
        });

        logger.error(`❌ Failed with ${modelId}`, { error: error.message });
      }

      // Wait 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Generate comparison report
  generateComparisonReport(results);
}

function generateComparisonReport(results: ComparisonResult[]) {
  logger.info('\n\n=== COMPARISON REPORT ===\n');

  // Group by model
  const byModel: Record<string, ComparisonResult[]> = {};
  results.forEach(r => {
    if (!byModel[r.model]) byModel[r.model] = [];
    byModel[r.model].push(r);
  });

  // Print summary for each model
  Object.entries(byModel).forEach(([model, modelResults]) => {
    const successCount = modelResults.filter(r => r.success).length;
    const avgCost = modelResults.reduce((sum, r) => sum + r.cost, 0) / modelResults.length;
    const avgTime = modelResults.reduce((sum, r) => sum + r.generationTime, 0) / modelResults.length;

    logger.info(`\n${model.toUpperCase()}`);
    logger.info(`Success Rate: ${successCount}/${modelResults.length}`);
    logger.info(`Avg Cost: $${avgCost.toFixed(2)}`);
    logger.info(`Avg Time: ${avgTime.toFixed(1)}s`);
    logger.info('Videos:');
    modelResults.forEach(r => {
      if (r.success) {
        logger.info(`  - ${r.prompt}: ${r.videoUrl}`);
      } else {
        logger.error(`  - ${r.prompt}: FAILED (${r.error})`);
      }
    });
  });

  // Save results to file
  const fs = require('fs');
  const reportPath = `./test-output/model-comparison-${Date.now()}.json`;
  fs.mkdirSync('./test-output', { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  logger.info(`\nFull report saved to: ${reportPath}`);
}

// Run comparison
compareModels().catch(console.error);
```

### Running the Comparison Test

```bash
# Add script to package.json
npm pkg set scripts.compare-models="tsx scripts/compare-video-models.ts"

# Set up API keys
# Add to .env:
FAL_API_KEY=your-fal-key
KIE_API_KEY=your-kie-key

# Run comparison
npm run compare-models
```

### Manual Testing Checklist

After running the automated test, manually evaluate each video for:

#### **Quality Assessment**

| Criteria | Ray 2 Flash | Kling 2.5 Turbo | WAN 2.5 | Notes |
|----------|-------------|-----------------|---------|-------|
| **Visual Clarity** | ⭐⭐⭐⭐☆ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐☆ | Rate 1-5 stars |
| **Prompt Adherence** | ⭐⭐⭐⭐☆ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐☆ | How well it follows prompt |
| **Motion Smoothness** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐☆ | ⭐⭐⭐⭐☆ | No jitter or artifacts |
| **ASMR Suitability** | ⭐⭐⭐⭐☆ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐☆ | Soft textures, gentle movements |
| **Color Accuracy** | ⭐⭐⭐⭐☆ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐☆ | Pastel colors, natural tones |
| **Overall Score** | /25 | /25 | /25 | Sum of all criteria |

#### **Cost-Quality Score**

Calculate value score: `(Quality Score / 25) / Cost per 5sec`

| Model | Quality | Cost | Value Score | Rank |
|-------|---------|------|-------------|------|
| Ray 2 Flash | ?/25 | $0.20 | ? | ? |
| Kling 2.5 Turbo | ?/25 | $0.21 | ? | ? |
| WAN 2.5 | ?/25 | $0.50 | ? | ? |

---

## Integration with Existing Pipeline

### Configuration Options

#### **Option 1: Single Model (Simplest)**

In `.env`:
```bash
VIDEO_MODEL=ray2-flash
```

Pipeline uses only Ray 2 Flash for all videos.

#### **Option 2: A/B Testing Mode**

In `.env`:
```bash
VIDEO_MODEL=ray2-flash
ENABLE_MODEL_COMPARISON=true
COMPARISON_MODELS=ray2-flash,kling-turbo
```

Pipeline generates videos with both models, stores both, lets you pick best manually.

#### **Option 3: Prompt-Based Selection**

Implement intelligent model selection based on prompt complexity:

```typescript
function selectModel(prompt: string): string {
  // Use Kling for complex motion/physics
  if (prompt.includes('cutting') || prompt.includes('pouring') || prompt.includes('complex')) {
    return 'kling-turbo';
  }

  // Use Ray 2 Flash for simple static shots
  return 'ray2-flash';
}
```

### Migration Strategy

#### **Phase 1: Testing (Week 1)**
1. Generate 10-15 test videos with all three models
2. Manually review quality
3. Verify costs match expectations
4. Identify any API issues

#### **Phase 2: Parallel Run (Week 2)**
1. Enable `ENABLE_MODEL_COMPARISON=true`
2. Generate production content with both Ray 2 Flash and Kling 2.5
3. Keep WAN 2.5 as fallback
4. Track success rates

#### **Phase 3: Full Migration (Week 3)**
1. Choose winning model based on quality + cost
2. Set as default: `VIDEO_MODEL=ray2-flash` (or kling-turbo)
3. Remove WAN 2.5 from pipeline
4. Monitor cost savings

---

## Troubleshooting

### Common Issues

#### **1. Kie.ai API Authentication Fails**

**Error:** `401 Unauthorized`

**Solution:**
```bash
# Verify API key is set correctly
echo $KIE_API_KEY

# Check key format (should start with "kie_")
# Get new key from: https://kie.ai/dashboard/api-keys
```

#### **2. Ray 2 Flash Videos Look Different Than Expected**

**Issue:** Ray 2 Flash prioritizes speed over maximum quality

**Solution:**
- If quality insufficient, switch to Kling 2.5 Turbo
- Or use hybrid: Ray 2 Flash for simple scenes, Kling for complex ones

#### **3. Generation Timeout**

**Error:** `Video generation timeout after 120s`

**Solution:**
```typescript
// Increase timeout in kie-provider.ts
private async pollForCompletion(taskId: string, maxWaitTime = 180) { // 3 minutes
```

#### **4. Costs Higher Than Expected**

**Check:**
1. Verify duration is 5 seconds (not 10)
2. Check if generating at higher resolution than needed
3. Review logs for failed generations that still charge

```bash
# Check actual costs
grep "cost" logs/app.log | tail -n 20
```

#### **5. Model Not Found**

**Error:** `Unknown video model: xyz`

**Solution:**
```bash
# Check available models
echo $VIDEO_MODEL

# Must be one of: ray2-flash, kling-turbo, wan25
```

---

## Next Steps

### After Comparison Test

1. **Review Results:** Compare the generated videos side-by-side
2. **Calculate Value:** Use cost-quality score to determine best model
3. **Make Decision:**
   - Best cost + good quality → Ray 2 Flash
   - Best quality + reasonable cost → Kling 2.5 Turbo
   - Need both → Hybrid approach
4. **Update Configuration:** Set chosen model as default
5. **Monitor Production:** Track quality + costs for first week

### Recommended Approach

Based on industry benchmarks:

```bash
# Start with this configuration
VIDEO_MODEL=ray2-flash
ENABLE_MODEL_COMPARISON=false
```

**Rationale:**
- Ray 2 Flash is 60% cheaper than current (WAN 2.5)
- Quality is "High" according to benchmarks
- Easy integration (same provider - fal.ai)
- Kling 2.5 is only 5% more expensive, so easy to switch if needed

### Future Enhancements

1. **Smart Model Selection:** Auto-choose model based on prompt complexity
2. **Quality Scoring:** Automated quality assessment using AI
3. **Cost Tracking Dashboard:** Real-time cost monitoring
4. **Fallback System:** Auto-retry with different model on failure
5. **Batch Optimization:** Generate multiple videos in parallel

---

## References

- [Fal.ai Pricing](https://fal.ai/pricing)
- [Fal.ai Ray 2 Flash Docs](https://fal.ai/models/fal-ai/luma-dream-machine/ray-2-flash)
- [Kie.ai Kling 2.5 Documentation](https://kie.ai/kling-2-5)
- [WAN 2.5 Model Card](https://fal.ai/models/fal-ai/wan-25-preview)

---

**Questions or Issues?**

Check logs in `./logs/app.log` or refer to main project docs in `./docs/` and `./specs/architecture.md`.
