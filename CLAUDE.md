# Social Media Content Pipeline - Claude Context

**Project Type:** Automated content generation and distribution system
**Status:** MVP Complete - Production Ready ✅
**Architecture Version:** 1.0
**Primary Platform:** Instagram (fully operational)

---

## Implementation Notes

**Project Origin:** Built from scratch using `specs/architecture.md` as the foundation.

**Current State:**
- ✅ **Full Pipeline Operational:** All 6 layers working end-to-end
- ✅ **Instagram Integration:** Fully functional with auto-refreshing 60-day tokens
- ✅ **Cloudflare R2 Storage:** Final videos hosted on R2 for reliable public URLs
- ✅ **Telegram Review System:** Button-based approval via Telegram bot
- ✅ **Local-first Architecture:** PostgreSQL database + local filesystem storage
- ⏳ **TikTok & YouTube:** Secondary platforms (to be implemented after Instagram proven)

**Completed Implementations:**
- **Video Generation (Layer 3):** Upgraded to WAN 2.5 with native audio ✅
  - Automatic audio generation synchronized with video content
  - High-quality ASMR audio (pottery sounds, workshop ambience, nature)
  - $1.50 per video (3× 5-second clips @ 720p with audio)
- **Review System (Layer 5):** Telegram-based approval with inline buttons ✅
  - Telegram poller service runs continuously to capture button presses
  - Updates database in real-time for pipeline continuation
  - Previous Slack implementation deprecated
- **Video Hosting (Layer 4):** Cloudflare R2 for public video URLs ✅
  - Direct public URLs without redirects (works perfectly with Instagram API)
  - Zero egress fees, 10GB free storage
  - Automatic upload in Layer 4 after video composition

**Usage Patterns:**
- All development tasks (implement/debug/optimize)
- Iterative improvements and feature additions
- Troubleshooting and code review

---

## Project Overview

This is an automated social media content pipeline that generates daily short-form ASMR videos (15 seconds, 720p, 9:16 vertical) and distributes them to Instagram, TikTok, and YouTube Shorts.

**Core Principles:**
1. **Working system first** - MVP approach, iterate later
2. **Modularity** - Each layer is independently swappable
3. **Local-first** - Run on local machine, cloud only when needed
4. **Cost-effective** - ~$1.53/video (API costs only, zero infrastructure)

**Target Cost:** $45-50/month for 1 video/day

---

## Architecture at a Glance

```
Scheduler (Cron) → Orchestrator → 6 Layers → Social Platforms
```

### The 6 Layers:
1. **Idea Generation** - LLM generates content concepts (Claude/GPT-4)
2. **Prompt Engineering** - Converts ideas to video prompts
3. **Video Generation** - Creates 3x 5-second clips with native audio (Fal.ai WAN 2.5)
4. **Composition** - Merges clips into 15-second final video (FFmpeg) + uploads to R2
5. **Review & Approval** - Human validation via Telegram bot with inline buttons
6. **Distribution** - Posts to Instagram (✅ operational), TikTok, YouTube Shorts

**Sequential Processing:** Each layer depends on the previous layer's output. If a layer fails, the pipeline stops.

---

## Technology Stack

### Runtime & Language
- **Node.js 20+** with **TypeScript** (async-first, rich ecosystem)
- **Package Manager:** npm

### Core Dependencies
```json
{
  "@anthropic-ai/sdk": "LLM for idea generation",
  "openai": "GPT-4 for prompt engineering",
  "fal-client": "Fal.ai video generation",
  "axios": "HTTP requests",
  "zod": "Runtime type validation",
  "pg": "PostgreSQL client",
  "winston": "Logging",
  "dotenv": "Environment config",
  "node-cron": "Task scheduling",
  "fluent-ffmpeg": "Video composition"
}
```

### Infrastructure (Local-First)
- **Storage:**
  - **Local filesystem** (`./content` directory) - All intermediate files (raw videos, metadata, prompts)
  - **Cloudflare R2** - Final videos only (public URLs for social media platform uploads)
