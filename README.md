# Social Media Content Pipeline

Automated ASMR video generation and distribution pipeline for Instagram, TikTok, and YouTube Shorts.

## Overview

This system generates daily 15-second ASMR videos featuring traditional crafts, using AI for content ideation, video generation, and automated distribution across social media platforms.

**Status:** Foundation Complete ✅ | Layers 1-2 Implemented | Layers 3-6 In Progress

## Architecture

The pipeline consists of 6 sequential layers:

1. **Layer 1: Idea Generation** ✅ - Generate creative ASMR content ideas using Claude
2. **Layer 2: Prompt Engineering** ✅ - Create detailed video generation prompts using GPT-4
3. **Layer 3: Video Generation** 🚧 - Generate videos using Fal.ai WAN 2.5
4. **Layer 4: Composition** 🚧 - Combine video segments using FFmpeg
5. **Layer 5: Review** 🚧 - Human approval via Slack
6. **Layer 6: Distribution** 🚧 - Upload to social platforms

## Technology Stack

- **Runtime:** Node.js 20+ with TypeScript
- **Database:** PostgreSQL (local)
- **Storage:** Local filesystem
- **AI Providers:** Anthropic Claude, OpenAI GPT-4, Fal.ai
- **Video Processing:** FFmpeg
- **Logging:** Winston

## Cost Estimate

- **Per Video:** ~$0.78 (API costs only)
  - Idea Generation: $0.01
  - Prompt Engineering: $0.02
  - Video Generation: $0.75
  - Composition: $0.00 (local FFmpeg)
- **Infrastructure:** $0/month (local deployment)

## Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 14+
- FFmpeg
- API keys:
  - Anthropic API key
  - OpenAI API key
  - Fal.ai API key (when implementing Layer 3)
  - Social media platform credentials (when implementing Layer 6)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env and add your API keys
```

Required environment variables:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/social_media
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
```

### 3. Setup Database

```bash
# Create PostgreSQL database
createdb social_media

# Run schema setup
npm run setup-db
```

### 4. Build and Run

```bash
# Build TypeScript
npm run build

# Run the pipeline
npm start

# Or run in development mode with auto-reload
npm run dev
```

## Project Structure

```
social-media-pipeline/
├── src/
│   ├── core/               # Core infrastructure
│   │   ├── database.ts     # PostgreSQL client
│   │   ├── storage.ts      # File storage
│   │   ├── logger.ts       # Winston logger
│   │   ├── types.ts        # TypeScript types
│   │   └── orchestrator.ts # Pipeline coordinator
│   ├── layers/             # Processing layers
│   │   ├── 01-idea-generation/
│   │   ├── 02-prompt-engineering/
│   │   ├── 03-video-generation/      [TODO]
│   │   ├── 04-composition/           [TODO]
│   │   ├── 05-review/                [TODO]
│   │   └── 06-distribution/          [TODO]
│   ├── utils/              # Utility functions
│   │   ├── retry.ts
│   │   ├── validation.ts
│   │   └── cost-tracking.ts
│   ├── config/             # Configuration
│   │   ├── default.ts
│   │   └── index.ts
│   └── index.ts            # Entry point
├── scripts/
│   └── setup-db.ts         # Database setup
├── tests/                  # Test files
├── specs/                  # Architecture docs
├── content/                # Local storage (gitignored)
└── logs/                   # Application logs (gitignored)
```

## Current Implementation Status

### ✅ Completed

- [x] Project structure and configuration
- [x] Core infrastructure (Database, Storage, Logger)
- [x] Utility functions (retry, validation, cost tracking)
- [x] Layer 1: Idea Generation with Anthropic Claude
- [x] Layer 2: Prompt Engineering with OpenAI GPT-4
- [x] Pipeline orchestrator (basic)
- [x] Database schema and setup

### 🚧 In Progress / TODO

- [ ] Layer 3: Video Generation with Fal.ai
- [ ] Layer 4: Video Composition with FFmpeg
- [ ] Layer 5: Review System with Slack
- [ ] Layer 6: Distribution to social platforms
- [ ] Complete test suite
- [ ] Error recovery and restart logic
- [ ] Cost tracking dashboard
- [ ] Cron job scheduling

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format
```

### Building

```bash
# Compile TypeScript
npm run build

# Output is in ./dist directory
```

## Database

The pipeline uses PostgreSQL to track content throughout the processing stages.

### Schema Overview

- **content** - Main content tracking table
- **platform_posts** - Social media posts and engagement metrics
- **processing_logs** - Layer-by-layer processing history
- **config** - System configuration

### Database Commands

```bash
# Setup database (creates tables and indexes)
npm run setup-db

# Connect to database
psql -d social_media

# View content
psql -d social_media -c "SELECT id, idea, status FROM content;"
```

## Configuration

Configuration is managed through:
1. Environment variables (`.env` file)
2. Default configuration (`src/config/default.ts`)

### Key Configuration Options

```typescript
{
  layers: {
    ideaGeneration: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.8
    },
    promptEngineering: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7
    }
  },
  retry: {
    maxAttempts: 3,
    backoffMs: 1000
  }
}
```

## Deployment

### Local Development (Current)

Run the pipeline on your local machine:
```bash
npm run dev
```

### Production (Future)

Options for 24/7 operation:
- **VPS Deployment**: DigitalOcean, Hetzner (~$5-10/month)
- **Managed Platform**: Railway, Render (~$10-20/month)
- **Cron Job**: Schedule daily execution

## Monitoring

### Logs

Logs are stored in `./logs/`:
- `error.log` - Error-level logs only
- `combined.log` - All logs

Console output includes timestamps and structured metadata.

### Tracking Content

```bash
# Check content status
psql -d social_media -c "SELECT id, status, created_at FROM content ORDER BY created_at DESC LIMIT 5;"

# View processing logs
psql -d social_media -c "SELECT layer, status, error_message FROM processing_logs WHERE content_id='<id>';"
```

## Next Steps

1. **Implement Layer 3**: Video generation with Fal.ai
2. **Implement Layer 4**: Video composition with FFmpeg
3. **Implement Layer 5**: Slack review system
4. **Implement Layer 6**: Social media distribution
5. **Add comprehensive tests**
6. **Setup cron scheduling**
7. **Add cost tracking dashboard**

## Contributing

This is currently a single-developer project. See `specs/tasks.md` for implementation roadmap.

## License

MIT

## Support

For issues or questions, refer to:
- `specs/architecture.md` - System architecture
- `specs/tasks.md` - Implementation guide
