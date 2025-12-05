# Social Media Content Pipeline - Base Architecture

**Version:** 1.0
**Last Updated:** 2025-10-25
**Status:** Foundation Specification

---

## Executive Summary

This document outlines the architecture for an automated social media content generation pipeline. The system generates daily short-form ASMR videos (15 seconds, 720p, 9:16 vertical) and distributes them to Instagram, TikTok, and YouTube Shorts.

**Key Principles:**
1. **Working system first** - MVP approach, iterate later
2. **Modularity** - Each layer is independently swappable
3. **Extensibility** - Easy to add new content types, platforms, or AI models
4. **Local-first** - Run entirely on your machine, cloud only when needed
5. **Cost-effective** - ~$0.80/video (API costs only, zero infrastructure)

---

## Technology Stack

### Core Runtime
- **Language:** Node.js 20+ with TypeScript
- **Why:** Async-first, rich API ecosystem, easy deployment, type safety

### Key Dependencies
```json
{
  "core": {
    "@anthropic-ai/sdk": "OpenAI/Anthropic API clients",
    "fal-client": "Fal.ai video generation",
    "axios": "HTTP requests",
    "zod": "Runtime type validation",
    "pg": "PostgreSQL client"
  },
  "utilities": {
    "winston": "Logging",
    "dotenv": "Environment configuration",
    "node-cron": "Task scheduling",
    "fluent-ffmpeg": "Video composition"
  },
  "optional_cloud": {
    "@aws-sdk/client-s3": "S3/R2 storage (only if using cloud storage)"
  }
}
```

### Infrastructure (Local-First Approach)

**Default Setup (All Local):**
- **Storage:** Local filesystem (`./content` directory)
- **Database:** Local PostgreSQL (installed on your machine)
- **Hosting:** Runs on your local machine or always-on home server
- **Logging:** Local files with rotation (Winston)

**Cloud Migration Options (When Needed):**
- **Storage:** Cloudflare R2 or AWS S3 (when scaling beyond local disk)
- **Database:** Managed PostgreSQL (Supabase/Neon when need remote access)
- **Hosting:** VPS (DigitalOcean/Hetzner) or Serverless (Lambda/Workers)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SCHEDULER (Cron)                      │
│                  Triggers at 9:00 AM daily               │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              ORCHESTRATOR (Main Pipeline)                │
│           Coordinates all layers sequentially            │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  LAYER 1     │───▶│  LAYER 2     │───▶│  LAYER 3     │
│  Idea Gen    │    │  Prompt Gen  │    │  Video Gen   │
└──────────────┘    └──────────────┘    └──────────────┘
                                                │
                            ┌───────────────────┘
                            ▼
                    ┌──────────────┐
                    │  LAYER 4     │
                    │  Composition │
                    └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  LAYER 5     │
                    │  Review      │
                    └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  LAYER 6     │
                    │  Distribution│
                    └──────────────┘

════════════════ Supporting Infrastructure ═════════════════

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Storage    │  │   Database   │  │   Logging    │
│    (Local)   │  │    (Local)   │  │   (Local)    │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Local vs Cloud Components

This architecture follows a **local-first** approach. Here's what runs where:

### ✅ Local Components (Default)
| Component | Technology | Why Local |
|-----------|------------|-----------|
| **Storage** | Filesystem (`./content`) | Free, fast, sufficient for 1 video/day (~500MB/month) |
| **Database** | PostgreSQL | Full control, no latency, works offline |
| **Video Composition** | FFmpeg (local binary) | Zero cost, faster than API, full control |
| **Logging** | Winston → local files | Privacy, no external dependencies |
| **Orchestrator** | Node.js process | Runs on your machine/server |
| **Scheduler** | node-cron | Built-in, no external service needed |

### ☁️ Cloud Components (Required)
| Component | Service | Why Cloud |
|-----------|---------|-----------|
| **AI - Idea Generation** | Anthropic/OpenAI | No local LLMs match quality/speed |
| **AI - Prompt Engineering** | OpenAI GPT-4 | Specialized task, API-based |
| **AI - Video Generation** | Fal.ai WAN 2.5 | Requires massive compute (GPUs) |
| **Social Media APIs** | Instagram/TikTok/YouTube | External platforms, no alternative |
| **Review Notifications** | Slack/Discord | Optional: could use local web UI |