- **Database:** Local PostgreSQL
- **Video Processing:** Local FFmpeg binary
- **Logging:** Local files with Winston
- **Hosting:** Local machine or always-on home server
- **Review Service:** Telegram poller (runs as background service)

### Cloud Services (Required)
- **Anthropic/OpenAI:** LLM APIs for content generation
- **Fal.ai:** GPU-powered video generation (WAN 2.5 model)
- **Meta Graph API:** Instagram posting (✅ FULLY OPERATIONAL with auto-refresh tokens)
- **Cloudflare R2:** Object storage for final video hosting (S3-compatible, zero egress fees)
- **Telegram Bot API:** Review system with inline button approvals
- **TikTok Content API:** TikTok posting (to be implemented)
- **YouTube Data API v3:** YouTube Shorts posting (to be implemented)

---

## Project Structure

```
social-media-pipeline/
├── content/                   # Local video storage (git-ignored)
│   └── {content-id}/
│       ├── metadata.json
│       ├── idea.json
│       ├── prompts.json
│       ├── raw/
│       │   ├── video_1.mp4
│       │   ├── video_2.mp4
│       │   └── video_3.mp4
│       ├── final_video.mp4
│       └── analytics.json
├── logs/                      # Application logs (git-ignored)
├── src/
│   ├── layers/               # 6 processing layers
│   │   ├── 01-idea-generation/
│   │   │   ├── index.ts
│   │   │   ├── prompts.ts
│   │   │   ├── schema.ts
│   │   │   └── providers/    # Swappable LLM providers
│   │   ├── 02-prompt-engineering/
│   │   ├── 03-video-generation/
│   │   ├── 04-composition/
│   │   ├── 05-review/
│   │   └── 06-distribution/
│   │       └── platforms/    # Instagram, TikTok, YouTube
│   ├── core/
│   │   ├── orchestrator.ts   # Main pipeline coordinator
│   │   ├── database.ts       # PostgreSQL client
│   │   ├── storage.ts        # File/cloud storage abstraction
│   │   ├── logger.ts         # Winston logger
│   │   └── types.ts          # Shared TypeScript types
│   ├── utils/
│   │   ├── retry.ts
│   │   ├── validation.ts
│   │   └── cost-tracking.ts
│   ├── config/
│   │   ├── default.ts        # Default configuration
│   │   └── index.ts
│   └── index.ts              # Entry point
├── scripts/
│   ├── setup-db.ts           # Database initialization
│   ├── migrate.ts            # Database migrations
│   └── test-layer.ts         # Test individual layers
├── specs/
│   ├── architecture.md       # Full architecture spec
│   └── api-reference.md      # (Future) API documentation
├── tests/
│   ├── layers/
│   └── integration/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── claude.md                 # This file
└── README.md
```

---

## Key File Locations

When working on this project, here are the most important files:

### Core Logic
- **Orchestrator:** `src/core/orchestrator.ts` - Coordinates all layers sequentially
- **Database Client:** `src/core/database.ts` - PostgreSQL operations
- **Storage Abstraction:** `src/core/storage.ts` - Local/cloud storage interface
- **Logger:** `src/core/logger.ts` - Winston logging setup

### Layer Implementations
- **Layer 1:** `src/layers/01-idea-generation/index.ts`
- **Layer 2:** `src/layers/02-prompt-engineering/index.ts`
- **Layer 3:** `src/layers/03-video-generation/index.ts`
- **Layer 4:** `src/layers/04-composition/index.ts`
- **Layer 5:** `src/layers/05-review/index.ts`
- **Layer 6:** `src/layers/06-distribution/index.ts`

### Configuration
- **Environment:** `.env` - API keys, database URL, feature flags
- **Defaults:** `src/config/default.ts` - Default settings for all layers
- **Database Schema:** `scripts/setup-db.ts` - PostgreSQL table definitions

---

## Database Schema Overview

### Main Tables
```sql
content              -- Core content tracking (idea, status, costs, paths)
platform_posts       -- Platform-specific posts (Instagram, TikTok, YouTube)
processing_logs      -- Layer execution logs (for debugging/recovery)
config               -- System configuration (key-value store)
```

