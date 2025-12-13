# Educational Pipeline Implementation Plan

**Based on:** `specs/agentic-educational-pipeline.md`
**Target:** Instagram Reels, 30-second educational videos (image-based)
**Estimated Total:** 4-5 weeks for full implementation

---

## Directory Structure

```
src/
├── agents/                      # Educational pipeline agents
│   ├── research/
│   │   ├── index.ts             # ResearchAgent class
│   │   ├── schema.ts            # Input/output Zod schemas
│   │   └── tools.ts             # Google Trends, topic analysis tools
│   ├── generator/
│   │   ├── index.ts             # GeneratorAgent class
│   │   ├── schema.ts            # Script schema
│   │   └── prompts.ts           # LLM prompts with quality rules
│   ├── critic/
│   │   ├── index.ts             # CriticAgent class
│   │   ├── schema.ts            # Evaluation output schema
│   │   └── rubric.ts            # Scoring rubric configuration
│   ├── refiner/
│   │   ├── index.ts             # RefinerAgent class
│   │   └── schema.ts            # Refinement output schema
│   ├── asset/
│   │   ├── index.ts             # AssetAgent class
│   │   ├── schema.ts            # Asset selection schema
│   │   └── providers.ts         # Pexels, Fal.ai integrations
│   ├── audio/
│   │   ├── index.ts             # AudioAgent class
│   │   ├── schema.ts            # Audio output schema
│   │   └── voice-config.ts      # ElevenLabs voice clone config
│   ├── composer/
│   │   ├── index.ts             # ComposerAgent class
│   │   └── schema.ts            # Composition output schema
│   └── performance/
│       ├── index.ts             # PerformanceAgent class
│       ├── schema.ts            # Analysis schema
│       └── analysis.ts          # Pattern detection algorithms
├── pipelines/
│   ├── educational.ts           # Main orchestrator
│   └── types.ts                 # Shared pipeline types
├── shared/
│   ├── visual-identity/
│   │   ├── index.ts             # Export all
│   │   ├── colors.ts            # Color palette
│   │   ├── typography.ts        # Font configuration
│   │   └── ai-image-style.ts    # Flux prompt templates
│   ├── content-calendar/
│   │   ├── index.ts             # Export all
│   │   ├── categories.ts        # Topic category definitions
│   │   └── rotation.ts          # Selection algorithm
│   ├── ab-testing/
│   │   ├── index.ts             # Export all
│   │   ├── types.ts             # ABTest interfaces
│   │   └── analysis.ts          # Test result analysis
│   └── safety/
│       ├── index.ts             # Export all
│       ├── filters.ts           # Controversial content detection
│       └── review-formatter.ts  # Telegram message formatting
├── core/                        # EXISTING - shared infrastructure
│   ├── database.ts              # Add new tables
│   ├── storage.ts               # Keep as-is
│   └── logger.ts                # Keep as-is
└── layers/                      # EXISTING - ASMR pipeline (untouched)
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Core infrastructure and first two agents working

#### 1.1 Database Schema Extension
**File:** `scripts/migrations/002-educational-tables.ts`

```sql
-- New tables for educational pipeline
CREATE TABLE educational_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche VARCHAR(50) NOT NULL DEFAULT 'finance',
  topic_category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'generating',

  -- Research output
  topic_data JSONB,

  -- Script versions
  initial_script JSONB,
  final_script JSONB,
  iterations_needed INTEGER DEFAULT 0,

  -- Quality tracking
  quality_score DECIMAL(5,2),
  hook_score DECIMAL(5,2),
  pacing_score DECIMAL(5,2),
  engagement_score DECIMAL(5,2),

  -- Assets
  assets JSONB,
  audio JSONB,

  -- Final output
  video_local_path TEXT,
  video_r2_url TEXT,
  duration DECIMAL(5,2),

  -- Cost tracking
  total_cost DECIMAL(10,4) DEFAULT 0,
  cost_breakdown JSONB,

  -- Review
  safety_flags JSONB,
  requires_extra_review BOOLEAN DEFAULT FALSE,
  telegram_message_id TEXT,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  posted_at TIMESTAMP
);