### 🔄 Optional Cloud (Future Scaling)
| Component | When to Switch | Cloud Option |
|-----------|----------------|--------------|
| **Storage** | >100GB or need remote access | Cloudflare R2, AWS S3 |
| **Database** | Multi-server or remote access | Supabase, Neon, RDS |
| **Hosting** | 24/7 uptime or scaling | VPS, Serverless |
| **Monitoring** | Production systems | Datadog, Sentry |

**Key Benefit:** At 1 video/day, you only pay for AI API calls (~$0.78/video). Zero infrastructure costs.

---

## Layer Specifications

### Layer 1: Idea Generation
**Purpose:** Generate viral content concepts

**Input:**
- Topic template (configured)
- Content type (ASMR cultural crafts)

**Processing:**
- Call LLM API (Claude/GPT-4)
- Apply prompt template
- Validate output against schema

**Output Schema:**
```typescript
interface IdeaOutput {
  id: string;                    // UUID
  timestamp: string;             // ISO-8601
  idea: string;                  // e.g., "Black Moroccan zellige..."
  caption: string;               // With emoji + hashtags
  culturalContext: string;       // e.g., "Moroccan zellige tilework"
  environment: string;           // Scene description
  soundConcept: string;          // Audio description
  status: 'for_production';
}
```

**API Cost:** ~$0.01/call

**Implementation File:** `src/layers/01-idea-generation/index.ts`

**Swappable Components:**
- LLM provider (Claude ↔ GPT-4 ↔ Gemini)
- Prompt template
- Validation rules

---

### Layer 2: Prompt Engineering
**Purpose:** Convert ideas into WAN 2.5-optimized prompts

**Input:** `IdeaOutput` from Layer 1

**Processing:**
- Call LLM API to generate 3 sequential prompts
- Each prompt: 100-200 words
- Optimized for WAN 2.5 text-to-video
- Include audio generation instructions

**Output Schema:**
```typescript
interface PromptOutput {
  contentId: string;             // References IdeaOutput.id
  prompts: VideoPrompt[];
}

interface VideoPrompt {
  sequence: 1 | 2 | 3;
  videoPrompt: string;           // Visual description
  audioPrompt: string;           // Sound description
  duration: 5;                   // seconds
  resolution: '720p';
  aspectRatio: '9:16';
}
```

**API Cost:** ~$0.02/call

**Implementation File:** `src/layers/02-prompt-engineering/index.ts`

**Swappable Components:**
- LLM provider
- Prompt optimization strategy
- Number of video segments (3 → N)

---

### Layer 3: Video Generation
**Purpose:** Generate videos using Fal.ai WAN 2.5

**Input:** `PromptOutput` from Layer 2

**Processing:**
- For each prompt (3 total):
  - Call Fal.ai WAN 2.5 API
  - Poll for completion
  - Download video file
  - Store to local filesystem (or cloud storage if configured)

**Output Schema:**
```typescript
interface VideoGenerationOutput {
  contentId: string;
  videos: GeneratedVideo[];
}

interface GeneratedVideo {
  sequence: 1 | 2 | 3;
  storagePath: string;           // Local file path or cloud URL
  duration: number;              // seconds
  resolution: string;
  aspectRatio: string;
  hasAudio: true;
  generatedAt: string;
  cost: number;                  // USD
}
```

**API Cost:** 3 × 5 sec × $0.05/sec = **$0.75/content**

**Implementation File:** `src/layers/03-video-generation/index.ts`

**Swappable Components:**
- Video generation provider (Fal.ai ↔ Kling ↔ Runway)
- Model parameters (resolution, duration)
- Retry/polling logic

---

### Layer 4: Post-Processing
**Purpose:** Combine 3 videos into final 15-second output

**Input:** `VideoGenerationOutput` from Layer 3

**Processing:**
- Load 3 videos from local storage
- Concatenate using local FFmpeg
- Optional: Add intro/outro, watermark, color grading
- Normalize audio levels
- Save final video to local storage

**Output Schema:**
```typescript
interface CompositionOutput {
  contentId: string;
  finalVideo: {
    storagePath: string;          // Local file path
    duration: number;             // ~15 seconds
    resolution: '720p';
    aspectRatio: '9:16';
    fileSize: number;             // bytes
    processedAt: string;
    cost: number;                 // USD (0 for local FFmpeg)
  };
}
```