### Content Lifecycle Statuses
```
generating → review_pending → approved/rejected → posted/failed
```

---

## Data Flow

### Layer Outputs (Sequential)
```typescript
Layer 1: IdeaOutput
  ├─ id: string (UUID)
  ├─ idea: string
  ├─ caption: string
  ├─ culturalContext: string
  └─ environment: string

Layer 2: PromptOutput
  ├─ contentId: string (references Layer 1)
  └─ prompts: VideoPrompt[] (3 prompts)

Layer 3: VideoGenerationOutput
  ├─ contentId: string
  └─ videos: GeneratedVideo[] (3 video files)

Layer 4: CompositionOutput
  ├─ contentId: string
  └─ finalVideo: { storagePath, duration, fileSize }

Layer 5: ReviewOutput
  ├─ contentId: string
  ├─ decision: 'approved' | 'rejected' | 'edited'
  └─ editedCaption?: string

Layer 6: DistributionOutput
  ├─ contentId: string
  └─ posts: PlatformPost[] (Instagram, TikTok, YouTube)
```

Each layer:
1. Receives input from previous layer
2. Validates input using Zod schemas
3. Processes data (API calls, file operations, etc.)
4. Logs progress to `processing_logs` table
5. Updates `content` table status
6. Returns typed output for next layer

---

## Design Patterns & Conventions

### 1. Layer Structure
Every layer follows this pattern:
```typescript
// src/layers/XX-layer-name/index.ts
export class LayerName {
  async execute(input: InputSchema): Promise<OutputSchema> {
    // 1. Validate input
    const validated = inputSchema.parse(input);

    // 2. Log start
    await this.logger.info('Starting layer', { contentId: input.contentId });

    // 3. Process with retry logic
    const result = await this.withRetry(() => this.process(validated));

    // 4. Save to database
    await this.db.logProcessing(/* ... */);

    // 5. Return typed output
    return outputSchema.parse(result);
  }
}
```

### 2. Swappable Providers
Each layer that uses external APIs has a `providers/` directory:
```typescript
// src/layers/01-idea-generation/providers/index.ts
export function createIdeaProvider(config): IdeaProvider {
  switch (config.provider) {
    case 'anthropic': return new AnthropicProvider(config);
    case 'openai': return new OpenAIProvider(config);
    default: throw new Error(`Unknown provider: ${config.provider}`);
  }
}
```

### 3. Error Handling
```typescript
- All API calls wrapped in retry logic (3 attempts, exponential backoff)
- Layer failures logged to processing_logs table
- Content status updated to 'failed' on unrecoverable errors
- Cost protection: abort if total cost exceeds threshold ($2 default)
```

### 4. Type Safety
```typescript
- Zod schemas for all layer inputs/outputs
- Runtime validation at layer boundaries
- TypeScript strict mode enabled
- Shared types in src/core/types.ts
```

---

## Environment Variables

### Required for MVP
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/social_media

# AI Providers (Layer 1 & 2)
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# Video Generation (Layer 3)
FAL_API_KEY=xxx

# Review System (Layer 5) - Telegram
TELEGRAM_BOT_TOKEN=xxx                                    # Telegram bot token from @BotFather
TELEGRAM_CHAT_ID=xxx                                      # Your Telegram chat ID (from /start command)

# Social Media APIs (Layer 6) - Instagram is FULLY OPERATIONAL
INSTAGRAM_ACCESS_TOKEN=xxx                                # Long-lived 60-day token (auto-refreshes)
INSTAGRAM_BUSINESS_ACCOUNT_ID=xxx                         # Instagram Business Account ID
FACEBOOK_APP_ID=xxx                                       # Facebook App ID (for token refresh)
FACEBOOK_APP_SECRET=xxx                                   # Facebook App Secret (for token refresh)
TIKTOK_ACCESS_TOKEN=xxx                                   # (To be implemented)
YOUTUBE_CLIENT_ID=xxx                                     # (To be implemented)
YOUTUBE_CLIENT_SECRET=xxx
YOUTUBE_REFRESH_TOKEN=xxx

