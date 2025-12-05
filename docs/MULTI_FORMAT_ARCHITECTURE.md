# Multi-Format Content Architecture (Future Implementation)

**Status:** Planning Document - Not Yet Implemented
**Architecture Pattern:** Content Strategy Pattern (Option 2)
**Purpose:** Enable multiple content formats (video, image, carousel) with different pipelines
**Implementation Priority:** After ASMR video pipeline is stable

---

## Table of Contents

1. [Overview](#overview)
2. [Why This Architecture](#why-this-architecture)
3. [Current vs Future Architecture](#current-vs-future-architecture)
4. [Content Strategy Pattern](#content-strategy-pattern)
5. [Project Structure](#project-structure)
6. [Strategy Interface](#strategy-interface)
7. [Example Strategies](#example-strategies)
8. [Profile Configuration](#profile-configuration)
9. [Database Schema Changes](#database-schema-changes)
10. [Shared Components](#shared-components)
11. [Migration Path](#migration-path)
12. [Implementation Checklist](#implementation-checklist)

---

## Overview

This document outlines the **Content Strategy Pattern** architecture that will enable the social media pipeline to support multiple content formats (video, images, carousels) with different processing pipelines.

### Key Principle
Different content types require fundamentally different processing steps:
- **ASMR videos**: idea → video prompts → video generation → composition → post
- **Psychology tips**: idea → image prompts → image generation → caption overlay → post
- **Quote graphics**: idea → design generation → typography → post
- **Carousel posts**: idea → multiple images → sequencing → multi-image post

Rather than forcing all content through the same 6-layer pipeline, each **content strategy** defines its own processing pipeline optimized for that format.

---

## Why This Architecture

### Problems with Current Fixed Pipeline

The current architecture has 6 fixed layers:
```
Idea → Prompt Eng → Video Gen → Composition → Review → Distribution
```

This works for ASMR videos but is problematic for other formats:

1. **Image-based content doesn't need video generation** ($0.75 wasted)
2. **Different formats have different steps** (images need caption overlay, videos need composition)
3. **Can't optimize per format** (TikTok videos vs Instagram carousels)
4. **Type safety is fragile** (Layer 3 output must match Layer 4 input)

### Benefits of Strategy Pattern

✅ **Format-specific pipelines**: Video strategy has 6 steps, image strategy has 5 different steps
✅ **Cost optimization**: Image content costs $0.05 vs $0.78 for video
✅ **Type safety**: Each strategy defines its own input/output contracts
✅ **Testability**: Test each strategy independently
✅ **Reusable components**: Share review/distribution logic across strategies
✅ **Easy expansion**: Add new strategies without modifying existing ones

---

## Current vs Future Architecture

### Current Architecture (MVP - Single Pipeline)

```
src/
├── core/
│   ├── orchestrator.ts       # Runs fixed 6-layer pipeline
│   └── types.ts
├── layers/                   # Fixed sequence
│   ├── 01-idea-generation/
│   ├── 02-prompt-engineering/
│   ├── 03-video-generation/
│   ├── 04-composition/
│   ├── 05-review/
│   └── 06-distribution/
└── config/
    └── profiles/
        └── asmr.json         # Only configures prompts
```

**Limitations:**
- All content must follow the same 6 steps
- Adding image generation requires modifying core pipeline
- Can't have different layer sequences per content type

### Future Architecture (Multi-Strategy)

```
src/
├── core/
│   ├── orchestrator.ts           # Routes profile → strategy
│   ├── content-strategy.ts       # Base interface
│   └── types.ts
├── strategies/                   # Multiple strategies
│   ├── video-content/
│   │   ├── index.ts              # VideoContentStrategy
│   │   └── layers/               # Video-specific pipeline
│   ├── image-content/
│   │   ├── index.ts              # ImageContentStrategy
│   │   └── layers/               # Image-specific pipeline
│   └── factory.ts                # Creates strategy from profile
├── shared/                       # Reusable across strategies
│   ├── review/
│   ├── distribution/
│   └── providers/
└── profiles/
    ├── asmr-video.json           # strategy: "video-content"
    └── psychology-image.json     # strategy: "image-content"
```

**Benefits:**
- Each strategy defines its own pipeline
- Add new strategies without changing existing code
- Share common logic (review, distribution) via `shared/`
- Type-safe per strategy

---

## Content Strategy Pattern

### Core Concept

A **Content Strategy** is a self-contained pipeline that:
1. Takes a profile configuration
2. Executes a series of steps specific to that content format
3. Returns a standardized result (video file, image file, carousel data, etc.)
4. Reports costs, metadata, and status

### Base Interface

```typescript
// src/core/content-strategy.ts

export interface ContentStrategyResult {
  contentId: string;
  outputType: 'video' | 'image' | 'carousel' | 'text';
  storagePath: string | string[];
  metadata: Record<string, any>;
  totalCost: number;
  processingTime: number;
}

export interface ContentStrategy {
  /**
   * Execute the full pipeline for this strategy
   */
  execute(): Promise<ContentStrategyResult>;

  /**
   * Validate that the profile config is valid for this strategy
   */
  validateConfig(config: unknown): boolean;

  /**
   * Get the expected output type
   */
  readonly outputType: 'video' | 'image' | 'carousel' | 'text';

  /**
   * Estimated cost per execution (for budgeting)
   */
  readonly estimatedCost: number;

  /**
   * Human-readable strategy name
   */
  readonly name: string;
}
```

### Strategy Factory

```typescript
// src/strategies/factory.ts

import { ContentStrategy } from '../core/content-strategy';
import { VideoContentStrategy } from './video-content';
import { ImageContentStrategy } from './image-content';

export function createStrategy(
  strategyType: string,
  config: unknown
): ContentStrategy {
  switch (strategyType) {
    case 'video-content':
      return new VideoContentStrategy(config);
    case 'image-content':
      return new ImageContentStrategy(config);
    case 'carousel-content':
      return new CarouselContentStrategy(config);
    default:
      throw new Error(`Unknown strategy type: ${strategyType}`);
  }
}
```

---

## Project Structure

### Full Directory Layout

```
src/
├── core/
│   ├── orchestrator.ts              # Routes profile → strategy
│   ├── content-strategy.ts          # Base interface & types
│   ├── database.ts                  # Database client
│   ├── storage.ts                   # File storage abstraction
│   ├── logger.ts                    # Winston logger
│   └── types.ts                     # Shared types
│
├── strategies/
│   ├── video-content/
│   │   ├── index.ts                 # VideoContentStrategy implementation
│   │   ├── config.schema.ts         # Zod schema for video config
│   │   └── layers/
│   │       ├── 01-idea-generation/
│   │       │   ├── index.ts
│   │       │   ├── prompts.ts
│   │       │   └── schema.ts
│   │       ├── 02-prompt-engineering/
│   │       ├── 03-video-generation/
│   │       ├── 04-composition/
│   │       ├── 05-review/
│   │       └── 06-distribution/
│   │
│   ├── image-content/
│   │   ├── index.ts                 # ImageContentStrategy implementation
│   │   ├── config.schema.ts         # Zod schema for image config
│   │   └── layers/
│   │       ├── 01-idea-generation/
│   │       ├── 02-image-prompt/
│   │       ├── 03-image-generation/
│   │       ├── 04-caption-overlay/
│   │       ├── 05-review/
│   │       └── 06-distribution/
│   │
│   ├── carousel-content/            # Future: multi-image posts
│   │   └── ...
│   │
│   └── factory.ts                   # Strategy factory function
│
├── shared/                          # Code reused across strategies
│   ├── review/
│   │   ├── core.ts                  # Platform-agnostic review logic
│   │   ├── providers/
│   │   │   ├── slack.ts
│   │   │   └── whatsapp.ts
│   │   └── adapters/                # Format-specific adaptations
│   │       ├── video-adapter.ts     # How to preview video for review
│   │       └── image-adapter.ts     # How to preview image for review
│   │
│   ├── distribution/
│   │   ├── platforms/
│   │   │   ├── instagram/
│   │   │   │   ├── video-post.ts
│   │   │   │   ├── image-post.ts
│   │   │   │   └── carousel-post.ts
│   │   │   ├── tiktok/
│   │   │   │   └── video-post.ts
│   │   │   └── youtube/
│   │   │       └── video-post.ts
│   │   └── core.ts                  # Shared distribution logic
│   │
│   └── providers/                   # External API clients
│       ├── anthropic.ts             # Claude API wrapper
│       ├── openai.ts                # GPT API wrapper
│       ├── fal.ts                   # Fal.ai video generation
│       ├── dalle.ts                 # DALL-E image generation
│       └── stability.ts             # Stable Diffusion (future)
│
├── profiles/                        # Content type configurations
│   ├── asmr-video.json
│   ├── psychology-image.json
│   ├── quotes-graphic.json
│   └── tips-carousel.json
│
└── index.ts                         # Entry point
```

### Key Differences from Current Structure

1. **`strategies/` replaces `layers/`**: Each strategy has its own layer structure
2. **`shared/` for common code**: Review and distribution are reusable
3. **`profiles/` at root**: JSON configs define which strategy to use
4. **Strategy factory**: Creates appropriate strategy based on profile

---

## Strategy Interface

### Base Interface Implementation

```typescript
// src/core/content-strategy.ts

export abstract class BaseContentStrategy implements ContentStrategy {
  protected contentId: string;
  protected db: Database;
  protected storage: Storage;
  protected logger: Logger;

  constructor(
    protected config: unknown,
    protected profile: ProfileConfig
  ) {
    this.contentId = generateUUID();
    this.db = createDatabaseClient();
    this.storage = createStorageClient();
    this.logger = createLogger();
  }

  abstract execute(): Promise<ContentStrategyResult>;
  abstract validateConfig(config: unknown): boolean;
  abstract readonly outputType: 'video' | 'image' | 'carousel' | 'text';
  abstract readonly estimatedCost: number;
  abstract readonly name: string;

  /**
   * Shared helper: Log processing step
   */
  protected async logStep(
    step: string,
    status: 'started' | 'completed' | 'failed',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.db.logProcessing({
      contentId: this.contentId,
      layer: step,
      status,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Shared helper: Update content status
   */
  protected async updateStatus(
    status: ContentStatus,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.db.updateContent(this.contentId, {
      status,
      metadata,
      updated_at: new Date(),
    });
  }
}
```

---

## Example Strategies

### Video Content Strategy

```typescript
// src/strategies/video-content/index.ts

import { BaseContentStrategy, ContentStrategyResult } from '../../core/content-strategy';
import { IdeaGenerationLayer } from './layers/01-idea-generation';
import { PromptEngineeringLayer } from './layers/02-prompt-engineering';
import { VideoGenerationLayer } from './layers/03-video-generation';
import { CompositionLayer } from './layers/04-composition';
import { ReviewLayer } from '../../shared/review/core';
import { VideoReviewAdapter } from '../../shared/review/adapters/video-adapter';
import { DistributionLayer } from '../../shared/distribution/core';

export class VideoContentStrategy extends BaseContentStrategy {
  readonly outputType = 'video' as const;
  readonly estimatedCost = 0.78;
  readonly name = 'Video Content Strategy';

  private ideaLayer: IdeaGenerationLayer;
  private promptLayer: PromptEngineeringLayer;
  private videoLayer: VideoGenerationLayer;
  private compositionLayer: CompositionLayer;
  private reviewLayer: ReviewLayer;
  private distributionLayer: DistributionLayer;

  constructor(config: unknown, profile: ProfileConfig) {
    super(config, profile);

    // Initialize layers with config
    this.ideaLayer = new IdeaGenerationLayer(this.config.idea);
    this.promptLayer = new PromptEngineeringLayer(this.config.prompt);
    this.videoLayer = new VideoGenerationLayer(this.config.videoGeneration);
    this.compositionLayer = new CompositionLayer(this.config.composition);
    this.reviewLayer = new ReviewLayer(
      this.config.review,
      new VideoReviewAdapter()
    );
    this.distributionLayer = new DistributionLayer(this.config.distribution);
  }

  async execute(): Promise<ContentStrategyResult> {
    const startTime = Date.now();
    let totalCost = 0;

    try {
      // Step 1: Generate idea
      this.logger.info('Step 1/6: Generating idea', { contentId: this.contentId });
      await this.logStep('idea-generation', 'started');

      const idea = await this.ideaLayer.execute();
      totalCost += idea.cost;

      await this.logStep('idea-generation', 'completed', { idea, cost: idea.cost });

      // Step 2: Engineer video prompts
      this.logger.info('Step 2/6: Engineering video prompts', { contentId: this.contentId });
      await this.logStep('prompt-engineering', 'started');

      const prompts = await this.promptLayer.execute(idea);
      totalCost += prompts.cost;

      await this.logStep('prompt-engineering', 'completed', { prompts, cost: prompts.cost });

      // Step 3: Generate videos
      this.logger.info('Step 3/6: Generating videos', { contentId: this.contentId });
      await this.logStep('video-generation', 'started');

      const videos = await this.videoLayer.execute(prompts);
      totalCost += videos.cost;

      await this.logStep('video-generation', 'completed', { videos, cost: videos.cost });

      // Step 4: Compose final video
      this.logger.info('Step 4/6: Composing final video', { contentId: this.contentId });
      await this.logStep('composition', 'started');

      const finalVideo = await this.compositionLayer.execute(videos);

      await this.logStep('composition', 'completed', { finalVideo });

      // Step 5: Review
      this.logger.info('Step 5/6: Awaiting review', { contentId: this.contentId });
      await this.logStep('review', 'started');

      const reviewResult = await this.reviewLayer.execute({
        contentId: this.contentId,
        contentPath: finalVideo.storagePath,
        contentType: 'video',
        caption: idea.caption,
      });

      if (reviewResult.decision === 'rejected') {
        await this.updateStatus('rejected', { reason: reviewResult.reason });
        return {
          contentId: this.contentId,
          outputType: 'video',
          storagePath: finalVideo.storagePath,
          metadata: { rejected: true, reason: reviewResult.reason },
          totalCost,
          processingTime: Date.now() - startTime,
        };
      }

      await this.logStep('review', 'completed', { decision: 'approved' });

      // Step 6: Distribution
      this.logger.info('Step 6/6: Distributing to platforms', { contentId: this.contentId });
      await this.logStep('distribution', 'started');

      const distributionResult = await this.distributionLayer.execute({
        contentId: this.contentId,
        contentType: 'video',
        videoPath: finalVideo.storagePath,
        caption: reviewResult.editedCaption || idea.caption,
        platforms: this.config.distribution.platforms,
      });

      await this.logStep('distribution', 'completed', { platforms: distributionResult.platforms });
      await this.updateStatus('posted', { platforms: distributionResult.platforms });

      return {
        contentId: this.contentId,
        outputType: 'video',
        storagePath: finalVideo.storagePath,
        metadata: {
          idea,
          finalVideo,
          platforms: distributionResult.platforms,
        },
        totalCost,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      this.logger.error('Video strategy failed', { error, contentId: this.contentId });
      await this.updateStatus('failed', { error: error.message });
      throw error;
    }
  }

  validateConfig(config: unknown): boolean {
    // Use Zod schema to validate
    try {
      videoContentConfigSchema.parse(config);
      return true;
    } catch {
      return false;
    }
  }
}
```

### Image Content Strategy

```typescript
// src/strategies/image-content/index.ts

export class ImageContentStrategy extends BaseContentStrategy {
  readonly outputType = 'image' as const;
  readonly estimatedCost = 0.05;  // Much cheaper than video!
  readonly name = 'Image Content Strategy';

  private ideaLayer: IdeaGenerationLayer;
  private imagePromptLayer: ImagePromptLayer;
  private imageGenLayer: ImageGenerationLayer;
  private captionOverlayLayer: CaptionOverlayLayer;
  private reviewLayer: ReviewLayer;
  private distributionLayer: DistributionLayer;

  async execute(): Promise<ContentStrategyResult> {
    const startTime = Date.now();
    let totalCost = 0;

    try {
      // Step 1: Generate idea
      const idea = await this.ideaLayer.execute();
      totalCost += idea.cost;

      // Step 2: Create image prompt
      const imagePrompt = await this.imagePromptLayer.execute(idea);
      totalCost += imagePrompt.cost;

      // Step 3: Generate image (DALL-E or Stable Diffusion)
      const image = await this.imageGenLayer.execute(imagePrompt);
      totalCost += image.cost;

      // Step 4: Add caption overlay (if needed)
      const finalImage = await this.captionOverlayLayer.execute({
        imagePath: image.storagePath,
        caption: idea.caption,
        style: this.config.captionStyle,
      });

      // Step 5: Review
      const reviewResult = await this.reviewLayer.execute({
        contentId: this.contentId,
        contentPath: finalImage.storagePath,
        contentType: 'image',
        caption: idea.caption,
      });

      if (reviewResult.decision === 'rejected') {
        await this.updateStatus('rejected');
        return { /* ... */ };
      }

      // Step 6: Distribution
      const distributionResult = await this.distributionLayer.execute({
        contentId: this.contentId,
        contentType: 'image',
        imagePath: finalImage.storagePath,
        caption: reviewResult.editedCaption || idea.caption,
        platforms: this.config.distribution.platforms,
      });

      return {
        contentId: this.contentId,
        outputType: 'image',
        storagePath: finalImage.storagePath,
        metadata: { idea, image: finalImage, platforms: distributionResult.platforms },
        totalCost,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      this.logger.error('Image strategy failed', { error });
      throw error;
    }
  }
}
```

---

## Profile Configuration

### Profile Schema

```typescript
// src/core/profile-config.ts

import { z } from 'zod';

export const profileConfigSchema = z.object({
  name: z.string(),
  contentType: z.string(),
  strategy: z.enum(['video-content', 'image-content', 'carousel-content']),
  enabled: z.boolean().default(true),
  schedule: z.string().optional(),  // Cron expression
  config: z.record(z.any()),        // Strategy-specific config
  platforms: z.array(z.enum(['instagram', 'tiktok', 'youtube', 'pinterest'])),
  costLimit: z.number().default(2.0),
});

export type ProfileConfig = z.infer<typeof profileConfigSchema>;
```

### Example: Video Profile (ASMR)

```json
{
  "name": "ASMR Traditional Crafts",
  "contentType": "asmr",
  "strategy": "video-content",
  "enabled": true,
  "schedule": "0 9 * * *",
  "platforms": ["instagram"],
  "costLimit": 2.0,
  "config": {
    "idea": {
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "systemPrompt": "You are an AI designed to generate creative ASMR content ideas...",
      "userPrompt": "Generate a concept involving traditional crafts..."
    },
    "prompt": {
      "provider": "openai",
      "model": "gpt-4"
    },
    "videoGeneration": {
      "provider": "fal-wan25",
      "duration": 5,
      "segments": 3,
      "resolution": "720p",
      "aspectRatio": "9:16"
    },
    "composition": {
      "transitions": "none",
      "audio": "none"
    },
    "review": {
      "provider": "slack",
      "webhookUrl": "${SLACK_WEBHOOK_URL}"
    },
    "distribution": {
      "priority": "instagram",
      "uploadToGoogleDrive": true
    }
  }
}
```

### Example: Image Profile (Psychology Hacks)

```json
{
  "name": "Psychology Life Hacks",
  "contentType": "psychology-hacks",
  "strategy": "image-content",
  "enabled": true,
  "schedule": "0 15 * * *",
  "platforms": ["instagram", "pinterest"],
  "costLimit": 0.5,
  "config": {
    "idea": {
      "provider": "openai",
      "model": "gpt-4-turbo",
      "systemPrompt": "Generate practical psychology tips that are actionable...",
      "userPrompt": "Create a psychology hack that people can apply immediately..."
    },
    "imagePrompt": {
      "provider": "openai",
      "model": "gpt-4"
    },
    "imageGeneration": {
      "provider": "dalle3",
      "size": "1024x1792",
      "style": "natural",
      "quality": "standard"
    },
    "captionOverlay": {
      "enabled": true,
      "fontFamily": "Inter",
      "fontSize": 48,
      "position": "center",
      "backgroundColor": "rgba(0,0,0,0.7)"
    },
    "review": {
      "provider": "whatsapp",
      "phoneNumber": "${WHATSAPP_REVIEW_NUMBER}"
    },
    "distribution": {
      "priority": "pinterest"
    }
  }
}
```

---

## Database Schema Changes

### Updated Content Table

```sql
-- Add new columns to content table
ALTER TABLE content
  ADD COLUMN strategy_type VARCHAR(50) NOT NULL DEFAULT 'video-content',
  ADD COLUMN output_type VARCHAR(20) NOT NULL DEFAULT 'video',
  ADD COLUMN output_metadata JSONB;

-- Add index for querying by strategy
CREATE INDEX idx_content_strategy_type ON content(strategy_type);
CREATE INDEX idx_content_output_type ON content(output_type);

-- Add check constraint
ALTER TABLE content
  ADD CONSTRAINT check_output_type
  CHECK (output_type IN ('video', 'image', 'carousel', 'text'));
```

### Output Metadata Examples

Different output types store different metadata:

```typescript
// Video output_metadata
{
  videoPath: "/content/{id}/final_video.mp4",
  duration: 15,
  fileSize: 12485760,
  resolution: "720p",
  aspectRatio: "9:16",
  segments: 3,
  googleDriveUrl: "https://drive.google.com/..."
}

// Image output_metadata
{
  imagePath: "/content/{id}/final_image.png",
  dimensions: { width: 1080, height: 1920 },
  fileSize: 2485760,
  format: "png",
  hasTextOverlay: true
}

// Carousel output_metadata
{
  images: [
    { path: "/content/{id}/slide_1.png", order: 1 },
    { path: "/content/{id}/slide_2.png", order: 2 },
    { path: "/content/{id}/slide_3.png", order: 3 }
  ],
  slideCount: 3,
  totalFileSize: 7485760
}
```

### Updated Platform Posts Table

```sql
-- Add post_type to distinguish video vs image posts
ALTER TABLE platform_posts
  ADD COLUMN post_type VARCHAR(20) NOT NULL DEFAULT 'video';

-- Different platforms store different post metadata
-- Instagram video post:
{
  "media_type": "VIDEO",
  "media_id": "123456789",
  "permalink": "https://instagram.com/p/..."
}

-- Instagram image post:
{
  "media_type": "IMAGE",
  "media_id": "987654321",
  "permalink": "https://instagram.com/p/..."
}

-- Instagram carousel post:
{
  "media_type": "CAROUSEL",
  "media_id": "555555555",
  "children": ["111", "222", "333"],
  "permalink": "https://instagram.com/p/..."
}
```

---

## Shared Components

### Review System Abstraction

```typescript
// src/shared/review/core.ts

export interface ReviewInput {
  contentId: string;
  contentType: 'video' | 'image' | 'carousel';
  contentPath: string | string[];
  caption: string;
}

export interface ReviewOutput {
  decision: 'approved' | 'rejected' | 'edited';
  editedCaption?: string;
  reason?: string;
}

export interface ReviewAdapter {
  preparePreview(input: ReviewInput): Promise<PreviewData>;
}

export class ReviewLayer {
  constructor(
    private config: ReviewConfig,
    private adapter: ReviewAdapter
  ) {}

  async execute(input: ReviewInput): Promise<ReviewOutput> {
    // 1. Use adapter to prepare preview (video thumbnail vs image preview)
    const preview = await this.adapter.preparePreview(input);

    // 2. Send to review platform (Slack/WhatsApp)
    await this.sendReviewRequest(preview);

    // 3. Wait for approval
    const decision = await this.waitForApproval(input.contentId);

    return decision;
  }
}
```

### Review Adapters (Format-Specific)

```typescript
// src/shared/review/adapters/video-adapter.ts

export class VideoReviewAdapter implements ReviewAdapter {
  async preparePreview(input: ReviewInput): Promise<PreviewData> {
    // For video: generate thumbnail, get video duration
    const thumbnail = await generateThumbnail(input.contentPath);
    const metadata = await getVideoMetadata(input.contentPath);

    return {
      previewUrl: thumbnail,
      metadata: {
        duration: metadata.duration,
        resolution: metadata.resolution,
      },
      caption: input.caption,
    };
  }
}

// src/shared/review/adapters/image-adapter.ts

export class ImageReviewAdapter implements ReviewAdapter {
  async preparePreview(input: ReviewInput): Promise<PreviewData> {
    // For image: use the image itself as preview
    return {
      previewUrl: input.contentPath,
      metadata: {},
      caption: input.caption,
    };
  }
}
```

### Distribution Platform Wrappers

```typescript
// src/shared/distribution/platforms/instagram/core.ts

export class InstagramPlatform {
  async postVideo(options: VideoPostOptions): Promise<PostResult> {
    // Instagram video posting logic
  }

  async postImage(options: ImagePostOptions): Promise<PostResult> {
    // Instagram image posting logic
  }

  async postCarousel(options: CarouselPostOptions): Promise<PostResult> {
    // Instagram carousel posting logic
  }
}
```

---

## Migration Path

### Phase 1: Extract Current Pipeline (No Breaking Changes)

**Goal:** Move existing code into strategy structure without changing functionality

**Steps:**
1. Create `src/strategies/video-content/` directory
2. Move `src/layers/` → `src/strategies/video-content/layers/`
3. Create `VideoContentStrategy` class that wraps current pipeline logic
4. Update `orchestrator.ts` to use `VideoContentStrategy`
5. Test that everything still works exactly as before

**Files to modify:**
- `src/core/orchestrator.ts` - Use strategy pattern
- Create `src/strategies/video-content/index.ts` - Wrap existing layers
- Create `src/strategies/factory.ts` - Strategy factory
- Create `src/core/content-strategy.ts` - Base interface

**Database changes:** None (not yet)

**Breaking changes:** None (internal refactor only)

**Time estimate:** 2-3 hours

---

### Phase 2: Add Profile Configuration

**Goal:** Make video strategy configurable via profile JSON

**Steps:**
1. Create `profiles/` directory at project root
2. Create `profiles/asmr-video.json` with existing config
3. Update orchestrator to load profile and pass to strategy
4. Add `--profile` CLI argument support

**Files to create:**
- `profiles/asmr-video.json`
- `src/core/profile-loader.ts`

**Files to modify:**
- `src/index.ts` - Accept `--profile` argument
- `src/core/orchestrator.ts` - Load profile before creating strategy

**Database changes:** None (not yet)

**Breaking changes:** None (default profile = current behavior)

**Time estimate:** 1-2 hours

---

### Phase 3: Extract Shared Components

**Goal:** Prepare for multi-strategy by extracting reusable logic

**Steps:**
1. Create `src/shared/review/` directory
2. Move review logic to shared, create adapters
3. Create `src/shared/distribution/` directory
4. Move platform posting logic to shared
5. Create `src/shared/providers/` for API wrappers

**Files to create:**
- `src/shared/review/core.ts`
- `src/shared/review/adapters/video-adapter.ts`
- `src/shared/distribution/core.ts`
- `src/shared/distribution/platforms/instagram/`

**Files to modify:**
- `src/strategies/video-content/layers/05-review/` - Use shared review
- `src/strategies/video-content/layers/06-distribution/` - Use shared distribution

**Database changes:** None (not yet)

**Breaking changes:** None (internal refactor)

**Time estimate:** 3-4 hours

---

### Phase 4: Update Database Schema

**Goal:** Support multiple content types in database

**Steps:**
1. Create migration script
2. Add `strategy_type`, `output_type`, `output_metadata` columns
3. Add indexes
4. Update database client to handle new fields

**Files to create:**
- `scripts/migrations/002-multi-strategy.sql`

**Files to modify:**
- `src/core/database.ts` - Update queries for new schema
- `src/core/types.ts` - Update TypeScript types

**Database changes:**
```sql
ALTER TABLE content
  ADD COLUMN strategy_type VARCHAR(50),
  ADD COLUMN output_type VARCHAR(20),
  ADD COLUMN output_metadata JSONB;
```

**Breaking changes:** Need to migrate existing rows

**Time estimate:** 1-2 hours

---

### Phase 5: Implement Image Content Strategy

**Goal:** Prove the pattern works by adding second strategy

**Steps:**
1. Create `src/strategies/image-content/` directory
2. Implement `ImageContentStrategy` class
3. Create image-specific layers (idea, image-prompt, image-gen, caption-overlay)
4. Create `profiles/psychology-image.json`
5. Add image review adapter
6. Add Instagram image posting support

**Files to create:**
- `src/strategies/image-content/index.ts`
- `src/strategies/image-content/layers/` (all layers)
- `profiles/psychology-image.json`
- `src/shared/review/adapters/image-adapter.ts`
- `src/shared/distribution/platforms/instagram/image-post.ts`

**Files to modify:**
- `src/strategies/factory.ts` - Add 'image-content' case
- `src/shared/providers/` - Add DALL-E or Stable Diffusion client

**Database changes:** None (schema already supports it)

**Breaking changes:** None (additive only)

**Time estimate:** 6-8 hours (new strategy from scratch)

---

### Phase 6: Testing & Validation

**Goal:** Ensure both strategies work independently

**Steps:**
1. Test video strategy with existing ASMR profile
2. Test image strategy with new psychology profile
3. Run both strategies sequentially
4. Verify database stores correct output_type
5. Verify review works for both formats
6. Verify distribution works for both formats

**Time estimate:** 2-3 hours

---

### Total Migration Time Estimate: 15-22 hours

Can be done incrementally over 1-2 weeks without disrupting current pipeline.

---

## Implementation Checklist

### Pre-Implementation (Do First)
- [ ] Complete ASMR video pipeline end-to-end
- [ ] Verify database, storage, review, distribution all working
- [ ] Document current system behavior (baseline for testing)
- [ ] Create backup of current codebase

### Phase 1: Extract Strategy (Safe Refactor)
- [ ] Create `src/strategies/video-content/` directory
- [ ] Move layers to `src/strategies/video-content/layers/`
- [ ] Create `VideoContentStrategy` class
- [ ] Create `src/core/content-strategy.ts` interface
- [ ] Create `src/strategies/factory.ts`
- [ ] Update `orchestrator.ts` to use strategy
- [ ] Run full pipeline test - verify no behavior changes

### Phase 2: Add Profile System
- [ ] Create `profiles/` directory
- [ ] Create `profiles/asmr-video.json`
- [ ] Create `src/core/profile-loader.ts`
- [ ] Add `--profile` CLI argument to `src/index.ts`
- [ ] Update orchestrator to load profile
- [ ] Test with `npm run pipeline -- --profile=asmr-video`

### Phase 3: Extract Shared Components
- [ ] Create `src/shared/review/` with core + adapters
- [ ] Create `VideoReviewAdapter`
- [ ] Update video strategy to use shared review
- [ ] Create `src/shared/distribution/` with platform logic
- [ ] Move Instagram posting to shared
- [ ] Update video strategy to use shared distribution
- [ ] Test video pipeline still works

### Phase 4: Database Migration
- [ ] Write migration script (`scripts/migrations/002-multi-strategy.sql`)
- [ ] Backup production database (if applicable)
- [ ] Run migration locally
- [ ] Update `src/core/database.ts` queries
- [ ] Update TypeScript types in `src/core/types.ts`
- [ ] Test video pipeline with new schema

### Phase 5: Implement Image Strategy
- [ ] Create `src/strategies/image-content/` directory
- [ ] Implement `ImageContentStrategy` class
- [ ] Implement Layer 1: Idea Generation (reuse or customize)
- [ ] Implement Layer 2: Image Prompt Engineering
- [ ] Implement Layer 3: Image Generation (DALL-E integration)
- [ ] Implement Layer 4: Caption Overlay
- [ ] Implement Layer 5: Review (reuse shared with ImageAdapter)
- [ ] Implement Layer 6: Distribution (reuse shared)
- [ ] Create `profiles/psychology-image.json`
- [ ] Create `ImageReviewAdapter`
- [ ] Add DALL-E provider to `src/shared/providers/dalle.ts`
- [ ] Add Instagram image posting to shared distribution
- [ ] Update strategy factory

### Phase 6: Testing
- [ ] Test video strategy independently
- [ ] Test image strategy independently
- [ ] Test both strategies in same day (different times)
- [ ] Verify database stores correct metadata for both
- [ ] Verify review workflow for both formats
- [ ] Verify Instagram posting for both formats
- [ ] Cost tracking works for both strategies
- [ ] Error handling works for both strategies

### Phase 7: Documentation
- [ ] Update `README.md` with multi-strategy usage
- [ ] Document profile configuration schema
- [ ] Document how to add new strategies
- [ ] Update `CLAUDE.md` with new architecture
- [ ] Create example profiles for common content types

---

## Cost Comparison: Video vs Image

| Component | Video (ASMR) | Image (Psychology) |
|-----------|--------------|-------------------|
| Idea Generation | $0.01 | $0.01 |
| Prompt Engineering | $0.02 | $0.02 |
| Content Generation | $0.75 (Fal.ai) | $0.04 (DALL-E 3) |
| Post-Processing | $0.00 (FFmpeg) | $0.00 (Image overlay) |
| **Total** | **$0.78/post** | **$0.07/post** |
| **Monthly (30 posts)** | **$23.40** | **$2.10** |

**Key Insight:** Image-based content is **11x cheaper** than video content. This makes image strategies ideal for:
- High-frequency posting (3-5x per day)
- Testing new content ideas cheaply
- Building audience before investing in video

---

## Future Strategy Ideas

Once the pattern is established, you can easily add:

### Carousel Strategy
- Multiple related images in sequence
- Great for "Top 5" lists, step-by-step guides
- Instagram carousels get high engagement

### Text Post Strategy
- AI-generated quotes, tips, facts
- Overlay on simple background
- Zero content generation cost (just LLM)
- Can produce 10-20 posts per day cheaply

### Mixed Media Strategy
- Combine image + short text video overlay
- Best of both worlds (cheap + engaging)
- TikTok-style text overlays on static images

### Video Remix Strategy
- Take existing video, add new caption/audio
- Repurpose content for different platforms
- No video generation cost (just composition)

---

## Key Design Principles

When implementing this architecture, remember:

1. **Each strategy is independent** - One strategy failing doesn't affect others
2. **Shared code is truly shared** - Don't duplicate review/distribution logic
3. **Type safety at boundaries** - Validate inputs/outputs between layers
4. **Cost tracking per strategy** - Monitor which content types are profitable
5. **Fail gracefully** - If image strategy fails, video strategy should still work
6. **Profile = single source of truth** - All config comes from profile JSON
7. **Database schema is strategy-agnostic** - Works for video, image, future formats

---

## Questions to Answer During Implementation

1. **How similar are idea generation across strategies?**
   - Can video and image strategies share idea layer?
   - Or do they need completely different prompts?

2. **Should distribution be format-aware or platform-aware?**
   - Is it better to have `InstagramVideoPost` and `InstagramImagePost`?
   - Or unified `InstagramPost` that handles both?

3. **How to handle strategy-specific metadata?**
   - Store in `output_metadata` JSONB column?
   - Or create separate tables per output type?

4. **Should review adapters be per-format or per-platform?**
   - `VideoReviewAdapter` vs `SlackReviewAdapter`?
   - Current design uses per-format, but consider trade-offs

5. **How to schedule multiple strategies?**
   - One cron job that runs all enabled profiles?
   - Separate cron jobs per profile?
   - Database-driven scheduler?

---

## References

- **Current Architecture:** `specs/architecture.md`
- **Current Project Context:** `CLAUDE.md`
- **Database Schema:** `scripts/setup-db.ts`
- **Current Layer Structure:** `src/layers/`

---

**Document Version:** 1.0
**Created:** 2025-10-31
**Last Updated:** 2025-10-31
**Status:** Planning - Not Yet Implemented
**Next Review:** After ASMR video pipeline is stable and running for 1+ week