**Processing Options:**
- **Option A (Default):** Local FFmpeg via Node.js child_process - **$0 cost**
- **Option B (Future):** Fal.ai FFmpeg API (~$0.10-0.20) - if need cloud processing
- **Option C (Overkill):** AWS MediaConvert - enterprise-scale only

**Cost:** **$0** (using local FFmpeg)

**Implementation File:** `src/layers/04-composition/index.ts`

**Swappable Components:**
- Composition method (local FFmpeg ↔ cloud service)
- Enhancement filters
- Branding elements

---

### Layer 5: Review & Approval
**Purpose:** Human validation gate before publishing

**Input:** `CompositionOutput` from Layer 4

**Processing:**
- Send notification with video preview
- Wait for human approval/rejection
- Store review decision

**Implementation Options:**

**Option A (MVP):** Webhook to messaging platform
- Send video + metadata to Slack/Discord
- Use buttons for Approve/Reject
- Webhook callback updates database

**Option B (Future):** Custom web dashboard
- Queue interface with video player
- Inline caption editing
- Batch approval for multiple videos

**Output Schema:**
```typescript
interface ReviewOutput {
  contentId: string;
  decision: 'approved' | 'rejected' | 'edited';
  reviewedAt: string;
  reviewedBy: string;
  notes?: string;
  editedCaption?: string;        // If human edited
}
```

**Implementation File:** `src/layers/05-review/index.ts`

**Swappable Components:**
- Notification channel (Slack ↔ Discord ↔ custom dashboard)
- Approval workflow (single reviewer ↔ multi-step)
- Editing capabilities

---

### Layer 6: Distribution
**Purpose:** Upload to social media platforms

**Input:** `ReviewOutput` (approved) + `CompositionOutput`

**Processing:**
- For each platform (Instagram, TikTok, YouTube Shorts):
  - Format metadata per platform requirements
  - Upload video via platform API
  - Store post URLs and IDs
  - Log initial metrics

**Output Schema:**
```typescript
interface DistributionOutput {
  contentId: string;
  posts: PlatformPost[];
}

interface PlatformPost {
  platform: 'instagram' | 'tiktok' | 'youtube';
  postId: string;                // Platform-specific ID
  postUrl: string;
  postedAt: string;
  status: 'posted' | 'failed';
  error?: string;
}
```

**Platform APIs:**
| Platform | API | Requirements |
|----------|-----|--------------|
| Instagram | Meta Graph API | Business account, access token |
| TikTok | Content Posting API | Developer account, approval |
| YouTube Shorts | YouTube Data API v3 | OAuth 2.0, project setup |

**Implementation File:** `src/layers/06-distribution/index.ts`

**Swappable Components:**
- Platform connectors (add/remove platforms)
- Upload strategies (sequential ↔ parallel)
- Retry logic
- Future: Use Zapier/Make.com as fallback

---

## Data Storage

### File Storage Structure (Local Filesystem)

**Default Location:** `./content` (relative to project root)

```
content/
  {content-id}/
    ├── metadata.json           # Full content metadata
    ├── idea.json               # Layer 1 output
    ├── prompts.json            # Layer 2 output
    ├── raw/
    │   ├── video_1.mp4         # Layer 3 outputs
    │   ├── video_2.mp4
    │   └── video_3.mp4
    ├── final_video.mp4         # Layer 4 output
    └── analytics.json          # Engagement metrics (updated daily)
```

**Storage Requirements:**
- Per video: ~20-30 MB (raw videos + final)
- Per month (1 video/day): ~600-900 MB
- Per year: ~7-11 GB
- Recommended: 50GB free disk space

**Backup Strategy:**
```bash
# Daily backup to external drive (recommended)
0 2 * * * rsync -av /path/to/content /mnt/backup/social-media/

# Or cloud sync (best of both worlds)
0 3 * * * rclone sync /path/to/content remote:backup/
```

### Database Schema (PostgreSQL)