# Cloudflare R2 (for final video hosting)
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com          # R2 endpoint URL
R2_ACCESS_KEY_ID=xxx                                      # R2 access key
R2_SECRET_ACCESS_KEY=xxx                                  # R2 secret key
R2_BUCKET_NAME=social-media-content                       # R2 bucket name
R2_PUBLIC_URL=https://pub-xxx.r2.dev                      # R2 public URL (r2.dev subdomain)

# Application
NODE_ENV=development
LOG_LEVEL=debug
CRON_SCHEDULE=0 9 * * *
```

### Feature Flags
```bash
ENABLE_DISTRIBUTION=true         # ✅ Distribution enabled (Instagram operational)
ENABLE_AUTO_APPROVAL=false       # Always require human review via Telegram
ENABLE_INSTAGRAM=true            # ✅ Instagram fully operational
ENABLE_TIKTOK=false              # (To be implemented)
ENABLE_YOUTUBE=false             # (To be implemented)
```

---

## Cost Breakdown (Per Video)

| Component | Provider | Cost |
|-----------|----------|------|
| Idea Generation | Claude/GPT-4 | $0.01 |
| Prompt Engineering | GPT-4 | $0.02 |
| Video Generation (3×5sec) | Fal.ai WAN 2.5 @ 720p | $1.50 |
| Composition | Local FFmpeg | $0.00 |
| **Total** | | **$1.53** |

**Monthly (30 videos):** ~$45.90 in API costs + $0 infrastructure (local) = **$45.90/month**

---

## Development Guidelines

### When Implementing Layers

1. **Start with Schema First**
   - Define input/output schemas in `schema.ts`
   - Use Zod for validation
   - Reference architecture.md for exact schema structure

2. **Implement Provider Pattern**
   - Create `providers/` directory for swappable implementations
   - Export factory function to choose provider at runtime
   - Keep provider interface consistent

3. **Add Comprehensive Logging**
   - Log start/completion of layer
   - Log API calls and responses
   - Log costs and timing
   - Use structured logging (JSON format)

4. **Test Independently**
   - Create test file in `tests/layers/`
   - Mock external APIs
   - Test validation schemas
   - Test error handling

5. **Update Orchestrator**
   - Add layer to pipeline sequence
   - Handle layer-specific errors
   - Update database status after layer completion

### When Adding New Features

- **New Content Type:** Adjust Layer 1 prompts only
- **New Platform:** Add to `src/layers/06-distribution/platforms/`
- **New AI Model:** Add to layer's `providers/` directory
- **New Storage Backend:** Update `src/core/storage.ts`

### Code Style

- Use **async/await** (not callbacks or raw Promises)
- Prefer **functional composition** over classes where appropriate
- Use **explicit return types** on all public functions
- **Error messages** should include context (contentId, layer name)
- **No console.log** - use logger instead

---

## Common Tasks

### Running the Pipeline Manually
```bash
npm run pipeline           # Run full pipeline once
npm run test-layer 1       # Test Layer 1 only
npm run test-layer 3       # Test Layer 3 only
```

### Telegram Poller Service (Required for Reviews)
```bash
# Start the Telegram poller (must be running for approvals to work)
npx tsx scripts/telegram-poller-service.ts

# Or in background
npx tsx scripts/telegram-poller-service.ts &

# Check if poller is running
curl http://localhost:3001

# Remove stale lock file (if poller crashes)
rm .telegram-poller.lock
```

### Database Operations
```bash
npm run setup-db          # Initialize database (first time)
npm run migrate           # Run migrations
psql $DATABASE_URL        # Connect to database
```

### Debugging
```bash
# View recent logs
tail -f logs/app.log

# Check content status
psql $DATABASE_URL -c "SELECT id, status, created_at FROM content ORDER BY created_at DESC LIMIT 10;"

