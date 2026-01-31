# Social Media Content Pipeline

Automated short-form video generation and distribution pipeline for Instagram, with multi-account support and an agentic educational content system.

## Status: Production Ready

- **All 6 pipeline layers** operational end-to-end
- **Instagram** fully integrated with auto-refreshing 60-day tokens
- **Telegram** review system with inline button approvals
- **Cloudflare R2** storage for final video hosting
- **Educational content pipeline** with multi-agent architecture
- **Multi-account support** for managing multiple Instagram accounts

## Architecture

```
Scheduler (Cron) -> Orchestrator -> 6 Layers -> Instagram
```

### Pipeline Layers

1. **Idea Generation** - AI-generated content concepts (Claude/GPT-4)
2. **Prompt Engineering** - Converts ideas to video generation prompts (GPT-4)
3. **Video Generation** - Creates 3x 5-second clips with native audio (Fal.ai WAN 2.5)
4. **Composition** - Merges clips via FFmpeg, uploads final video to Cloudflare R2
5. **Review & Approval** - Human review via Telegram bot with inline buttons
6. **Distribution** - Posts to Instagram using R2 public URLs

### Educational Content Pipeline (Agentic)

A multi-agent system for generating educational content:

- **Research Agent** - Gathers topic information
- **Generator Agent** - Creates initial content scripts
- **Critic Agent** - Evaluates content against quality rubrics
- **Refiner Agent** - Iterates on feedback in a quality loop
- **Asset Agent** - Generates visual assets
- **Audio Agent** - Produces voiceover and audio
- **Composer Agent** - Assembles final video

## Technology Stack

- **Runtime:** Node.js 20+ with TypeScript
- **Database:** PostgreSQL (local)
- **Storage:** Local filesystem + Cloudflare R2 (final videos)
- **AI:** Anthropic Claude, OpenAI GPT-4, Fal.ai WAN 2.5
- **Video:** FFmpeg
- **Review:** Telegram Bot API
- **Distribution:** Meta Graph API (Instagram)
- **Validation:** Zod
- **Logging:** Winston

## Cost

- **Per video:** ~$1.53 (API costs only, zero infrastructure)
- **Monthly (30 videos):** ~$46

| Component | Cost |
|---|---|
| Idea Generation (Claude/GPT-4) | $0.01 |
| Prompt Engineering (GPT-4) | $0.02 |
| Video Generation (Fal.ai, 3x5s @ 720p) | $1.50 |
| Composition (local FFmpeg) | $0.00 |

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- FFmpeg
- API keys: Anthropic, OpenAI, Fal.ai, Telegram Bot, Meta Graph API, Cloudflare R2

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your API keys

# Setup database
createdb social_media
npm run setup-db

# Build and run
npm run build
npm start
```

### Running the Telegram Review Poller

The Telegram poller must be running for review approvals to work:

```bash
npx tsx scripts/telegram-poller-service.ts
```

## Project Structure

```
src/
  core/                 # Orchestrator, database, storage, logger, types
  layers/
    01-idea-generation/
    02-prompt-engineering/
    03-video-generation/
    04-composition/
    05-review/
    06-distribution/
      platforms/        # Instagram (+ TikTok, YouTube planned)
  agents/               # Educational content multi-agent system
    research/
    generator/
    critic/
    refiner/
    asset/
    audio/
    composer/
    pipeline/
    quality-loop/
  pipelines/            # Pipeline orchestration (educational)
  services/             # Background services
  config/               # Configuration
  utils/                # Retry, validation, cost tracking
scripts/                # DB setup, migrations, utility scripts
specs/                  # Architecture documentation
content/                # Local video storage (gitignored)
logs/                   # Application logs (gitignored)
```

## License

MIT