```sql
-- Core content tracking
CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Layer 1: Idea
  idea TEXT NOT NULL,
  caption TEXT NOT NULL,
  cultural_context TEXT,
  environment TEXT,
  sound_concept TEXT,

  -- Processing status
  status VARCHAR(50) NOT NULL DEFAULT 'generating',
    -- Values: 'generating', 'review_pending', 'approved', 'rejected', 'posted'

  -- Costs
  idea_cost DECIMAL(10,4),
  prompt_cost DECIMAL(10,4),
  video_cost DECIMAL(10,4),
  composition_cost DECIMAL(10,4),
  total_cost DECIMAL(10,4),

  -- Review
  reviewed_at TIMESTAMPTZ,
  reviewed_by VARCHAR(255),
  review_notes TEXT,
  edited_caption TEXT,

  -- Storage references
  storage_path TEXT,            -- Local file path or cloud URL
  final_video_path TEXT,        -- Path to final video file

  -- Timestamps
  completed_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,

  -- Indexes
  CONSTRAINT content_status_check CHECK (status IN (
    'generating', 'review_pending', 'approved', 'rejected', 'posted', 'failed'
  ))
);

-- Platform-specific posts
CREATE TABLE platform_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,

  platform VARCHAR(50) NOT NULL,
    -- Values: 'instagram', 'tiktok', 'youtube'

  post_id TEXT NOT NULL,        -- Platform-specific post ID
  post_url TEXT,

  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL DEFAULT 'posted',
  error_message TEXT,

  -- Engagement metrics (updated via cron)
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ,

  CONSTRAINT platform_posts_platform_check CHECK (platform IN (
    'instagram', 'tiktok', 'youtube'
  ))
);

-- Processing logs
CREATE TABLE processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,

  layer VARCHAR(50) NOT NULL,
    -- Values: 'idea', 'prompt', 'video', 'composition', 'review', 'distribution'

  status VARCHAR(50) NOT NULL,
    -- Values: 'started', 'completed', 'failed'

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  error_message TEXT,
  metadata JSONB,               -- Layer-specific output data

  cost DECIMAL(10,4)
);

-- System configuration
CREATE TABLE config (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_created_at ON content(created_at DESC);
CREATE INDEX idx_platform_posts_content_id ON platform_posts(content_id);
CREATE INDEX idx_platform_posts_platform ON platform_posts(platform);
CREATE INDEX idx_processing_logs_content_id ON processing_logs(content_id);
CREATE INDEX idx_processing_logs_layer ON processing_logs(layer);
```

---

## Project Structure

```
social-media-pipeline/
├── content/                          # Local video storage
│   └── {content-id}/
│       ├── metadata.json
│       ├── raw/
│       │   ├── video_1.mp4
│       │   ├── video_2.mp4
│       │   └── video_3.mp4
│       └── final_video.mp4
├── logs/                             # Application logs
│   ├── app.log
│   └── error.log
├── src/
│   ├── layers/
│   │   ├── 01-idea-generation/
│   │   │   ├── index.ts              # Main layer logic
│   │   │   ├── prompts.ts            # Prompt templates
│   │   │   ├── schema.ts             # Zod validation
│   │   │   └── providers/
│   │   │       ├── anthropic.ts      # Claude implementation
│   │   │       ├── openai.ts         # GPT implementation
│   │   │       └── index.ts          # Provider factory
│   │   ├── 02-prompt-engineering/
│   │   │   ├── index.ts
│   │   │   ├── templates.ts
│   │   │   └── schema.ts
│   │   ├── 03-video-generation/
│   │   │   ├── index.ts
│   │   │   ├── schema.ts
│   │   │   └── providers/
│   │   │       ├── fal.ts            # Fal.ai implementation
│   │   │       ├── kling.ts          # Future: Kling
│   │   │       └── index.ts
│   │   ├── 04-composition/
│   │   │   ├── index.ts
│   │   │   ├── ffmpeg-local.ts       # Local FFmpeg
│   │   │   ├── ffmpeg-api.ts         # Fal.ai FFmpeg
│   │   │   └── schema.ts
│   │   ├── 05-review/
│   │   │   ├── index.ts
│   │   │   ├── slack.ts              # Slack integration
│   │   │   ├── discord.ts            # Discord integration
│   │   │   └── schema.ts
│   │   └── 06-distribution/
│   │       ├── index.ts
│   │       ├── schema.ts
│   │       └── platforms/
│   │           ├── instagram.ts
│   │           ├── tiktok.ts
│   │           ├── youtube.ts
│   │           └── index.ts
│   ├── core/
│   │   ├── orchestrator.ts           # Main pipeline coordinator
│   │   ├── database.ts               # PostgreSQL client
│   │   ├── storage.ts                # Local filesystem client (swappable to cloud)
│   │   ├── logger.ts                 # Winston logger
│   │   └── types.ts                  # Shared TypeScript types
│   ├── utils/
│   │   ├── retry.ts                  # Retry logic
│   │   ├── validation.ts             # Zod helpers
│   │   └── cost-tracking.ts          # Cost calculation
│   ├── config/
│   │   ├── default.ts                # Default configuration
│   │   └── index.ts                  # Config loader
│   └── index.ts                      # Entry point
├── scripts/
│   ├── setup-db.ts                   # Database initialization
│   ├── migrate.ts                    # Database migrations
│   └── test-layer.ts                 # Test individual layers
├── specs/
│   ├── architecture.md               # This file
│   └── api-reference.md              # Future: API docs
├── tests/
│   ├── layers/
│   │   ├── idea-generation.test.ts
│   │   └── ...
│   └── integration/
│       └── full-pipeline.test.ts
├── .env.example                      # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

**Important `.gitignore` entries:**
```
# Local data and logs
content/
logs/
*.log