# View processing logs for specific content
psql $DATABASE_URL -c "SELECT * FROM processing_logs WHERE content_id = 'xxx';"
```

### Local Development
```bash
npm install               # Install dependencies
npm run build             # Compile TypeScript
npm run dev               # Run with auto-reload
npm test                  # Run test suite
```

---

## Important Context for Code Assistance

### When I Ask About Errors
- Check `logs/app.log` and `logs/error.log`
- Query `processing_logs` table for layer-specific failures
- Check `content` table for status
- Verify API keys in `.env`

### When Implementing Layer X
- Reference `specs/architecture.md` for exact schema
- Follow provider pattern (see Layer 1 as example)
- Add retry logic for all external API calls
- Update orchestrator to include new layer

### When Debugging Pipeline Issues
1. Check which layer failed (look at `content.status`)
2. View `processing_logs` for error messages
3. Check layer-specific log files
4. Verify external API credentials
5. Check rate limits and API costs

### When Optimizing Costs
- Layer 3 (Video Generation) is 96% of cost ($0.75/$0.78)
- Consider reducing to 2 segments instead of 3
- Or reduce video duration (5sec → 4sec per segment)
- Layers 1-2 are negligible ($0.03 total)

---

## MVP Status: ✅ COMPLETE

### Sprint 1 - Content Generation ✅
- ✅ Setup project structure
- ✅ Initialize PostgreSQL database
- ✅ Implement Layer 1 (Idea Generation)
- ✅ Implement Layer 2 (Prompt Engineering)
- ✅ Test Layers 1-2 end-to-end

### Sprint 2 - Video Production ✅
- ✅ Implement Layer 3 (Video Generation)
- ✅ Implement Layer 4 (Composition with FFmpeg)
- ✅ Setup local storage system + R2 integration
- ✅ Test Layers 3-4 end-to-end

### Sprint 3 - Review & Distribution ✅
- ✅ Implement Layer 5 (Review - Telegram with poller)
- ✅ Implement Layer 6 (Distribution - Instagram with auto-refresh)
- ✅ Build orchestrator
- ✅ Test full pipeline end-to-end

### Completion Criteria - ALL MET ✅
✅ Can generate 1 video/day fully automated
✅ All 6 layers working end-to-end
✅ Human review gate functional via Telegram
✅ Instagram posting fully operational
✅ Token auto-refresh system working
✅ R2 storage integrated
✅ Production-ready deployment

---

## Known Limitations & Future Work

### Current Limitations
- **Single video/day** - scaling to 10+/day requires optimization
- **Manual review required** - no auto-approval (intentional for MVP)
- **Local-only** - requires always-on machine
- **No analytics collection** - manual metric tracking only

### Future Enhancements (Phase 2+)
- Multi-account support
- A/B testing framework (test different prompts)
- Content calendar (schedule posts in advance)
- Custom review dashboard (web UI)
- Advanced analytics (engagement tracking)
- Additional content types (educational, tutorials)
- Serverless deployment option

---

## API Documentation References

### AI Services
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [OpenAI API](https://platform.openai.com/docs/api-reference)
- [Fal.ai WAN 2.5](https://fal.ai/models/fal-ai/wan-25-preview)

### Social Platforms
- [Meta Graph API (Instagram)](https://developers.facebook.com/docs/instagram-api)
- [TikTok Content Posting API](https://developers.tiktok.com/doc/content-posting-api-get-started)
- [YouTube Data API v3](https://developers.google.com/youtube/v3)

### Utilities
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Zod Validation](https://zod.dev/)

---

## Quick Reference: Filesystem Storage

### Content Directory Structure
```
./content/{contentId}/
  ├── metadata.json           # Full content metadata
  ├── idea.json               # Layer 1 output
  ├── prompts.json            # Layer 2 output
  ├── raw/
  │   ├── video_1.mp4         # Layer 3 outputs (each ~5-8MB)
  │   ├── video_2.mp4
  │   └── video_3.mp4
  ├── final_video.mp4         # Layer 4 output (~10-15MB)
  └── analytics.json          # Engagement metrics (updated daily)