CREATE TABLE educational_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES educational_content(id),

  -- Instagram metrics
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  three_second_retention DECIMAL(5,2),
  completion_rate DECIMAL(5,2),

  -- Derived
  save_rate DECIMAL(5,4),
  share_rate DECIMAL(5,4),

  -- Content attributes (for correlation)
  hook_style VARCHAR(50),
  topic_category VARCHAR(100),
  visual_style VARCHAR(50),

  first_recorded_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id VARCHAR(100) UNIQUE NOT NULL,
  variable VARCHAR(50) NOT NULL,
  topic VARCHAR(200) NOT NULL,
  hypothesis TEXT,

  variant_a_content_id UUID REFERENCES educational_content(id),
  variant_a_description TEXT,
  variant_a_posted_at TIMESTAMP,

  variant_b_content_id UUID REFERENCES educational_content(id),
  variant_b_description TEXT,
  variant_b_posted_at TIMESTAMP,

  status VARCHAR(50) DEFAULT 'pending',

  results JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE topic_categories (
  id VARCHAR(100) PRIMARY KEY,
  niche VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  weight DECIMAL(3,2) DEFAULT 0.20,
  examples TEXT[],
  best_days TEXT[],

  -- Performance tracking
  avg_save_rate DECIMAL(5,4),
  avg_share_rate DECIMAL(5,4),
  avg_completion DECIMAL(5,2),
  post_count INTEGER DEFAULT 0,

  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE prompt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR(100) NOT NULL,
  prompt_section VARCHAR(100) NOT NULL,
  previous_text TEXT,
  new_text TEXT,
  reasoning TEXT,
  data_points_used INTEGER,
  changed_at TIMESTAMP DEFAULT NOW()
);
```

**Tasks:**
- [ ] Create migration file
- [ ] Run migration
- [ ] Add TypeScript types for new tables
- [ ] Update `src/core/database.ts` with new query helpers

**Estimated time:** 3-4 hours

---

#### 1.2 Shared Visual Identity System
**Files:** `src/shared/visual-identity/*`

```typescript
// src/shared/visual-identity/colors.ts
export const brandColors = {
  primary: '#1a1a2e',
  secondary: '#16213e',
  accent: '#e94560',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  success: '#00d9a5',
  warning: '#ffc107'
} as const;

// src/shared/visual-identity/ai-image-style.ts
export const aiImageConfig = {
  model: 'fal-ai/flux-pro',
  basePrompt: `Minimalist 3D render, soft diffused studio lighting...`,
  negativePrompt: `cluttered, busy background...`,
  topicStyles: {
    finance: '...',
    // etc
  }
};
```

**Tasks:**
- [ ] Implement `colors.ts` with full palette
- [ ] Implement `typography.ts` with font configuration
- [ ] Implement `ai-image-style.ts` with Flux prompt templates
- [ ] Create `index.ts` exporting all modules
- [ ] Write unit tests for prompt generation

**Estimated time:** 2-3 hours

---

#### 1.3 Research Agent
**Files:** `src/agents/research/*`

**Input:** Niche (e.g., "finance")
**Output:** Ranked topic suggestions with viral potential analysis

**Dependencies:**
- Claude API (existing)
- Optional: Google Trends API integration

**Implementation:**
```typescript
// src/agents/research/index.ts
export class ResearchAgent {
  async execute(input: ResearchInput): Promise<ResearchOutput> {
    // 1. Query internal performance DB for successful patterns
    // 2. Analyze recent trending topics (or use LLM knowledge)
    // 3. Generate topic suggestions with unique angles
    // 4. Score and rank by potential
  }
}
```

**Tasks:**
- [ ] Define Zod schemas (`schema.ts`)
- [ ] Implement LLM prompt for topic research (`tools.ts`)
- [ ] Implement `ResearchAgent` class
- [ ] Add internal DB query for past performance
- [ ] Write integration tests

**Estimated time:** 4-5 hours

---

#### 1.4 Generator Agent
**Files:** `src/agents/generator/*`

**Input:** Topic from Research Agent
**Output:** 30-second script with segments

**Implementation focus:**
- Hook rules encoded in prompt
- 30-second structure enforced
- Visual descriptions for each segment
- Engagement triggers

**Tasks:**
- [ ] Define script schema with segments (`schema.ts`)
- [ ] Implement comprehensive prompt with all rules (`prompts.ts`)
- [ ] Implement `GeneratorAgent` class
- [ ] Validate output structure matches 30-sec format
- [ ] Write tests with example outputs

**Estimated time:** 5-6 hours

---

### Phase 2: Quality Loop (Week 2)
**Goal:** Critic and Refiner agents, quality loop working

#### 2.1 Critic Agent
**Files:** `src/agents/critic/*`

**Input:** Script from Generator
**Output:** Scores, weaknesses, specific fixes

**Implementation:**
```typescript
// src/agents/critic/rubric.ts
export const evaluationRubric = {
  hook: { weight: 30, criteria: [...] },
  pacing: { weight: 25, criteria: [...] },
  uniqueAngle: { weight: 20, criteria: [...] },
  engagement: { weight: 15, criteria: [...] },
  clarity: { weight: 10, criteria: [...] }
};
```

**Tasks:**
- [ ] Implement rubric configuration (`rubric.ts`)
- [ ] Define evaluation output schema (`schema.ts`)
- [ ] Implement `CriticAgent` with LLM-based evaluation
- [ ] Add auto-fail conditions (weak hook openers, etc.)
- [ ] Write tests with known good/bad scripts

**Estimated time:** 5-6 hours

---

#### 2.2 Refiner Agent
**Files:** `src/agents/refiner/*`

**Input:** Original script + Critic feedback
**Output:** Improved script with change log

**Key constraint:** Only change what Critic identified as weak

**Tasks:**
- [ ] Define refinement output schema
- [ ] Implement targeted improvement prompt
- [ ] Implement `RefinerAgent` class
- [ ] Add change tracking (what was modified and why)
- [ ] Write tests comparing before/after

**Estimated time:** 3-4 hours

---

#### 2.3 Quality Loop Integration
**File:** `src/pipelines/educational.ts` (partial)

```typescript
async function qualityLoop(topic: TopicData, maxIterations = 3): Promise<QualifiedScript> {
  let script = await generatorAgent.execute({ topic });

  for (let i = 0; i < maxIterations; i++) {
    const critique = await criticAgent.execute({ script });

    if (critique.scores.overall >= 80) {
      return { script, critique, iterations: i + 1 };
    }

    if (i < maxIterations - 1) {
      script = await refinerAgent.execute({ script, critique });
    }
  }

  return { script, critique, iterations: maxIterations };
}
```

**Tasks:**
- [ ] Implement quality loop function
- [ ] Add logging for each iteration
- [ ] Track costs per iteration
- [ ] Write integration test for full loop

**Estimated time:** 3-4 hours

---

### Phase 3: Asset Production (Week 3)
**Goal:** Visual assets, audio, and composition

#### 3.1 Asset Agent
**Files:** `src/agents/asset/*`

**Input:** Approved script with segment descriptions
**Output:** Selected/generated assets for each segment

**Providers to integrate:**
- Fal.ai Flux (AI images) - PRIMARY
- Pexels (stock video/images) - BACKUP
- Text card generator (local)

**Tasks:**
- [ ] Implement Fal.ai Flux integration (`providers.ts`)
- [ ] Implement Pexels search integration
- [ ] Implement text card generation with brand styling
- [ ] Implement `AssetAgent` class with ranking logic
- [ ] Add visual consistency validation
- [ ] Write tests for each provider

**Estimated time:** 6-8 hours

---

#### 3.2 Audio Agent
**Files:** `src/agents/audio/*`

**Input:** Script with narration text
**Output:** Voiceover audio + background music

**Key feature:** Custom ElevenLabs voice clone

```typescript
// src/agents/audio/voice-config.ts
export const voiceConfig = {
  voiceId: process.env.ELEVENLABS_VOICE_ID,
  settings: {
    stability: 0.5,
    similarity_boost: 0.85,
    style: 0.3,
    use_speaker_boost: true
  },
  speedByTopic: {
    finance: 1.08,
    psychology: 1.0,
    history: 0.98,
    default: 1.05
  }
};
```

**Tasks:**
- [ ] Implement ElevenLabs voice clone integration
- [ ] Add voice config with topic-based speed
- [ ] Implement Pixabay music search
- [ ] Add audio post-processing (normalize, compress)
- [ ] Implement `AudioAgent` class
- [ ] Write tests for audio generation

**Estimated time:** 5-6 hours

---

#### 3.3 Composer Agent
**Files:** `src/agents/composer/*`

**Input:** Script + assets + audio
**Output:** Final composed video

**Leverages:** Existing FFmpeg infrastructure from ASMR pipeline

**Tasks:**
- [ ] Adapt existing composition logic for image-based format
- [ ] Implement text overlay with brand typography
- [ ] Add Ken Burns effect for images
- [ ] Implement word-by-word caption animation
- [ ] Add audio mixing (voice + music with ducking)
- [ ] Upload final video to R2
- [ ] Write integration tests

**Estimated time:** 6-8 hours

---

### Phase 4: Safety & Review (Week 4)
**Goal:** Content safety, Telegram review, distribution

#### 4.1 Safety Filters
**Files:** `src/shared/safety/*`

**Implements:**
- Controversial content detection
- Financial advice detection
- Unverified statistics flagging
- Inflammatory language patterns

**Tasks:**
- [ ] Implement `checkControversialContent()` function
- [ ] Implement financial advice regex patterns
- [ ] Implement statistics verification check
- [ ] Create priority-based flagging system
- [ ] Write comprehensive tests with edge cases

**Estimated time:** 3-4 hours

---

#### 4.2 Telegram Review Integration
**Files:** `src/shared/safety/review-formatter.ts`

**Leverages:** Existing Telegram poller from ASMR pipeline

**Enhancements:**
- Display safety flags in review message
- Show quality score and critique summary
- Priority indicators (high/medium/low)

**Tasks:**
- [ ] Implement `formatTelegramReviewMessage()` function
- [ ] Add flag icons and priority badges
- [ ] Include video preview link
- [ ] Add hook text display
- [ ] Test with existing Telegram poller

**Estimated time:** 2-3 hours

---

#### 4.3 Instagram Distribution
**Leverages:** Existing Layer 6 from ASMR pipeline

**Changes needed:**
- New content type identifier
- Different caption format for educational
- Tag educational content in analytics

**Tasks:**
- [ ] Add educational content type to distribution layer
- [ ] Implement caption formatting for educational content
- [ ] Ensure R2 URL compatibility
- [ ] Test end-to-end posting

**Estimated time:** 2-3 hours

---

#### 4.4 Full Pipeline Orchestrator
**File:** `src/pipelines/educational.ts`

```typescript
export class EducationalPipeline {
  async run(niche: string): Promise<PipelineResult> {
    // 1. Select topic (via content calendar)
    const category = await selectNextTopic(niche);

    // 2. Research
    const research = await this.researchAgent.execute({ niche, category });

    // 3. Generate + Quality Loop
    const { script, critique } = await this.qualityLoop(research.topics[0]);

    // 4. Assets
    const assets = await this.assetAgent.execute({ script });

    // 5. Audio
    const audio = await this.audioAgent.execute({ script, niche });

    // 6. Compose
    const video = await this.composerAgent.execute({ script, assets, audio });

    // 7. Safety check
    const safetyResult = await checkContentSafety(script);

    // 8. Send to Telegram review
    await this.sendForReview({ video, script, critique, safetyResult });

    return { contentId: video.contentId, status: 'pending_review' };
  }
}
```

**Tasks:**
- [ ] Implement full pipeline orchestrator
- [ ] Add comprehensive error handling
- [ ] Add cost tracking throughout
- [ ] Add logging at each stage
- [ ] Implement retry logic for API failures
- [ ] Write full integration test

**Estimated time:** 4-5 hours

---

### Phase 5: Learning & Optimization (Week 5)
**Goal:** Performance tracking, A/B testing, feedback loop

#### 5.1 Content Calendar
**Files:** `src/shared/content-calendar/*`

**Tasks:**
- [ ] Implement category definitions for finance niche
- [ ] Implement rotation algorithm
- [ ] Add consecutive posting rules
- [ ] Implement weight adjustment based on performance
- [ ] Write tests for rotation logic

**Estimated time:** 3-4 hours

---

#### 5.2 A/B Testing Framework
**Files:** `src/shared/ab-testing/*`

**Tasks:**
- [ ] Define A/B test types and interfaces
- [ ] Implement test creation (variant A/B generation)
- [ ] Implement result analysis
- [ ] Add statistical significance calculation
- [ ] Implement learning extraction
- [ ] Write tests for analysis logic

**Estimated time:** 4-5 hours

---

#### 5.3 Performance Agent
**Files:** `src/agents/performance/*`

**Tasks:**
- [ ] Implement Instagram Insights API integration
- [ ] Implement daily metrics collection job
- [ ] Implement weekly pattern analysis
- [ ] Implement prompt update suggestions
- [ ] Add correlation analysis (content attributes vs performance)
- [ ] Write tests for analysis algorithms

**Estimated time:** 6-8 hours

---

#### 5.4 Scheduled Jobs
**File:** `src/pipelines/scheduled-jobs.ts`

```typescript
// Daily: Collect metrics for posted content
// Weekly: Run performance analysis
// Weekly: Adjust category weights
// Bi-weekly: Review A/B test results
```

**Tasks:**
- [ ] Implement metrics collection cron job
- [ ] Implement weekly analysis job
- [ ] Implement category weight adjustment
- [ ] Implement A/B test completion checker
- [ ] Add job logging and error handling

**Estimated time:** 3-4 hours

---

## Implementation Order Summary

```
Week 1: Foundation
├── Day 1-2: Database schema + migrations
├── Day 2-3: Visual identity system
├── Day 3-4: Research Agent
└── Day 4-5: Generator Agent

Week 2: Quality Loop
├── Day 1-2: Critic Agent + rubric
├── Day 2-3: Refiner Agent
└── Day 3-5: Quality loop integration + testing

Week 3: Asset Production
├── Day 1-2: Asset Agent (Flux + Pexels)
├── Day 2-3: Audio Agent (ElevenLabs)
└── Day 3-5: Composer Agent (FFmpeg)

Week 4: Safety & Review
├── Day 1-2: Safety filters
├── Day 2-3: Telegram review integration
├── Day 3-4: Instagram distribution
└── Day 4-5: Full pipeline orchestrator

Week 5: Learning
├── Day 1-2: Content calendar
├── Day 2-3: A/B testing framework
├── Day 3-4: Performance Agent
└── Day 4-5: Scheduled jobs + polish
```

---

## Dependencies to Install

```bash
npm install --save \
  @fal-ai/serverless-client \
  elevenlabs \
  pexels \
  # Most other deps already exist from ASMR pipeline
```

---

## Environment Variables to Add

```bash
# ElevenLabs Voice Clone
ELEVENLABS_API_KEY=xxx
ELEVENLABS_VOICE_ID=xxx          # After creating voice clone

# Fal.ai (may already exist)
FAL_API_KEY=xxx

# Pexels
PEXELS_API_KEY=xxx

# Feature flag
ENABLE_EDUCATIONAL_PIPELINE=true
```

---

## Testing Strategy

### Unit Tests
- Each agent has isolated tests with mocked LLM responses
- Visual identity prompt generation tests
- Safety filter pattern matching tests
- A/B test analysis calculation tests

### Integration Tests
- Quality loop with real LLM calls (use cheaper model for tests)
- Asset generation with real Flux calls (limit to 1 image)
- Full pipeline dry run (stop before posting)

### Manual Testing Checklist
- [ ] Generate 5 scripts, verify quality scores
- [ ] Generate 3 complete videos, review visually
- [ ] Test Telegram review flow end-to-end
- [ ] Post 1 test video to Instagram (private account first)
- [ ] Verify metrics collection after 24 hours

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| ElevenLabs voice clone quality | Test extensively before going live; have fallback to stock voice |
| Flux image consistency | Lock model version, seed prompts, post-process if needed |
| LLM output variability | Strong schema validation, retry on malformed output |
| Breaking ASMR pipeline | Zero changes to `src/layers/`, separate DB tables |
| Instagram API issues | Reuse proven distribution layer from ASMR |

---

## Success Criteria (MVP)

- [ ] Can generate a 30-second video end-to-end
- [ ] Quality loop produces score >80 in ≤3 iterations
- [ ] Video passes safety checks
- [ ] Telegram review shows all relevant info
- [ ] Instagram post succeeds
- [ ] Total cost <$0.25 per video
- [ ] Total time <5 minutes per video

---

**Created:** 2025-12-13
**Status:** Ready for implementation
**Start with:** Phase 1.1 (Database schema)