# Environment and secrets
.env
.env.local

# Dependencies and build
node_modules/
dist/
build/

# Database
*.db
*.sqlite

# OS files
.DS_Store
Thumbs.db
```

---

## Core Orchestrator Logic

**File:** `src/core/orchestrator.ts`

```typescript
import { IdeaGenerationLayer } from './layers/01-idea-generation';
import { PromptEngineeringLayer } from './layers/02-prompt-engineering';
import { VideoGenerationLayer } from './layers/03-video-generation';
import { CompositionLayer } from './layers/04-composition';
import { ReviewLayer } from './layers/05-review';
import { DistributionLayer } from './layers/06-distribution';
import { Database } from './core/database';
import { Logger } from './core/logger';

export class PipelineOrchestrator {
  private db: Database;
  private logger: Logger;

  async runPipeline(): Promise<void> {
    const contentId = generateUUID();
    this.logger.info('Starting pipeline', { contentId });

    try {
      // Layer 1: Idea Generation
      const idea = await this.runLayer1(contentId);
      await this.db.updateContent(contentId, { status: 'idea_generated' });

      // Layer 2: Prompt Engineering
      const prompts = await this.runLayer2(contentId, idea);
      await this.db.updateContent(contentId, { status: 'prompts_generated' });

      // Layer 3: Video Generation
      const videos = await this.runLayer3(contentId, prompts);
      await this.db.updateContent(contentId, { status: 'videos_generated' });

      // Layer 4: Composition
      const finalVideo = await this.runLayer4(contentId, videos);
      await this.db.updateContent(contentId, {
        status: 'review_pending',
        final_video_path: finalVideo.storagePath
      });

      // Layer 5: Review (waits for human)
      const review = await this.runLayer5(contentId, finalVideo);

      if (review.decision !== 'approved') {
        this.logger.info('Content rejected', { contentId, reason: review.notes });
        return;
      }

      // Layer 6: Distribution
      const posts = await this.runLayer6(contentId, finalVideo, review);
      await this.db.updateContent(contentId, {
        status: 'posted',
        posted_at: new Date()
      });

      this.logger.info('Pipeline completed', { contentId, posts });

    } catch (error) {
      this.logger.error('Pipeline failed', { contentId, error });
      await this.db.updateContent(contentId, { status: 'failed' });
      throw error;
    }
  }

  private async runLayer1(contentId: string) { /* ... */ }
  private async runLayer2(contentId: string, idea: any) { /* ... */ }
  // ... other layer methods
}
```

**Key Features:**
- Sequential execution with clear error handling
- Database status updates after each layer
- Logging at each step
- Cost tracking per layer
- Easy to add pre/post-layer hooks

---

## Configuration

**File:** `.env.example`

```bash
# Database (Local PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/social_media

# Storage (Local filesystem by default)
STORAGE_TYPE=local                    # 'local' or 'cloud'
STORAGE_PATH=./content                # Local storage directory
# STORAGE_ENDPOINT=https://xxx.r2.cloudflarestorage.com  # Only if using cloud
# STORAGE_ACCESS_KEY_ID=xxx           # Only if using cloud
# STORAGE_SECRET_ACCESS_KEY=xxx       # Only if using cloud
# STORAGE_BUCKET=social-media-content # Only if using cloud

# AI Providers
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
FAL_API_KEY=xxx

# Review System
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
SLACK_APPROVAL_TOKEN=xxx  # For button callbacks