```

**Storage Requirements:**
- Per video: ~20-30 MB
- Per month (30 videos): ~600-900 MB
- Per year: ~7-11 GB

### Hybrid Storage Strategy: Local + Cloudflare R2

**Storage Pattern:**
```
Layer 1-3 outputs → Local filesystem only
Layer 4 output   → Local filesystem + R2 upload
Layer 6          → Uses R2 public URL for platform posting
```

**Why This Pattern?**
1. **Local Storage** (`./content`):
   - Fast access for intermediate processing
   - Privacy for work-in-progress content
   - No API rate limits
   - Zero cost

2. **Cloudflare R2** (final videos only):
   - **Direct public URLs** - no redirects (works perfectly with Instagram API)
   - **Zero egress fees** - unlimited bandwidth at no cost
   - **Reliable CDN** - platforms can access 24/7 even if local machine is off
   - **S3-compatible** - easy integration with existing tools
   - **10GB free storage** - sufficient for hundreds of videos

**Implementation Flow:**
```typescript
// Layer 4 (Composition) - After creating final video
1. Save final_video.mp4 to local ./content/{contentId}/
2. Upload final_video.mp4 to R2 bucket
3. Get public R2 URL (https://pub-xxx.r2.dev/videos/{contentId}.mp4)
4. Store R2 URL in database (content.r2_url)
5. Pass to Layer 6 for distribution

// Layer 6 (Distribution) - When posting to platforms
1. Read R2 URL from composition output
2. Instagram/TikTok/YouTube download directly from R2 URL
3. Platforms handle video ingestion from public URL
```

**Database Addition:**
```sql
-- Add to content table
ALTER TABLE content ADD COLUMN r2_url TEXT;
```

**Benefits:**
- Direct URLs without redirects (Instagram compatible)
- Zero egress fees (Google Drive would charge for downloads)
- No upload/download limits
- S3-compatible API for easy integration
- Automatic public URLs via r2.dev domain

---

## Troubleshooting Common Issues

### Pipeline Fails at Layer 3
- **Symptom:** Video generation times out or fails
- **Check:** Fal.ai API key, account balance, rate limits
- **Fix:** Verify `FAL_API_KEY` in `.env`, check Fal.ai dashboard

### Database Connection Errors
- **Symptom:** `ECONNREFUSED` or `authentication failed`
- **Check:** PostgreSQL running locally
- **Fix:** `pg_ctl start` or restart PostgreSQL service

### FFmpeg Not Found (Layer 4)
- **Symptom:** `ffmpeg: command not found`
- **Check:** FFmpeg installed globally
- **Fix:** Install FFmpeg (`brew install ffmpeg` on macOS)

### Telegram Poller Not Running
- **Symptom:** Pipeline stuck at Layer 5, button presses not detected
- **Check:** Telegram poller service running in background
- **Fix:** Start the poller service: `npx tsx scripts/telegram-poller-service.ts`
- **Common Issue:** Lock file exists from crashed poller
  - Fix: `rm .telegram-poller.lock` then restart poller

### Telegram Review Not Working
- **Symptom:** No notification in Telegram, or buttons don't work
- **Check:** Bot token valid, chat ID correct, poller service running
- **Fix:**
  1. Verify `TELEGRAM_BOT_TOKEN` in `.env`
  2. Send `/start` to bot to get your chat ID
  3. Ensure poller service is running (check `http://localhost:3001`)
  4. Check logs for "Received callback query" when pressing buttons

### R2 Upload Fails (Layer 4)
- **Symptom:** `403 Forbidden` or `Invalid credentials`
- **Check:** R2 credentials valid, bucket exists
- **Fix:**
  1. Verify R2 credentials in `.env`
  2. Check bucket name is correct
  3. Verify R2 public URL matches your r2.dev domain
  4. Test R2 connection with `scripts/test-r2.ts`

### R2 Public URL Issues
- **Symptom:** Instagram can't download from R2 URL
- **Check:** R2 public URL is accessible, bucket has public access enabled
- **Fix:**
  1. Verify R2_PUBLIC_URL in `.env` matches your r2.dev domain
  2. Ensure bucket is configured for public access
  3. Test URL directly in browser: should download the video

### Instagram Upload Fails (Layer 6 - FULLY OPERATIONAL)
- **Symptom:** `Invalid access token` or `403 Forbidden`
- **Check:** Access token expired (auto-refresh should handle this), Business Account linked correctly
- **Fix:**
  1. **Token Auto-Refresh:** System automatically refreshes tokens when < 7 days remain
  2. Verify account is Instagram Business (not Personal)
  3. Check `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` in `.env` (required for auto-refresh)
  4. Test token manually: `npx tsx scripts/test-token-manager.ts`
  5. Ensure video meets Instagram Reels specs (720p, 9:16, 15 seconds)

- **Token Info:** Long-lived tokens last 60 days, auto-refresh happens automatically

### Platform Upload Fails (TikTok/YouTube)
- **Symptom:** `Invalid access token` or `403 Forbidden`
- **Check:** Access token expired, permissions incorrect
- **Fix:** Regenerate token, verify API permissions (implement after Instagram stable)

---

## Notes for Claude

### General Principles
- **Always validate** data between layers using Zod schemas
- **Cost tracking** is critical - log all API costs to database
- **Idempotency** - pipeline should be resumable from any layer
- **Local-first** - prefer local operations over cloud when possible
- **Logging** - structured JSON logs for easy parsing and debugging
- When implementing, follow the **provider pattern** for swappable dependencies
- All external API calls should have **retry logic** (3 attempts, exponential backoff)
- Human review gate (Layer 5) is **non-optional** - never skip it
- Use **absolute paths** for file operations (resolve from project root)

### Project-Specific Context
- **Instagram Fully Operational:** Complete implementation with auto-refreshing tokens
- **R2 Storage:** Layer 4 uploads final videos to Cloudflare R2 for public URLs
- **Storage Strategy:** Local storage for all intermediate files, R2 only for final videos
- **Telegram Review System:** Fully implemented with poller service for button approvals
- **Feature Flags:** Use environment variables to enable/disable platforms individually
- **Telegram Poller:** Must be running for review approvals to work

### When Working on Layer 4 (Composition)
- After creating final_video.mp4, upload to R2
- R2 provides direct public URLs (no redirects)
- Store both local path AND R2 URL in database
- Return R2 URL in output schema for Layer 6

### When Working on Layer 6 (Distribution)
- Instagram is **fully operational** - production ready
- Use R2 public URL as video source (not local path)
- Token auto-refresh handles expiration automatically
- TikTok/YouTube to be implemented next
- Each platform should be independently toggleable via feature flags

### When Working on Layer 5 (Review)
- Telegram system fully implemented
- Poller service must be running for approvals to work
- Button presses update database in real-time
- Pipeline polls database every 5 seconds for status updates

---

## Summary: Implementation Status

### Phase 1: Core Pipeline ✅ COMPLETE
1. ✅ Layer 1-3: Content generation pipeline
2. ✅ Layer 4: Composition + **R2 upload integration**
3. ✅ Layer 5: Review system (**Telegram with poller service**)
4. ✅ Layer 6: **Instagram distribution with auto-refresh tokens**

**🎉 MVP Complete - Full end-to-end pipeline operational!**
- Total pipeline execution: ~9.8 minutes
- Total cost per video: $0.85 (within target)
- Instagram posting: Fully automated
- Human review: Via Telegram buttons

### Phase 2: Secondary Platforms (Next Steps)
5. ⏳ TikTok integration
6. ⏳ YouTube Shorts integration

### Phase 3: Production Enhancements (Future)
7. ⏳ Advanced analytics and engagement tracking
8. ⏳ Multi-account support
9. ⏳ Content calendar and scheduling
10. ⏳ A/B testing framework

### Key Accomplishments
- **Instagram:** Fully operational with auto-refreshing 60-day tokens
- **R2 Storage:** Direct public URLs, zero egress fees
- **Telegram Review:** Real-time button approvals via poller service
- **Local-first:** Fast, private, cost-effective
- **Production Ready:** Tested end-to-end successfully

---

**Last Updated:** 2025-11-22
**Architecture Version:** 1.0
**Project Status:** Production Ready - MVP Complete ✅
**First Successful Run:** 2025-11-22 (All 6 layers operational, Instagram post created)
**For Questions:** Refer to `specs/architecture.md` for detailed specifications