# Social Media APIs
INSTAGRAM_ACCESS_TOKEN=xxx
INSTAGRAM_BUSINESS_ACCOUNT_ID=xxx
TIKTOK_ACCESS_TOKEN=xxx
YOUTUBE_CLIENT_ID=xxx
YOUTUBE_CLIENT_SECRET=xxx
YOUTUBE_REFRESH_TOKEN=xxx

# Application
NODE_ENV=production
LOG_LEVEL=info
CRON_SCHEDULE=0 9 * * *  # 9:00 AM daily

# Feature Flags (for gradual rollout)
ENABLE_DISTRIBUTION=false  # Start with manual upload
ENABLE_AUTO_APPROVAL=false # Always require human review
```

**File:** `src/config/default.ts`

```typescript
export const defaultConfig = {
  content: {
    videoDuration: 5,          // seconds per segment
    videoCount: 3,             // segments per content
    resolution: '720p',
    aspectRatio: '9:16',
  },

  storage: {
    type: 'local',             // 'local' | 'cloud'
    path: './content',         // Local storage directory
  },

  layers: {
    ideaGeneration: {
      provider: 'anthropic',   // 'anthropic' | 'openai'
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.8,
    },

    promptEngineering: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
    },

    videoGeneration: {
      provider: 'fal',
      model: 'wan-2.5',
      enableAudio: true,
    },

    composition: {
      method: 'local',         // 'local' | 'fal-api'
      ffmpegPath: 'ffmpeg',    // System FFmpeg or custom path
    },

    review: {
      channel: 'slack',        // 'slack' | 'discord' | 'dashboard'
      timeout: 86400,          // 24 hours in seconds
    },
  },

  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
  },
};
```

---

## Error Handling & Resilience

### Retry Strategy
- All API calls wrapped in retry logic
- Exponential backoff: 1s, 2s, 4s
- Max 3 attempts per call
- Different strategies per layer:
  - **LLM calls:** Retry on rate limits, fail on bad requests
  - **Video generation:** Retry on timeouts, poll for completion
  - **File uploads:** Retry on network errors

### Failure Recovery
- Each layer logs to `processing_logs` table
- On pipeline failure, can restart from last successful layer
- Content status tracks progress: `generating` → `review_pending` → `posted`

### Cost Protection
- Track cumulative cost per content piece
- Abort if cost exceeds threshold (configurable, default $2)
- Daily spending limit check before pipeline runs

---

## Deployment

### Option 1: Local Machine (Default - $0/month)

**Best for:** Testing, 1 video/day, full control

**Requirements:**
- Node.js 20+
- PostgreSQL 14+ (local installation)
- FFmpeg (installed globally)
- Always-on computer or home server

**Setup:**
```bash
# 1. Clone repository
git clone <repo-url>
cd social-media-pipeline

# 2. Install dependencies
npm install

# 3. Install PostgreSQL locally
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql
# Windows: Download from postgresql.org

# 4. Setup database
npm run setup-db

# 5. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 6. Install FFmpeg
# macOS: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg
# Windows: Download from ffmpeg.org

# 7. Build and run
npm run build
npm start

# 8. Setup daily cron job
crontab -e
# Add: 0 9 * * * cd /path/to/social-media-pipeline && npm run pipeline
```

**Pros:**
- ✅ Zero infrastructure costs
- ✅ Full control and privacy
- ✅ Fast - no network latency
- ✅ Easy debugging

**Cons:**
- ⚠️ Requires always-on machine
- ⚠️ Manual backups needed
- ⚠️ Limited to one machine

---

### Option 2: VPS Deployment (~$5-10/month)

**Best for:** 24/7 uptime, remote access, multiple accounts

**Recommended Providers:**
- **Hetzner Cloud:** $5/month (2 vCPU, 4GB RAM)
- **DigitalOcean Droplet:** $6/month
- **Vultr:** $5/month

**Setup:** Same as local, but on remote server

---

### Option 3: Managed Platform (~$10-20/month)

**Best for:** No DevOps experience, quick setup

**Option A: Railway.app**
- Built-in PostgreSQL
- Automatic deployments from Git
- Built-in cron jobs
- Cost: ~$10-20/month

**Option B: Render.com**
- Similar to Railway
- Free tier available (limited)
- Cost: ~$7-15/month

---

### Future: Serverless Deployment

**When to consider:** 10+ videos/day, need auto-scaling

- Each layer as separate function (AWS Lambda/Cloudflare Workers)
- Orchestration via Step Functions or Temporal
- Scales to 100s of videos/day automatically
- Only pay for execution time
- **Note:** Requires cloud storage (can't use local files)

---

## Monitoring & Observability

### Logs
- **Winston logger** with structured JSON logs
- Log levels: error, warn, info, debug
- Outputs:
  - Console (development)
  - File rotation (production)
  - Future: External service (Datadog, Sentry)

### Metrics to Track
- Pipeline success/failure rate
- Cost per content piece
- Processing time per layer
- Human approval rate
- Platform upload success rate
- Engagement metrics (views, likes, shares)

### Alerts
- Pipeline failures → Slack notification
- Daily spending exceeds budget → Email alert
- Low approval rate → Weekly report

---

## Cost Analysis

### Per-Video Cost Breakdown

| Component | Provider | Cost |
|-----------|----------|------|
| Idea Generation | Claude/GPT-4 | $0.01 |
| Prompt Engineering | GPT-4 | $0.02 |
| Video Generation (3×5sec) | Fal.ai WAN 2.5 | $0.75 |
| Composition | Local FFmpeg | $0.00 |
| Storage | Local filesystem | $0.00 |
| Database | Local PostgreSQL | $0.00 |
| Review | Slack (free tier) | $0.00 |
| Distribution | Platform APIs | $0.00 |
| **Total per video** | | **$0.78** |

### Monthly Cost Projection

**Scenario 1: Local Deployment (1 video/day × 30 days)**
- API costs (AI): $23.40
- Infrastructure: **$0.00** (running on local machine)
- Storage: **$0.00** (local disk - ~900MB/month)
- Database: **$0.00** (local PostgreSQL)
- **Total: $23.40/month** ✨

**Scenario 2: VPS Deployment (1 video/day × 30 days)**
- API costs: $23.40
- VPS hosting: $5-10 (Hetzner/DigitalOcean)
- Storage: $0 (included in VPS disk)
- Database: $0 (included in VPS)
- **Total: ~$28-33/month**

**Scenario 3: Managed Platform (1 video/day × 30 days)**
- API costs: $23.40
- Railway/Render: $10-20
- Storage: $0 (local to platform)
- Database: $0 (included)
- **Total: ~$33-43/month**

**Scaling: 10 videos/day × 30 days (Local)**
- API costs: $234
- Infrastructure: **$0** (or upgrade to VPS for ~$10-15)
- **Total: $234-249/month**

---

## Development Workflow

### Phase 1: MVP (Weeks 1-2)
**Goal:** Working end-to-end pipeline with manual steps

✅ **Sprint 1:**
- Setup project structure
- Implement Layers 1-2 (idea + prompt generation)
- Database schema + migrations
- Local testing framework

✅ **Sprint 2:**
- Implement Layer 3 (video generation)
- Implement Layer 4 (composition with local FFmpeg)
- Local storage implementation
- Manual review process (Slack webhook)

✅ **Sprint 3:**
- Implement Layer 6 (distribution)
- Setup platform API credentials
- Manual upload initially, then automate one platform
- Basic logging and error handling

**Deliverable:** Can generate 1 video/day with manual intervention

---

### Phase 2: Automation (Weeks 3-4)
**Goal:** Fully automated daily pipeline

✅ **Sprint 4:**
- Implement orchestrator with retry logic
- Setup cron job for daily execution
- Automated Slack approval workflow
- Cost tracking and limits

✅ **Sprint 5:**
- Automate all 3 platform uploads
- Analytics collection (engagement metrics)
- Dashboard for monitoring (optional)
- Documentation

**Deliverable:** Runs daily without intervention, posts to all platforms

---

### Phase 3: Scaling (Month 2+)
**Goal:** Support multiple accounts, content types

- Multi-account support (separate configs per account)
- A/B testing framework (try different prompts)
- Content calendar (schedule posts in advance)
- Advanced analytics (which ideas perform best)
- Custom review dashboard (web UI)
- Additional content types (educational, tutorials, etc.)

---

## Security Considerations

### API Keys
- Never commit `.env` to Git
- Use environment variables for all secrets
- Rotate keys quarterly
- Use least-privilege access (read-only where possible)

### Social Media Tokens
- Store refresh tokens, not access tokens
- Implement token refresh logic
- Handle token expiration gracefully

### Content Safety
- Human review gate prevents posting inappropriate content
- Log all generated content for audit trail
- Implement content filters for brand safety

### Data Privacy
- No PII collected or stored
- Platform APIs handle user data (not us)
- GDPR-compliant (no user tracking)

---

## Testing Strategy

### Unit Tests
- Each layer has isolated tests
- Mock external API calls
- Test validation schemas
- Test retry logic

### Integration Tests
- Test layer-to-layer data flow
- Test database operations
- Test file storage operations

### End-to-End Tests
- Run full pipeline with test API keys
- Use sandbox environments for platforms
- Verify final video output

### Manual Testing
- Weekly review of generated content quality
- Test platform uploads on staging accounts
- Validate engagement metrics accuracy

---

## Extension Points

### Adding New Content Types
1. Create new topic template in `src/config/topics/`
2. Adjust Layer 1 prompts
3. Optionally create content-type-specific Layer 2 templates
4. No changes needed to Layers 3-6

### Adding New Platforms
1. Create new file in `src/layers/06-distribution/platforms/`
2. Implement platform API client
3. Add platform credentials to `.env`
4. Update distribution layer to include new platform

### Swapping AI Models
1. Create new provider in layer's `providers/` directory
2. Implement same interface as existing provider
3. Update config to switch provider
4. No changes to orchestrator needed

### Alternative Video Models
1. Create new provider in `src/layers/03-video-generation/providers/`
2. Implement same output schema
3. Update config
4. May need to adjust Layer 4 if video format changes

---

## Success Metrics

### Technical Metrics
- Pipeline success rate: >95%
- Average processing time: <10 minutes
- API error rate: <5%
- Infrastructure costs: $0/month (local deployment)

### Content Metrics
- Human approval rate: >80%
- Platform upload success: >95%
- Average views: Track baseline, then optimize
- Engagement rate: Track per platform

### Business Metrics
- Cost per video: <$1
- Time saved vs. manual creation: >90%
- Ability to scale to 10 videos/day without code changes

---

## Next Steps

### Immediate (Week 1)
1. ✅ Finalize architecture (this document)
2. Setup development environment (Node.js, PostgreSQL, FFmpeg)
3. Initialize Git repository
4. Setup local PostgreSQL database
5. Implement Layer 1 (Idea Generation)

### Short-term (Weeks 2-4)
6. Implement remaining layers
7. Setup local storage system
8. Create orchestrator
9. Setup Slack review workflow
10. Test end-to-end pipeline locally

### Medium-term (Month 2)
11. Automate all platform uploads
12. Add analytics collection
13. Implement cost tracking dashboard
14. Document API for future extensions

### Long-term (Month 3+)
15. Scale to multiple accounts
16. Add new content types
17. Build custom review dashboard
18. Implement A/B testing framework

---

## Appendix

### Useful Resources
- [Fal.ai WAN 2.5 Docs](https://fal.ai/models/fal-ai/wan-25-preview)
- [Meta Graph API - Instagram](https://developers.facebook.com/docs/instagram-api)
- [TikTok Content Posting API](https://developers.tiktok.com/doc/content-posting-api-get-started)
- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

### Decision Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-10-25 | Use Node.js/TypeScript | Async-first, rich ecosystem, type safety |
| 2025-10-25 | Choose Fal.ai over other providers | Best price ($0.05/sec), native audio |
| 2025-10-25 | Use PostgreSQL over NoSQL | Relational data, better for analytics |
| 2025-10-25 | **Local-first architecture** | Zero infrastructure costs, sufficient for 1 video/day |
| 2025-10-25 | Local filesystem storage (not cloud) | Free, fast, easy backups, <20GB/year at scale |
| 2025-10-25 | Local PostgreSQL (not managed) | No latency, works offline, zero cost |
| 2025-10-25 | Local FFmpeg (not API) | Zero cost, full control, faster |
| 2025-10-25 | Slack review over custom dashboard | Faster MVP, familiar interface |

### Open Questions
- [ ] Should we add intro/outro branding? (Layer 4 decision)
- [ ] Which Instagram account type? (Business vs Creator)
- [ ] Should analytics be pulled daily or weekly?
- [ ] Do we need A/B testing from day 1?

---

**Document Status:** ✅ Ready for Implementation
**Next Review:** After MVP completion
