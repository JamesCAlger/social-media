# Agentic Educational Content Pipeline

## Overview

A quality-aware content pipeline for generating educational short-form videos for Instagram Reels using multi-agent AI systems with built-in quality control, human approval, and performance feedback loops.

**Key Principle:** Automation with encoded quality standards, not "AI slop"

**Target Platform:** Instagram Reels (single platform focus for now)

**Target Output:** 30-second educational videos using AI-generated images, stock footage, and custom voice clone

**Content Format:** Image-based (NOT AI-generated video) — differentiated from saturated AI video tools

**Quality Benchmarks:**
- Hook retention (first 3 sec): >70%
- Completion rate: >65% (higher target for 30-sec format)
- Visual change pace: 4-5 seconds (faster for shorter format)
- Engagement rate: >5%

**Why This Approach:**
- 16x cheaper than AI video generation ($0.18 vs $3.00/video)
- Enables aggressive A/B testing and iteration
- Distinctive visual identity through consistent AI image styling
- Custom voice clone creates unique audio brand
- Feedback loops differentiate from one-shot AI content tools

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AGENTIC EDUCATIONAL PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────┐                                                         │
│  │ RESEARCH AGENT │──────────────────────────────────────┐                  │
│  └────────────────┘                                      │                  │
│          │                                               │                  │
│          ▼                                               │                  │
│  ┌────────────────┐    ┌────────────────┐    ┌─────────────────────┐       │
│  │   GENERATOR    │───▶│    CRITIC      │───▶│     REFINER         │       │
│  │    AGENT       │    │    AGENT       │    │     AGENT           │       │
│  └────────────────┘    └────────────────┘    └─────────────────────┘       │
│          │                    │                        │                    │
│          │                    ▼                        │                    │
│          │            ┌────────────────┐               │                    │
│          │            │   EVALUATOR    │               │                    │
│          │            │    AGENT       │               │                    │
│          │            └────────────────┘               │                    │
│          │                    │                        │                    │
│          │          Pass? ────┴──── Fail?              │                    │
│          │            │              │                 │                    │
│          │            ▼              └─────────────────┘                    │
│          │       [Continue]              [Loop max 3x]                      │
│          │                                                                  │
│          ▼                                                                  │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐            │
│  │ ASSET AGENT    │───▶│  AUDIO AGENT   │───▶│ COMPOSER AGENT │            │
│  └────────────────┘    └────────────────┘    └────────────────┘            │
│                                                      │                      │
│                                                      ▼                      │
│                                              ┌────────────────┐             │
│                                              │  FINAL REVIEW  │             │
│                                              │    AGENT       │             │
│                                              └────────────────┘             │
│                                                      │                      │
│                              Pass ───────────────────┼─────── Fail          │
│                                │                     │           │          │
│                                ▼                     │           ▼          │
│                         [Auto-Post]                  │    [Human Review]    │
│                                                      │                      │
│  ┌───────────────────────────────────────────────────┘                      │
│  │                                                                          │
│  ▼                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PERFORMANCE FEEDBACK LOOP                         │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │   │
│  │  │ Collect      │───▶│ Analyze      │───▶│ Update       │          │   │
│  │  │ Metrics      │    │ Patterns     │    │ Agent Prompts│          │   │
│  │  └──────────────┘    └──────────────┘    └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Definitions

### Agent 1: Research Agent

**Purpose:** Find high-potential topics with viral potential and underserved angles.

**Tools Available:**
- Google Trends API
- TikTok Creative Center API
- Reddit API (trending posts)
- YouTube Search API
- Internal performance database

**Agent Configuration:**

```typescript
const researchAgent = {
  name: 'Research Agent',
  role: 'Viral Content Researcher',
  goal: 'Find underserved topics with high viral potential in the target niche',

  backstory: `You are an expert content strategist who understands what makes
  educational content go viral on short-form platforms. You analyze:

  1. SEARCH DEMAND: Topics people are actively searching for
  2. COMPETITION GAP: High interest + low quality existing content
  3. TIMELINESS: News hooks, seasonal relevance, trending conversations
  4. EMOTIONAL TRIGGERS: Curiosity, outrage, surprise, aspiration
  5. SHAREABILITY: Would someone tag a friend or save this?

  You prioritize topics where we can provide a UNIQUE ANGLE that existing
  content doesn't cover. Generic topics with saturated competition are rejected.`,

  tools: [
    'google_trends_search',
    'tiktok_trending_topics',
    'reddit_hot_posts',
    'youtube_search_volume',
    'internal_performance_db'
  ],

  outputSchema: {
    topics: [{
      topic: 'string',
      whyNow: 'string - timeliness factor',
      searchVolume: 'number - monthly searches',
      competitionLevel: 'low | medium | high',
      competitorGap: 'string - what existing content misses',
      suggestedAngle: 'string - our unique take',
      emotionalTrigger: 'curiosity | outrage | surprise | aspiration | fear',
      potentialHooks: ['string - 5 hook options'],
      confidence: 'number 0-100'
    }]
  }
};
```

**Example Output:**

```json
{
  "topics": [
    {
      "topic": "Why your savings account is losing money",
      "whyNow": "Fed rate cuts in news, inflation concerns high",
      "searchVolume": 45000,
      "competitionLevel": "medium",
      "competitorGap": "Most videos explain WHAT but not the MATH showing real losses",
      "suggestedAngle": "Show exact dollar amounts lost over 10 years with inflation calculator",
      "emotionalTrigger": "outrage",
      "potentialHooks": [
        "Your bank is stealing from you. Here's the math.",
        "I calculated how much my savings account ACTUALLY lost me.",
        "The savings account scam nobody talks about.",
        "Why keeping money in savings is the worst financial decision.",
        "$10,000 in savings = $8,500 in buying power. Here's why."
      ],
      "confidence": 87
    }
  ]
}
```

---

### Agent 2: Generator Agent

**Purpose:** Create high-quality first draft scripts with viral best practices encoded.

**Agent Configuration:**

```typescript
const generatorAgent = {
  name: 'Generator Agent',
  role: 'Viral Script Writer',
  goal: 'Write scripts optimized for retention, engagement, and virality',

  backstory: `You are an expert short-form video scriptwriter who has studied
  thousands of viral educational videos. You understand the precise structure
  that makes content perform.

  ═══════════════════════════════════════════════════════════════════════════
  HOOK RULES (First 3 Seconds) - THIS IS 50% OF SUCCESS
  ═══════════════════════════════════════════════════════════════════════════

  PATTERN INTERRUPT: Start with something unexpected
  - NOT: "Hey guys, today we're talking about..."
  - NOT: "Did you know that..."
  - NOT: "In this video, I'll show you..."

  YES: Specific, provocative, curiosity-inducing
  - "I was $47,000 in debt eating ramen. Then I found this."
  - "Your bank is legally stealing from you. Here's the math."
  - "The government mailed a 4-year-old in 1914. It cost 53 cents."

  HOOK FORMULA:
  [Specific detail] + [Unexpected claim] + [Implied promise of revelation]

  POWER WORDS: "actually", "legally", "exposed", "secret", "real reason",
               "nobody tells you", "the math", "proof"

  ═══════════════════════════════════════════════════════════════════════════
  PACING RULES
  ═══════════════════════════════════════════════════════════════════════════

  - New visual cue every 5-7 seconds (not faster, not slower)
  - Information density: 1 key point per 8-10 seconds
  - Build tension toward payoff (don't front-load everything)
  - Make it slightly TOO FAST - forces rewatches (Miss Excel technique)
  - End strong - don't let energy fizzle

  ═══════════════════════════════════════════════════════════════════════════
  STRUCTURE (30 seconds) - TIGHT AND PUNCHY
  ═══════════════════════════════════════════════════════════════════════════

  0:00-0:03  HOOK: Pattern interrupt, curiosity gap (CRITICAL - 50% of success)
  0:03-0:10  SETUP: Quick context, one sentence of "here's what you're missing"
  0:10-0:22  PAYOFF: The answer, the math, the revelation (core value)
  0:22-0:28  TAKEAWAY: One memorable insight or actionable point
  0:28-0:30  CTA: Simple "Follow for more" (no complex engagement asks)

  NOTE: 30 seconds means NO FILLER. Every second must earn its place.
  If a sentence doesn't add value, cut it.

  ═══════════════════════════════════════════════════════════════════════════
  POLARITY PRINCIPLE (What makes content STAND OUT)
  ═══════════════════════════════════════════════════════════════════════════

  Combine unexpected elements to create uniqueness:
  - Finance + brutal honesty ("Your financial advisor is lying")
  - History + modern parallels ("This 1920s scam is happening on TikTok")
  - Science + absurdity ("Scientists paid people to do nothing. Here's what happened.")

  ═══════════════════════════════════════════════════════════════════════════
  ENGAGEMENT TRIGGERS (for 30-second format, prioritize saves and shares)
  ═══════════════════════════════════════════════════════════════════════════

  - Save-worthy: Include one fact/tip/number worth remembering
  - Share trigger: Content people would send to a specific person
  - Rewatch value: Make it slightly too fast - forces rewatches
  - Follow motivation: End with clear value proposition for following

  NOTE: We are NOT optimizing for comments initially. Focus on:
  1. Saves (algorithm loves this)
  2. Shares (expands reach)
  3. Completion rate (proves quality)

  You have studied creators like Miss Excel, Mark Tilbury, Hank Green, and
  understand that ENERGY and PERSONALITY matter as much as information.`,

  outputSchema: {
    script: {
      title: 'string - video title',
      hook: 'string - first 3 seconds, word for word',
      segments: [{
        timestamp: 'string - e.g., 0:00-0:03',
        duration: 'number - seconds',
        narration: 'string - exact words to say',
        visualDescription: 'string - what viewer sees',
        visualType: 'stock | ai_image | text_card | screen_recording',
        textOverlay: 'string | null - text on screen',
        pacing: 'slow | medium | fast',
        energy: 'calm | building | peak | resolution'
      }],
      cta: 'string - call to action',
      estimatedDuration: 'number - total seconds',
      hookStyle: 'pattern_interrupt | question | shocking_stat | story_start | contrarian'
    },
    metadata: {
      targetEmotion: 'string',
      polarityElement: 'string - what makes this unique',
      debatePotential: 'low | medium | high',
      saveWorthiness: 'low | medium | high'
    }
  }
};
```

**Example Output (30-second format):**

```json
{
  "script": {
    "title": "Your savings account is a scam",
    "hook": "Your bank is legally stealing from you. Here's the math.",
    "segments": [
      {
        "timestamp": "0:00-0:03",
        "duration": 3,
        "narration": "Your bank is legally stealing from you. Here's the math.",
        "visualDescription": "AI image: Minimalist 3D piggy bank with coins dissolving, dark navy background, coral accent lighting",
        "visualType": "ai_image",
        "textOverlay": "YOUR BANK IS STEALING FROM YOU",
        "pacing": "fast",
        "energy": "peak"
      },
      {
        "timestamp": "0:03-0:10",
        "duration": 7,
        "narration": "You put ten thousand dollars in savings. The bank gives you 0.5% interest. That's fifty dollars a year.",
        "visualDescription": "AI image: Stack of money with small coins trickling out, same visual style",
        "visualType": "ai_image",
        "textOverlay": "$10,000 → $50/year",
        "pacing": "medium",
        "energy": "building"
      },
      {
        "timestamp": "0:10-0:22",
        "duration": 12,
        "narration": "But inflation is 3.5%. Your ten thousand loses three hundred fifty in buying power. Minus that fifty? You're down three hundred dollars. Every single year. After 10 years? Your money buys what seventy-four hundred used to.",
        "visualDescription": "AI image: Money stack visibly shrinking with timeline, numbers in coral accent color",
        "visualType": "ai_image",
        "textOverlay": "-$300/year → 10 years = $7,400 buying power",
        "pacing": "fast",
        "energy": "peak"
      },
      {
        "timestamp": "0:22-0:28",
        "duration": 6,
        "narration": "High-yield accounts pay 4-5%. Your money should grow, not rot.",
        "visualDescription": "AI image: Upward trending graph, same minimalist style, coral highlight on growth line",
        "visualType": "ai_image",
        "textOverlay": "HYSA: 4-5% vs Traditional: 0.5%",
        "pacing": "fast",
        "energy": "resolution"
      },
      {
        "timestamp": "0:28-0:30",
        "duration": 2,
        "narration": "Follow for more money math.",
        "visualDescription": "Clean text card with account branding",
        "visualType": "text_card",
        "textOverlay": "Follow for more 💰",
        "pacing": "medium",
        "energy": "resolution"
      }
    ],
    "cta": "Follow for more money math.",
    "estimatedDuration": 30,
    "hookStyle": "contrarian"
  },
  "metadata": {
    "targetEmotion": "outrage",
    "polarityElement": "Finance + accusation against trusted institution",
    "shareWorthiness": "high",
    "saveWorthiness": "high"
  }
}
```

---

### Agent 3: Critic Agent

**Purpose:** Evaluate content against quality rubric and identify specific weaknesses.

**Agent Configuration:**

```typescript
const criticAgent = {
  name: 'Critic Agent',
  role: 'Content Quality Critic',
  goal: 'Identify weaknesses before they hurt performance',

  backstory: `You are a ruthless content critic who has analyzed thousands of
  viral videos and understands exactly why some content performs and others fail.

  You evaluate against specific, measurable criteria. You don't give vague
  feedback - you identify EXACTLY what's wrong and HOW to fix it.

  Your standards are based on data:
  - Videos with >70% 3-second retention have specific hook patterns
  - Videos with >60% completion have specific pacing patterns
  - Videos that get comments have specific engagement triggers

  You are not nice. You are accurate. Generic praise is useless.`,

  evaluationRubric: {
    hook: {
      weight: 30,
      maxScore: 100,
      criteria: [
        {
          name: 'Pattern Interrupt',
          weight: 25,
          description: 'Does it break expected patterns in first 2 words?',
          autoFail: ['Hey guys', 'In this video', 'Today we', 'Did you know', 'Welcome to']
        },
        {
          name: 'Curiosity Gap',
          weight: 25,
          description: 'Does it create a NEED to know more (not just interest)?',
          indicators: ['Implies hidden information', 'Creates question in mind', 'Promises revelation']
        },
        {
          name: 'Specificity',
          weight: 25,
          description: 'Is it specific (numbers, names, situations) not generic?',
          examples: {
            good: '$47,000 in debt',
            bad: 'a lot of debt'
          }
        },
        {
          name: 'Scroll-Stop Power',
          weight: 25,
          description: 'Would YOU stop scrolling for this?',
          test: 'Imagine seeing this in a feed of 100 videos. Does it stand out?'
        }
      ]
    },

    pacing: {
      weight: 25,
      maxScore: 100,
      criteria: [
        {
          name: 'Visual Rhythm',
          weight: 30,
          description: 'New visual element every 5-7 seconds?',
          autoFail: 'Same visual for >10 seconds'
        },
        {
          name: 'Information Density',
          weight: 25,
          description: '1 key point per 8-10 seconds, not overwhelming or sparse'
        },
        {
          name: 'Tension Arc',
          weight: 25,
          description: 'Does it build toward payoff (not front-load or plateau)?'
        },
        {
          name: 'Ending Strength',
          weight: 20,
          description: 'Does it end strong or fizzle out?',
          autoFail: 'Ending weaker than middle'
        }
      ]
    },

    uniqueAngle: {
      weight: 20,
      maxScore: 100,
      criteria: [
        {
          name: 'Differentiation',
          weight: 35,
          description: 'Says something others haven\'t said about this topic'
        },
        {
          name: 'Polarity Element',
          weight: 35,
          description: 'Has unexpected combination or contrarian take'
        },
        {
          name: 'Memorability',
          weight: 30,
          description: 'Has a takeaway viewer will remember tomorrow'
        }
      ]
    },

    engagement: {
      weight: 15,
      maxScore: 100,
      criteria: [
        {
          name: 'Save-Worthy',
          weight: 50,
          description: 'Contains a specific fact, number, or tip worth saving for later reference'
        },
        {
          name: 'Share Trigger',
          weight: 50,
          description: 'Would someone send this to a specific person? ("My friend needs to see this")'
        }
      ]
    },

    clarity: {
      weight: 10,
      maxScore: 100,
      criteria: [
        {
          name: 'Single Message',
          weight: 40,
          description: 'One clear point (not scattered or tangential)'
        },
        {
          name: 'Jargon-Free',
          weight: 30,
          description: 'Accessible language (unless niche-appropriate)'
        },
        {
          name: 'Logical Flow',
          weight: 30,
          description: 'Each segment follows naturally from previous'
        }
      ]
    }
  },

  outputSchema: {
    scores: {
      hook: 'number 0-100',
      pacing: 'number 0-100',
      uniqueAngle: 'number 0-100',
      engagement: 'number 0-100',
      clarity: 'number 0-100',
      overall: 'number 0-100 (weighted average)'
    },
    pass: 'boolean - overall >= 80',
    weakestAreas: ['string - top 3 areas needing work'],
    specificFixes: [{
      area: 'string',
      currentIssue: 'string - what exactly is wrong',
      suggestedFix: 'string - specific change to make',
      priority: 'critical | high | medium | low'
    }],
    strengths: ['string - what to preserve'],
    verdict: 'pass | needs_refinement | major_rewrite'
  }
};
```

**Example Output:**

```json
{
  "scores": {
    "hook": 92,
    "pacing": 78,
    "uniqueAngle": 85,
    "engagement": 88,
    "clarity": 90,
    "overall": 86
  },
  "pass": true,
  "weakestAreas": [
    "Pacing: Segment 2 runs 9 seconds on same visual type",
    "Pacing: Energy dips in middle section",
    "Engagement: CTA could be more specific"
  ],
  "specificFixes": [
    {
      "area": "pacing",
      "currentIssue": "Segment at 0:03-0:12 is 9 seconds with single visual concept",
      "suggestedFix": "Split into two 4-5 second segments: (1) $10,000 deposit visual (2) 0.5% interest reveal with different visual treatment",
      "priority": "high"
    },
    {
      "area": "pacing",
      "currentIssue": "Energy drops at 0:25-0:38 during '10 years' section",
      "suggestedFix": "Add acceleration - show years counting up rapidly (1, 2, 3... 10) with money shrinking to maintain momentum",
      "priority": "medium"
    },
    {
      "area": "engagement",
      "currentIssue": "Missing specific save-worthy element",
      "suggestedFix": "Add the exact formula viewers can screenshot: 'Your loss = savings × 0.03 × years'",
      "priority": "medium"
    }
  ],
  "strengths": [
    "Hook is excellent - specific, contrarian, curiosity-inducing",
    "Math-based proof is compelling and shareable",
    "Polarity element (trusted bank = thief) creates strong emotional response"
  ],
  "verdict": "pass"
}
```

---

### Agent 4: Refiner Agent

**Purpose:** Make surgical improvements based on Critic feedback without breaking what works.

**Agent Configuration:**

```typescript
const refinerAgent = {
  name: 'Refiner Agent',
  role: 'Script Optimizer',
  goal: 'Fix identified weaknesses while preserving strengths',

  backstory: `You are a surgical editor who improves content based on specific
  feedback. You make MINIMAL changes for MAXIMUM impact.

  RULES:
  1. Only change what the Critic identified as weak
  2. Preserve everything marked as a strength
  3. Don't do wholesale rewrites - targeted fixes only
  4. If hook is strong, DON'T TOUCH IT
  5. Match the original voice and energy level

  REFINEMENT STRATEGIES BY AREA:

  HOOK (if weak):
  - Generate 3 alternative hooks
  - Keep same topic angle, change delivery
  - Add specificity (numbers, names, situations)
  - Remove weak openers, start mid-thought

  PACING (if weak):
  - Split long segments into shorter ones
  - Add visual change markers
  - Accelerate slow sections
  - Strengthen weak endings

  UNIQUE ANGLE (if weak):
  - Find the contrarian take
  - Add unexpected comparison
  - Include surprising statistic
  - Create "I never thought of it that way" moment

  ENGAGEMENT (if weak):
  - Strengthen debate trigger
  - Make CTA more specific
  - Add prediction/question element
  - Include tag-worthy moment

  CLARITY (if weak):
  - Simplify language
  - Remove tangents
  - Strengthen transitions
  - Ensure single clear message`,

  inputSchema: {
    originalScript: 'Script object from Generator',
    critique: 'Full critique from Critic Agent',
    preserveList: ['string - elements to not change']
  },

  outputSchema: {
    refinedScript: 'Script object - same structure as Generator output',
    changesLog: [{
      segment: 'string - which part changed',
      originalText: 'string',
      newText: 'string',
      reason: 'string - which critique point this addresses'
    }],
    unchangedElements: ['string - what was preserved and why']
  }
};
```

---

### Agent 5: Asset Agent

**Purpose:** Gather and select visual assets for each script segment.

**Agent Configuration:**

```typescript
const assetAgent = {
  name: 'Asset Agent',
  role: 'Visual Asset Curator',
  goal: 'Find or generate the best visual for each script segment',

  tools: [
    'pexels_video_search',      // Free stock video
    'storyblocks_search',       // Premium stock
    'fal_image_generation',     // AI image generation
    'fal_video_generation',     // AI video generation (if needed)
    'canva_template_search'     // Text card templates
  ],

  backstory: `You select visuals that ENHANCE the script, not just illustrate it.

  VISUAL HIERARCHY (prefer in this order):
  1. Unique AI-generated visuals (when script calls for something impossible)
  2. High-quality stock that matches energy (not generic corporate stock)
  3. Text cards with strong typography (for emphasis moments)
  4. Screen recordings (for tutorials/demos)

  AVOID:
  - Generic corporate stock (suits shaking hands, etc.)
  - Overused viral clips everyone has seen
  - Visuals that are merely "related" but don't enhance
  - Anything that looks like every other video

  MATCH ENERGY:
  - Fast-paced script = dynamic visuals with movement
  - Serious topic = cinematic, high-contrast
  - Playful topic = colorful, quick cuts

  For each segment, provide 3 options ranked by fit.`,

  outputSchema: {
    segments: [{
      segmentIndex: 'number',
      timestamp: 'string',
      options: [{
        type: 'stock_video | ai_image | text_card | ai_video',
        source: 'pexels | storyblocks | fal | canva',
        sourceId: 'string - for attribution/retrieval',
        previewUrl: 'string',
        fitScore: 'number 0-100',
        reasoning: 'string - why this works'
      }],
      recommendation: 'number - index of best option',
      alternativeNeeded: 'boolean - if all options are weak'
    }]
  }
};
```

---

## Visual Identity System

**Purpose:** Create recognizable, consistent visual brand across all content without showing a face.

### Brand Configuration

```typescript
const visualIdentity = {
  // Core color palette (use consistently across ALL content)
  colors: {
    primary: '#1a1a2e',       // Dark navy - backgrounds, base
    secondary: '#16213e',     // Lighter navy - secondary backgrounds
    accent: '#e94560',        // Coral/red - highlights, emphasis, key numbers
    text: '#ffffff',          // White - primary text
    textSecondary: '#a0a0a0', // Gray - secondary text, captions
    success: '#00d9a5',       // Teal - positive numbers, growth
    warning: '#ffc107'        // Amber - warnings, attention
  },

  // Typography rules
  typography: {
    primary: {
      font: 'Montserrat',
      weights: ['Bold', 'ExtraBold'],
      usage: 'Headlines, hook text, key numbers, emphasis'
    },
    secondary: {
      font: 'Inter',
      weights: ['Regular', 'Medium'],
      usage: 'Body text, supporting information'
    },
    rules: {
      maxWordsPerLine: 4,
      lineSpacing: 1.3,
      textPosition: 'center',         // Consistent placement
      safeMargin: '10%',              // Keep text away from edges
      shadowEnabled: true,            // Text shadow for readability
      shadowColor: 'rgba(0,0,0,0.8)'
    }
  },

  // AI Image generation style (CRITICAL for brand recognition)
  aiImageStyle: {
    model: 'flux-pro',                // Consistent model for all images

    // Base style applied to ALL image prompts
    basePrompt: `
      Minimalist 3D render, soft diffused studio lighting,
      dark navy background (#1a1a2e),
      subtle coral accent rim lighting (#e94560),
      clean geometric composition,
      high-end product photography aesthetic,
      centered subject, negative space for text overlay,
      no text or words in image,
      8k quality, photorealistic materials
    `,

    // Negative prompt (what to avoid)
    negativePrompt: `
      cluttered, busy background, multiple subjects,
      realistic human faces, text, watermarks, logos,
      low quality, blurry, overexposed, underexposed,
      cartoonish, flat design, clip art style
    `,

    // Topic-specific style additions
    topicStyles: {
      finance: 'floating metallic coins, abstract currency symbols, premium materials, gold and silver accents',
      investing: 'upward trending abstract graphs, growth visualization, green accent highlights',
      budgeting: 'organized geometric shapes, minimalist wallet or piggy bank, clean lines',
      psychology: 'abstract brain visualization, thought bubbles, soft gradients, calming elements',
      history: 'vintage objects with modern lighting, sepia tones blended with coral accent',
      science: 'molecular structures, clean lab aesthetic, precise geometric patterns'
    }
  },

  // Motion and transition style
  motion: {
    transitions: {
      type: 'crossfade',              // Smooth, not jarring
      duration: 0.3,                  // Seconds
      easing: 'ease-in-out'
    },
    kenBurns: {
      enabled: true,
      zoomAmount: 1.08,               // Subtle 8% zoom
      direction: 'in',                // Always zoom in (creates focus)
      duration: 'segment-length'      // Match segment duration
    },
    textAnimation: {
      style: 'word-by-word',          // Words appear sequentially
      timing: 'ahead-of-voice',       // Text leads audio by 100ms
      emphasisEffect: 'scale-pop',    // Key words get slight scale
      emphasisScale: 1.1
    }
  },

  // Text overlay style for video
  textOverlay: {
    position: 'bottom-center',
    maxWidth: '90%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: {
      hook: 56,                       // Larger for hooks
      body: 44,                       // Standard size
      emphasis: 52                    // Key points
    }
  }
};
```

### Asset Agent Integration

The Asset Agent MUST reference the visual identity for all asset selection:

```typescript
// When generating AI images
async function generateBrandedImage(segment: ScriptSegment, topic: string): Promise<ImageAsset> {
  const topicStyle = visualIdentity.aiImageStyle.topicStyles[topic] || '';

  const prompt = `
    ${visualIdentity.aiImageStyle.basePrompt}
    ${topicStyle}
    Scene: ${segment.visualDescription}
  `.trim();

  const image = await falClient.generate({
    model: visualIdentity.aiImageStyle.model,
    prompt,
    negative_prompt: visualIdentity.aiImageStyle.negativePrompt,
    width: 1080,
    height: 1920,  // 9:16 vertical
    seed: hashContentId(segment.contentId)  // Reproducible results
  });

  return image;
}

// When creating text cards
function createTextCard(text: string, style: 'hook' | 'body' | 'emphasis'): TextCardConfig {
  return {
    text,
    font: visualIdentity.typography.primary.font,
    fontWeight: 'Bold',
    fontSize: visualIdentity.textOverlay.fontSize[style],
    color: visualIdentity.colors.text,
    backgroundColor: visualIdentity.colors.primary,
    accentColor: visualIdentity.colors.accent,  // For highlighting key words
    position: visualIdentity.textOverlay.position,
    maxWidth: visualIdentity.textOverlay.maxWidth
  };
}
```

### Visual Consistency Checklist

Before any content is composed, verify:

```typescript
interface VisualConsistencyCheck {
  colorsMatch: boolean;           // All colors from palette
  fontsCorrect: boolean;          // Using Montserrat/Inter only
  textPositionConsistent: boolean; // Same placement as previous content
  aiImageStyleMatches: boolean;    // Same aesthetic as brand
  transitionsCorrect: boolean;     // Using defined transition type
  safeZonesRespected: boolean;     // Text not cut off on edges
}

async function validateVisualConsistency(video: ComposedVideo): Promise<VisualConsistencyCheck> {
  // Implementation: analyze video frames against brand guidelines
  // Flag any deviations for human review
}
```

### Why Generated Images Work for Brand

1. **Consistency** — Same model + same base prompt = same aesthetic
2. **Uniqueness** — No one else has your exact style prompt combination
3. **Control** — Unlike stock footage, you control every element
4. **Recognition** — Viewers start to recognize "your look" within 10-15 posts

**Example progression:**
- Post 1-5: Audience sees content, doesn't notice pattern
- Post 6-15: Audience subconsciously recognizes aesthetic
- Post 15+: Audience actively associates visual style with your brand

---

### Agent 6: Audio Agent

**Purpose:** Generate voiceover using custom voice clone and select background music.

**Agent Configuration:**

```typescript
const audioAgent = {
  name: 'Audio Agent',
  role: 'Audio Producer',
  goal: 'Create compelling voiceover with custom voice clone and audio bed',

  tools: [
    'elevenlabs_voice_clone',   // Primary: Custom voice clone
    'elevenlabs_tts',           // Backup: Stock voices
    'pixabay_music_search'      // Free music library
  ],

  // CUSTOM VOICE CLONE CONFIGURATION
  // Your voice, cloned via ElevenLabs Professional Voice Cloning
  customVoice: {
    voiceId: 'YOUR_CLONED_VOICE_ID',  // Replace after cloning
    name: 'Custom Voice Clone',

    // ElevenLabs settings optimized for educational content
    settings: {
      stability: 0.5,           // Balance between expressiveness and consistency
      similarity_boost: 0.85,   // High similarity to your actual voice
      style: 0.3,               // Some style variation for natural feel
      use_speaker_boost: true   // Enhance voice clarity
    },

    // Speed adjustments by content type
    speedByTopic: {
      finance: 1.08,            // Slightly fast - confident, urgent
      psychology: 1.0,          // Normal - thoughtful, measured
      history: 0.98,            // Slightly slower - storytelling pace
      science: 1.05,            // Slightly fast - enthusiastic
      default: 1.05
    },

    // Voice processing applied after generation
    postProcessing: {
      normalize: true,          // Consistent volume levels
      compression: {
        threshold: -18,         // dB
        ratio: 3,
        attack: 10,             // ms
        release: 100            // ms
      },
      eq: {
        lowCut: 80,             // Hz - remove rumble
        presence: {
          frequency: 3000,      // Hz - clarity boost
          gain: 2               // dB
        }
      }
    }
  },

  // Voice clone setup instructions
  voiceCloneSetup: `
    To create your custom voice clone:

    1. Go to ElevenLabs Voice Lab (https://elevenlabs.io/voice-lab)
    2. Click "Add Generative or Cloned Voice" → "Instant Voice Cloning"
    3. Upload 1-5 minutes of clear audio recordings of your voice:
       - Record in a quiet room
       - Speak naturally in your "content creation" voice
       - Include varied intonation (questions, statements, emphasis)
       - Avoid background noise
    4. Name your voice and create
    5. Copy the Voice ID and update customVoice.voiceId above

    For Professional Voice Cloning (better quality, requires ElevenLabs Pro):
    - Upload 30+ minutes of audio
    - Include multiple recording sessions
    - Results in more natural, consistent output
  `,

  musicGuidelines: {
    style: {
      genre: 'ambient electronic, lo-fi, minimal',
      bpm: '80-100',            // Consistent energy level
      mood: 'modern, confident, subtle tension',
      requirements: [
        'No lyrics',
        'No sudden drops or changes',
        'Consistent energy throughout',
        'Clean, not busy or distracting'
      ]
    },

    // Topic-specific music moods
    byTopic: {
      finance: 'Driving, modern, slight urgency, professional',
      psychology: 'Thoughtful, subtle, introspective, warm',
      history: 'Cinematic, building, dramatic undertones',
      science: 'Wonder, discovery, uplifting, curious',
      default: 'Modern, clean, confident, neutral'
    },

    mixing: {
      voiceoverVolume: 1.0,
      musicVolume: 0.15,        // Background, not competing
      ducking: {
        enabled: true,          // Lower music when voice active
        amount: 0.4,            // Reduce to 40% during speech
        attackTime: 50,         // ms
        releaseTime: 300        // ms
      }
    }
  },

  outputSchema: {
    voiceover: {
      audioUrl: 'string',
      duration: 'number',
      provider: 'elevenlabs',
      voiceId: 'string',
      isCustomClone: true,
      speed: 'number',
      cost: 'number'
    },
    music: {
      trackUrl: 'string',
      trackName: 'string',
      source: 'pixabay',
      bpm: 'number',
      mood: 'string',
      volume: 'number 0-1'
    },
    finalAudio: {
      url: 'string',
      duration: 'number',
      voiceoverStart: 'number',
      musicFadeOut: 'number'
    }
  }
};

// Generate voiceover with custom voice
async function generateVoiceover(
  script: Script,
  topic: string
): Promise<VoiceoverResult> {
  const speed = audioAgent.customVoice.speedByTopic[topic]
    || audioAgent.customVoice.speedByTopic.default;

  const narration = script.segments
    .map(s => s.narration)
    .join(' ');

  const audio = await elevenlabs.generate({
    voice_id: audioAgent.customVoice.voiceId,
    text: narration,
    model_id: 'eleven_turbo_v2',  // Fast, high quality
    voice_settings: {
      ...audioAgent.customVoice.settings,
      speed
    }
  });

  // Apply post-processing
  const processed = await applyAudioProcessing(
    audio,
    audioAgent.customVoice.postProcessing
  );

  return {
    audioUrl: await uploadToR2(processed),
    duration: getAudioDuration(processed),
    cost: calculateElevenLabsCost(narration.length)
  };
}
```

---

### Agent 7: Composer Agent

**Purpose:** Assemble final video from assets, audio, and script.

**Agent Configuration:**

```typescript
const composerAgent = {
  name: 'Composer Agent',
  role: 'Video Composer',
  goal: 'Assemble all elements into polished final video',

  tools: [
    'ffmpeg_compose',           // Video assembly
    'ffmpeg_text_overlay',      // Captions and text
    'ffmpeg_audio_mix',         // Audio mixing
    'r2_upload'                 // Cloud upload
  ],

  compositionRules: {
    visualTiming: {
      transitionDuration: 0.3,  // seconds
      kenBurnsZoom: 1.15,       // 15% zoom over duration
      textFadeIn: 0.2,
      textFadeOut: 0.2
    },

    captionStyle: {
      font: 'Montserrat-Bold',
      fontSize: 48,
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 3,
      position: 'bottom-center',
      maxWidth: '90%',
      animation: 'word-by-word'  // or 'sentence'
    },

    audioMix: {
      voiceoverVolume: 1.0,
      musicVolume: 0.18,
      ducking: true,            // Lower music when voice active
      duckingAmount: 0.4
    },

    output: {
      resolution: '1080x1920',  // 9:16 vertical
      fps: 30,
      codec: 'h264',
      quality: 'high',
      format: 'mp4'
    }
  },

  outputSchema: {
    video: {
      localPath: 'string',
      r2Url: 'string',
      duration: 'number',
      fileSize: 'number',
      resolution: 'string'
    },
    composition: {
      segments: [{
        index: 'number',
        visualAsset: 'string',
        startTime: 'number',
        endTime: 'number',
        textOverlays: ['string']
      }]
    },
    cost: 'number'
  }
};
```

---

### Agent 8: Performance Agent

**Purpose:** Analyze posted content performance and update agent prompts based on Instagram data.

**Agent Configuration:**

```typescript
const performanceAgent = {
  name: 'Performance Agent',
  role: 'Performance Analyst',
  goal: 'Extract learnings from real Instagram performance data and improve the system',

  tools: [
    'instagram_insights_api',   // Primary data source
    'internal_database'
  ],

  // Metrics tracked - focused on saves, shares, completion (NOT comments)
  metricsTracked: {
    // PRIMARY METRICS (what we optimize for)
    primary: {
      completionRate: 'percent who watch to end - MOST IMPORTANT for 30-sec content',
      saves: 'number - indicates high value content',
      shares: 'number - indicates share-worthy content',
      threeSecondRetention: 'percent who watch past 3 seconds - hook effectiveness'
    },

    // SECONDARY METRICS (useful context)
    secondary: {
      views: 'number - reach indicator',
      likes: 'number - basic engagement',
      averageWatchTime: 'seconds',
      replayRate: 'percent who rewatch',
      reach: 'number - unique accounts reached',
      profileVisits: 'number - from this content'
    },

    // DERIVED METRICS (calculated)
    derived: {
      saveRate: 'saves / views - quality indicator',
      shareRate: 'shares / views - virality indicator',
      engagementRate: '(likes + saves + shares) / views',
      hookEffectiveness: 'threeSecondRetention / 100',
      valueScore: '(saveRate * 0.5) + (shareRate * 0.3) + (completionRate * 0.2)'
    },

    // CONTENT ATTRIBUTES (for correlation analysis)
    contentAttributes: {
      hookStyle: 'contrarian | curiosity | shocking_stat | story_start',
      topicCategory: 'string',
      duration: 'number',
      hasNumber: 'boolean - hook contains specific number',
      hasQuestion: 'boolean - ends with question',
      visualStyle: 'ai_image | stock | text_card | mixed',
      energyLevel: 'high | medium | low'
    }
  },

  analysisOutputs: {
    hookAnalysis: {
      topPerformingPatterns: ['string - hooks with >70% 3-sec retention'],
      underperformingPatterns: ['string - hooks with <50% 3-sec retention'],
      recommendations: ['string - specific changes to make']
    },

    topicAnalysis: {
      bestCategories: ['string - topics with highest save/share rates'],
      underperforming: ['string - topics to reduce frequency'],
      suggestedRotation: ['string - optimal category mix']
    },

    visualAnalysis: {
      bestPerformingStyles: ['string - visual approaches that work'],
      styleCorrelations: ['string - what visual + topic combos work']
    },

    promptUpdates: [{
      agent: 'string - Generator, Critic, Asset, etc.',
      section: 'string - which part of the prompt',
      currentText: 'string',
      suggestedText: 'string',
      reasoning: 'string - data supporting this change',
      confidenceLevel: 'high | medium | low',
      dataPointsUsed: 'number'
    }]
  },

  // Analysis schedule
  schedule: {
    quickCheck: 'daily',        // Basic metrics review
    deepAnalysis: 'weekly',     // Full pattern analysis
    promptUpdates: 'bi-weekly', // Minimum 2 weeks of data before changes
    minDataPoints: 15           // Minimum posts for pattern detection
  }
};
```

---

## Quality Loop Implementation

### The Iterative Refinement Process

```typescript
async function generateWithQualityLoop(
  niche: string,
  maxIterations: number = 3,
  qualityThreshold: number = 80
): Promise<ContentOutput> {

  // Step 1: Research
  console.log('🔍 Research Agent: Finding topic...');
  const research = await researchAgent.execute({ niche });
  const selectedTopic = research.topics[0];

  // Step 2: Generate initial script
  console.log('✍️ Generator Agent: Creating script...');
  let script = await generatorAgent.execute({ topic: selectedTopic });

  // Step 3: Quality loop
  let iteration = 0;
  let critique: CritiqueOutput;

  while (iteration < maxIterations) {
    console.log(`🔍 Critic Agent: Evaluating (iteration ${iteration + 1})...`);
    critique = await criticAgent.execute({ script });

    console.log(`   Score: ${critique.scores.overall}/100`);
    console.log(`   Verdict: ${critique.verdict}`);

    if (critique.scores.overall >= qualityThreshold) {
      console.log('✅ Quality threshold met!');
      break;
    }

    if (iteration === maxIterations - 1) {
      console.log('⚠️ Max iterations reached, using best version');
      break;
    }

    console.log('🔧 Refiner Agent: Improving weak areas...');
    console.log(`   Fixing: ${critique.weakestAreas.join(', ')}`);

    script = await refinerAgent.execute({
      originalScript: script,
      critique: critique,
      preserveList: critique.strengths
    });

    iteration++;
  }

  // Step 4: Generate assets
  console.log('🎨 Asset Agent: Gathering visuals...');
  const assets = await assetAgent.execute({ script });

  // Step 5: Generate audio
  console.log('🎙️ Audio Agent: Creating voiceover...');
  const audio = await audioAgent.execute({
    script,
    niche,
    voiceProfile: niche
  });

  // Step 6: Compose video
  console.log('🎬 Composer Agent: Assembling video...');
  const video = await composerAgent.execute({
    script,
    assets,
    audio
  });

  // Step 7: Final quality check
  console.log('🔍 Final quality gate...');
  const finalCheck = await criticAgent.execute({
    script,
    video,
    mode: 'final_review'
  });

  // Prepare for Telegram review (ALL content requires human approval)
  const reviewRequest = await prepareForReview({
    video,
    script,
    qualityScore: finalCheck.scores.overall
  });

  // Send to Telegram for approval
  await sendTelegramReview(reviewRequest);

  return {
    video,
    script,
    qualityScore: finalCheck.scores.overall,
    iterations: iteration + 1,
    reviewRequest,  // Contains flags and priority
    status: 'pending_review',  // Always pending until human approves
    critique: finalCheck
  };
}
```

---

## Content Calendar & Topic Rotation

**Purpose:** Prevent algorithm fatigue, maintain audience interest, and ensure balanced content mix.

### Topic Category Configuration

```typescript
const contentCalendar = {
  // Define 4-5 topic categories within your niche
  categories: {
    finance: [
      {
        id: 'savings_budgeting',
        name: 'Savings & Budgeting',
        weight: 0.25,           // 25% of content
        examples: ['Emergency fund mistakes', 'Budget methods', 'Saving hacks'],
        bestDays: ['monday', 'tuesday'],  // Fresh week, practical start
        audienceType: 'Beginners, broad appeal'
      },
      {
        id: 'investing_basics',
        name: 'Investing Basics',
        weight: 0.25,
        examples: ['Index funds explained', 'Compound interest', 'When to start'],
        bestDays: ['tuesday', 'wednesday'],
        audienceType: 'Young professionals, curious beginners'
      },
      {
        id: 'money_psychology',
        name: 'Money Psychology',
        weight: 0.25,
        examples: ['Why you overspend', 'Money beliefs', 'Lifestyle creep'],
        bestDays: ['wednesday', 'thursday'],
        audienceType: 'Self-improvement crossover, high share potential'
      },
      {
        id: 'myth_busting',
        name: 'Myth Busting',
        weight: 0.15,
        examples: ['Renting isn\'t throwing money away', 'Credit myths'],
        bestDays: ['thursday', 'friday'],  // Debate-worthy for weekend
        audienceType: 'Contrarian appeal, debate potential'
      },
      {
        id: 'timely_news',
        name: 'Timely/News Hook',
        weight: 0.10,
        examples: ['Fed rate impact', 'New tax law', 'Market events'],
        bestDays: ['any'],  // Post when relevant
        audienceType: 'News-aware, higher urgency'
      }
    ]
  },

  // Rotation rules
  rules: {
    maxConsecutiveSameCategory: 2,      // Never 3+ in a row
    minDaysBetweenSameExactTopic: 14,   // Don't repeat topics within 2 weeks
    prioritizeTimely: true,              // Bump news content when relevant
    balanceRecheck: 'weekly'             // Rebalance weights weekly
  },

  // Weekly schedule template
  weeklyTemplate: {
    monday: { preferredCategories: ['savings_budgeting'], postTime: '09:00' },
    tuesday: { preferredCategories: ['investing_basics'], postTime: '12:00' },
    wednesday: { preferredCategories: ['money_psychology'], postTime: '18:00' },
    thursday: { preferredCategories: ['myth_busting'], postTime: '12:00' },
    friday: { preferredCategories: ['any'], postTime: '17:00' },  // Best performer or timely
    saturday: { preferredCategories: ['money_psychology', 'myth_busting'], postTime: '10:00' },
    sunday: { preferredCategories: ['savings_budgeting', 'investing_basics'], postTime: '11:00' }
  }
};

// Select next topic based on calendar rules
async function selectNextTopic(niche: string): Promise<TopicSelection> {
  const recentPosts = await db.getRecentPosts({ limit: 10 });
  const lastCategory = recentPosts[0]?.topicCategory;
  const categoryCounts = countCategories(recentPosts);

  // Get today's preferred categories
  const today = getDayOfWeek();
  const preferred = contentCalendar.weeklyTemplate[today].preferredCategories;

  // Filter out categories that would violate rotation rules
  const eligible = contentCalendar.categories[niche].filter(cat => {
    // Don't exceed max consecutive
    if (lastCategory === cat.id && getConsecutiveCount(recentPosts, cat.id) >= 2) {
      return false;
    }

    // Prefer today's scheduled categories
    if (preferred.includes('any') || preferred.includes(cat.id)) {
      return true;
    }

    // Allow if underrepresented
    const actualWeight = categoryCounts[cat.id] / recentPosts.length;
    return actualWeight < cat.weight * 0.5;  // Less than half target weight
  });

  // Weight by how underrepresented each category is
  const weighted = eligible.map(cat => ({
    ...cat,
    selectionWeight: cat.weight * (1 + (cat.weight - (categoryCounts[cat.id] / 10)))
  }));

  return weightedRandomSelect(weighted);
}
```

### Dynamic Weight Adjustment

```typescript
// Weekly job: Adjust category weights based on performance
async function adjustCategoryWeights(): Promise<void> {
  const last30Days = await db.getPostedContent({ since: daysAgo(30) });

  const categoryPerformance = groupBy(last30Days, 'topicCategory');

  for (const [category, posts] of Object.entries(categoryPerformance)) {
    const avgSaveRate = average(posts.map(p => p.metrics.saveRate));
    const avgShareRate = average(posts.map(p => p.metrics.shareRate));
    const avgCompletion = average(posts.map(p => p.metrics.completionRate));

    const performanceScore = (avgSaveRate * 0.4) + (avgShareRate * 0.3) + (avgCompletion * 0.3);

    // Adjust weight: ±10% based on performance vs average
    const currentWeight = contentCalendar.categories.finance
      .find(c => c.id === category)?.weight || 0.2;

    const adjustment = (performanceScore - 0.5) * 0.1;  // Max ±5% change
    const newWeight = Math.max(0.05, Math.min(0.40, currentWeight + adjustment));

    await db.updateCategoryWeight(category, newWeight);

    console.log(`Category ${category}: ${currentWeight} → ${newWeight} (perf: ${performanceScore})`);
  }
}
```

---

## A/B Testing Framework

**Purpose:** Systematically test content variables to learn what works best.

### Testing Principles

1. **Isolate ONE variable per test** — changing multiple things tells you nothing
2. **Same topic for both variants** — eliminates topic as confounding variable
3. **Similar posting times** — post A and B at same time on different days
4. **Sufficient sample size** — need 5-10 tests per variable type for patterns
5. **Wait 7 days before judging** — Instagram algorithm needs time to distribute

### Testable Variables

```typescript
const testableVariables = {
  // MOST IMPACTFUL - Test these first
  hook: {
    description: 'First 3 seconds, same script body',
    variants: ['contrarian', 'curiosity', 'shocking_stat', 'story_start'],
    isolationMethod: 'Same topic, same visuals, same voice, only hook changes',
    successMetric: 'threeSecondRetention',
    testsNeeded: 8  // 4 styles × 2 tests each minimum
  },

  // SECOND PRIORITY
  visualStyle: {
    description: 'Type of visuals used',
    variants: ['ai_images_only', 'stock_footage', 'text_cards_heavy', 'mixed'],
    isolationMethod: 'Same script, same voice, only visuals change',
    successMetric: 'completionRate',
    testsNeeded: 6
  },

  // THIRD PRIORITY
  pacing: {
    description: 'Speed of delivery',
    variants: ['fast_1.1x', 'normal_1.0x', 'slow_0.95x'],
    isolationMethod: 'Same content, only speed changes',
    successMetric: 'completionRate',
    testsNeeded: 4
  },

  // FOURTH PRIORITY
  openingFrame: {
    description: 'First frame before audio starts',
    variants: ['hook_text_visible', 'intriguing_image', 'question_text'],
    isolationMethod: 'Same video, only thumbnail/first frame changes',
    successMetric: 'threeSecondRetention',
    testsNeeded: 4
  },

  // FIFTH PRIORITY
  ctaStyle: {
    description: 'End call-to-action',
    variants: ['simple_follow', 'value_proposition', 'no_cta'],
    isolationMethod: 'Same video, only last 2 seconds change',
    successMetric: 'profileVisits',
    testsNeeded: 4
  }
};
```

### A/B Test Implementation

```typescript
interface ABTest {
  testId: string;
  variable: keyof typeof testableVariables;
  topic: string;                      // Same topic for both
  hypothesis: string;                 // What we expect to learn

  variantA: {
    contentId: string;
    description: string;              // e.g., "Contrarian hook"
    value: string;                    // e.g., "Your bank is stealing..."
    postedAt: Date;
  };

  variantB: {
    contentId: string;
    description: string;              // e.g., "Curiosity hook"
    value: string;                    // e.g., "I calculated exactly..."
    postedAt: Date;                   // 24-48 hours after A, same time of day
  };

  status: 'running' | 'complete' | 'inconclusive';

  results?: {
    winner: 'A' | 'B' | 'tie';
    metrics: {
      variantA: { retention3s: number; completion: number; saves: number; shares: number };
      variantB: { retention3s: number; completion: number; saves: number; shares: number };
    };
    percentDifference: number;        // How much better winner was
    confidence: 'high' | 'medium' | 'low';
    learning: string;                 // Human-readable insight
  };
}

// Create an A/B test
async function createABTest(
  variable: string,
  topic: string,
  variantAValue: string,
  variantBValue: string
): Promise<ABTest> {
  // Generate variant A content
  const contentA = await generateContent({
    topic,
    [variable]: variantAValue,
    abTestId: generateTestId(),
    isVariantA: true
  });

  // Generate variant B content (same topic, different variable)
  const contentB = await generateContent({
    topic,
    [variable]: variantBValue,
    abTestId: contentA.abTestId,
    isVariantA: false
  });

  // Store test
  const test: ABTest = {
    testId: contentA.abTestId,
    variable,
    topic,
    hypothesis: `Testing whether ${variantAValue} outperforms ${variantBValue} for ${variable}`,
    variantA: {
      contentId: contentA.id,
      description: variantAValue,
      value: contentA[variable],
      postedAt: new Date()  // Will be updated when posted
    },
    variantB: {
      contentId: contentB.id,
      description: variantBValue,
      value: contentB[variable],
      postedAt: new Date()  // 24-48 hours after A
    },
    status: 'running'
  };

  await db.abTests.insert(test);
  return test;
}

// Analyze completed tests
async function analyzeABTest(testId: string): Promise<ABTestResults> {
  const test = await db.abTests.findById(testId);
  const metricsA = await getMetrics(test.variantA.contentId);
  const metricsB = await getMetrics(test.variantB.contentId);

  const primaryMetric = testableVariables[test.variable].successMetric;
  const scoreA = metricsA[primaryMetric];
  const scoreB = metricsB[primaryMetric];

  const percentDiff = ((Math.max(scoreA, scoreB) - Math.min(scoreA, scoreB)) / Math.min(scoreA, scoreB)) * 100;

  // Determine winner (need >10% difference for confidence)
  let winner: 'A' | 'B' | 'tie';
  let confidence: 'high' | 'medium' | 'low';

  if (percentDiff < 10) {
    winner = 'tie';
    confidence = 'low';
  } else if (percentDiff < 25) {
    winner = scoreA > scoreB ? 'A' : 'B';
    confidence = 'medium';
  } else {
    winner = scoreA > scoreB ? 'A' : 'B';
    confidence = 'high';
  }

  const learning = winner === 'tie'
    ? `No significant difference between ${test.variantA.description} and ${test.variantB.description} for ${test.variable}`
    : `${winner === 'A' ? test.variantA.description : test.variantB.description} outperformed by ${percentDiff.toFixed(1)}% on ${primaryMetric}`;

  return {
    winner,
    metrics: { variantA: metricsA, variantB: metricsB },
    percentDifference: percentDiff,
    confidence,
    learning
  };
}
```

### Testing Schedule

```typescript
const testingSchedule = {
  // Phase 1: Hook testing (Weeks 1-2)
  phase1: {
    focus: 'hook',
    tests: [
      { topic: 'savings account loss', variantA: 'contrarian', variantB: 'curiosity' },
      { topic: 'compound interest', variantA: 'shocking_stat', variantB: 'story_start' },
      { topic: 'budget methods', variantA: 'contrarian', variantB: 'shocking_stat' },
      { topic: 'investment basics', variantA: 'curiosity', variantB: 'story_start' }
    ],
    totalContent: 8  // 4 tests × 2 variants
  },

  // Phase 2: Visual style testing (Weeks 3-4)
  phase2: {
    focus: 'visualStyle',
    tests: [
      { topic: 'inflation impact', variantA: 'ai_images_only', variantB: 'mixed' },
      { topic: 'credit score', variantA: 'text_cards_heavy', variantB: 'ai_images_only' },
      { topic: 'emergency fund', variantA: 'stock_footage', variantB: 'ai_images_only' }
    ],
    totalContent: 6
  },

  // Phase 3: Apply learnings + test pacing (Weeks 5-6)
  phase3: {
    focus: 'pacing',
    applyLearnings: ['hook', 'visualStyle'],  // Use winners from phases 1-2
    tests: [
      { topic: 'debt payoff', variantA: 'fast_1.1x', variantB: 'normal_1.0x' },
      { topic: 'tax basics', variantA: 'normal_1.0x', variantB: 'slow_0.95x' }
    ],
    totalContent: 4
  }
};

// Generate weekly A/B testing report
async function generateWeeklyTestingReport(): Promise<TestingReport> {
  const completedTests = await db.abTests.find({ status: 'complete', since: daysAgo(7) });

  const learnings = completedTests.map(t => ({
    variable: t.variable,
    winner: t.results.winner,
    learning: t.results.learning,
    confidence: t.results.confidence
  }));

  const highConfidenceLearnings = learnings.filter(l => l.confidence === 'high');

  return {
    testsCompleted: completedTests.length,
    learnings,
    highConfidenceLearnings,
    recommendedPromptUpdates: highConfidenceLearnings.map(l => ({
      agent: 'Generator',
      update: `Prefer ${l.learning}`
    }))
  };
}
```

---

## Performance Feedback Integration

### Data Collection

```typescript
interface PostedContentRecord {
  contentId: string;
  postedAt: Date;
  platform: 'instagram';  // Instagram only for now

  // Script attributes (for correlation)
  hookText: string;
  hookStyle: string;
  topicCategory: string;
  duration: number;
  hasNumber: boolean;
  hasQuestion: boolean;
  polarityType: string;

  // Quality scores at creation
  creationQualityScore: number;
  hookScore: number;
  pacingScore: number;

  // Performance metrics (updated daily)
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    threeSecondRetention: number;
    averageWatchTime: number;
    completionRate: number;
  };

  // Calculated
  engagementRate: number;
  performanceVsAverage: number;  // 1.0 = average, 2.0 = 2x average
}
```

### Weekly Analysis Job

```typescript
async function weeklyPerformanceAnalysis() {
  const last30Days = await db.getPostedContent({
    since: daysAgo(30),
    minViews: 1000  // Filter out suppressed content
  });

  if (last30Days.length < 20) {
    console.log('Not enough data for analysis');
    return;
  }

  const analysis = await performanceAgent.analyze(last30Days);

  // Update agent prompts based on learnings
  for (const update of analysis.promptUpdates) {
    console.log(`Updating ${update.agent}: ${update.section}`);
    await updateAgentPrompt(update.agent, update.section, update.suggestedText);

    // Log the change
    await db.promptHistory.insert({
      agent: update.agent,
      section: update.section,
      previousText: update.currentText,
      newText: update.suggestedText,
      reasoning: update.reasoning,
      dataPointsUsed: last30Days.length,
      timestamp: new Date()
    });
  }

  // Store successful patterns for few-shot examples
  const topPerformers = last30Days
    .filter(p => p.performanceVsAverage > 2.0)
    .slice(0, 10);

  await db.successfulPatterns.upsert({
    type: 'hooks',
    examples: topPerformers.map(p => ({
      text: p.hookText,
      style: p.hookStyle,
      performance: p.performanceVsAverage
    })),
    updatedAt: new Date()
  });

  console.log('✅ Performance analysis complete');
  console.log(`   Top hook style: ${analysis.hookAnalysis.topPerformingPatterns[0]}`);
  console.log(`   Best topic: ${analysis.topicAnalysis.bestCategories[0]}`);
  console.log(`   Prompt updates: ${analysis.promptUpdates.length}`);
}
```

### Dynamic Prompt Enhancement

```typescript
async function getEnhancedGeneratorPrompt(niche: string): Promise<string> {
  const basePrompt = generatorAgent.backstory;

  // Get recent successful patterns
  const successfulHooks = await db.successfulPatterns.get('hooks');
  const failedHooks = await db.failedPatterns.get('hooks');
  const nicheInsights = await db.nicheInsights.get(niche);

  const enhancement = `
═══════════════════════════════════════════════════════════════════════════
LEARNED FROM OUR DATA (Last 30 days, ${nicheInsights.dataPoints} posts)
═══════════════════════════════════════════════════════════════════════════

TOP PERFORMING HOOKS (copy these patterns):
${successfulHooks.examples.slice(0, 5).map(h =>
  `- "${h.text}" (${h.performance.toFixed(1)}x average performance)`
).join('\n')}

HOOKS THAT FAILED (avoid these patterns):
${failedHooks.examples.slice(0, 5).map(h =>
  `- "${h.text}" (${h.performance.toFixed(1)}x average - underperformed)`
).join('\n')}

PATTERNS WE'VE IDENTIFIED:
- Hooks with specific numbers outperform by ${nicheInsights.numberLift}%
- ${nicheInsights.topHookStyle} hooks work best for ${niche}
- Average completion rate: ${nicheInsights.avgCompletion}%
- Best posting time: ${nicheInsights.bestPostTime}

Apply these learnings to your generation.
═══════════════════════════════════════════════════════════════════════════
`;

  return basePrompt + '\n\n' + enhancement;
}
```

---

## Multi-Agent Debate for Critical Decisions

For high-stakes decisions (hook selection, topic choice), use multiple agents:

```typescript
async function multiAgentHookSelection(
  hookOptions: string[],
  topic: string
): Promise<{ selectedHook: string; reasoning: string }> {

  const debateAgents = [
    {
      name: 'Retention Expert',
      focus: 'What keeps viewers watching past 3 seconds',
      prompt: `You optimize for 3-second retention. Evaluate these hooks
               for immediate attention-grabbing power. Which one makes
               you NEED to know what comes next?`
    },
    {
      name: 'Engagement Expert',
      focus: 'What drives comments, shares, saves',
      prompt: `You optimize for engagement actions. Evaluate these hooks
               for debate potential, share-worthiness, and save value.
               Which one will get people typing comments?`
    },
    {
      name: 'Virality Expert',
      focus: 'What gets algorithmic amplification',
      prompt: `You understand platform algorithms. Evaluate these hooks
               for rewatch potential, completion likelihood, and share
               triggers. Which one will the algorithm push?`
    }
  ];

  const votes: Record<number, number> = {};
  const reasoning: string[] = [];

  for (const agent of debateAgents) {
    const evaluation = await llm.evaluate({
      systemPrompt: agent.prompt,
      userPrompt: `Topic: ${topic}\n\nHook options:\n${
        hookOptions.map((h, i) => `${i + 1}. "${h}"`).join('\n')
      }\n\nRank from best to worst with reasoning.`,
      responseFormat: {
        rankings: 'number[] - indices in order of preference',
        topChoice: 'number - index of best',
        reasoning: 'string - why the top choice wins',
        veto: 'number | null - index to absolutely reject, if any'
      }
    });

    // Weighted voting (first choice = 3 points, second = 2, third = 1)
    evaluation.rankings.forEach((hookIndex, rank) => {
      const points = hookOptions.length - rank;
      votes[hookIndex] = (votes[hookIndex] || 0) + points;
    });

    // Veto power
    if (evaluation.veto !== null) {
      votes[evaluation.veto] = -Infinity;
    }

    reasoning.push(`${agent.name}: ${evaluation.reasoning}`);
  }

  // Find winner
  const winner = Object.entries(votes)
    .filter(([_, score]) => score > -Infinity)
    .sort(([, a], [, b]) => b - a)[0];

  return {
    selectedHook: hookOptions[parseInt(winner[0])],
    reasoning: reasoning.join('\n\n')
  };
}
```

---

## Content Safety & Review Rules

**IMPORTANT:** All content requires human approval via Telegram before posting. There is no auto-post functionality. The rules below determine escalation PRIORITY and flag content that needs extra scrutiny.

```typescript
const contentSafetyRules = {
  // Quality too low after max iterations - HIGH PRIORITY review
  lowQuality: {
    condition: (score: number) => score < 70,
    priority: 'high',
    message: 'Quality score below threshold after max refinement attempts'
  },

  // Comprehensive controversial content detection
  controversial: {
    condition: (content: ContentAnalysis) => {
      return checkControversialContent(content);
    },
    priority: 'high',
    message: 'Content flagged for sensitive topics - review carefully'
  },

  // Financial advice detection (regulatory risk)
  financialAdvice: {
    condition: (content: string) => {
      const advicePatterns = [
        /you should (buy|sell|invest)/i,
        /I recommend (buying|selling|investing)/i,
        /guaranteed (returns|profit|gains)/i,
        /can't lose/i,
        /risk.?free/i,
        /financial advice/i,
        /not financial advice/i,  // Often added to sketchy content
        /this is what I('m| am) doing/i  // Implicit advice
      ];
      return advicePatterns.some(p => p.test(content));
    },
    priority: 'high',
    message: 'Content may contain financial advice - ensure educational framing only'
  },

  // Unverified statistics
  unverifiedStats: {
    condition: (content: string) => {
      const statPatterns = [
        /\d+%\s+(of\s+)?(people|americans|users)/i,
        /studies show/i,
        /research (shows|proves|indicates)/i,
        /according to/i,
        /experts say/i
      ];
      const hasStats = statPatterns.some(p => p.test(content));
      const hasCitation = /\(source|\[source|cited|according to [A-Z]/i.test(content);
      return hasStats && !hasCitation;
    },
    priority: 'medium',
    message: 'Contains statistics without clear source - verify accuracy'
  },

  // First content in new topic area
  newTerritory: {
    condition: (topic: string, history: any[]) => {
      return !history.some(h => h.topicCategory === topic);
    },
    priority: 'medium',
    message: 'First content in this topic category - review tone and accuracy'
  },

  // Cost anomaly
  costAnomaly: {
    condition: (cost: number, avgCost: number) => cost > avgCost * 2,
    priority: 'low',
    message: 'Content cost significantly above average - check for issues'
  }
};

// Comprehensive controversial content checker
function checkControversialContent(content: ContentAnalysis): boolean {
  const script = content.fullScript.toLowerCase();

  // Direct topic flags
  const topicFlags = [
    'politics', 'political', 'democrat', 'republican', 'trump', 'biden',
    'religion', 'religious', 'christian', 'muslim', 'jewish', 'atheist',
    'race', 'racial', 'racist', 'white privilege', 'black lives',
    'gender', 'transgender', 'feminist', 'feminism', 'patriarchy',
    'abortion', 'pro-life', 'pro-choice',
    'vaccine', 'vaccination', 'anti-vax', 'covid',
    'climate change', 'global warming', 'climate denial',
    'gun control', 'second amendment', '2nd amendment'
  ];

  if (topicFlags.some(flag => script.includes(flag))) {
    return true;
  }

  // Accusatory/inflammatory language patterns
  const inflammatoryPatterns = [
    /they('re| are) (lying|stealing|scamming)/i,
    /(banks|government|corporations) (want|don't want) you to/i,
    /what (they|the media|experts) (won't|don't want to) tell you/i,
    /exposed/i,
    /conspiracy/i,
    /wake up/i,
    /sheeple/i,
    /mainstream media/i
  ];

  if (inflammatoryPatterns.some(p => p.test(script))) {
    return true;
  }

  // Absolute claims that could be false
  const absolutePatterns = [
    /always (works|fails)/i,
    /never (works|fails)/i,
    /100% (guaranteed|certain|true)/i,
    /the only way to/i,
    /everyone should/i,
    /nobody should/i
  ];

  if (absolutePatterns.some(p => p.test(script))) {
    return true;
  }

  return false;
}

async function prepareForReview(content: ContentOutput): Promise<ReviewRequest> {
  const flags: ContentFlag[] = [];
  let priority: 'high' | 'medium' | 'low' = 'low';

  for (const [ruleName, config] of Object.entries(contentSafetyRules)) {
    if (config.condition(/* relevant data */)) {
      flags.push({
        rule: ruleName,
        message: config.message,
        priority: config.priority
      });
      // Escalate to highest priority among triggered rules
      if (config.priority === 'high') priority = 'high';
      else if (config.priority === 'medium' && priority !== 'high') priority = 'medium';
    }
  }

  // ALL content goes to Telegram review - no auto-post
  return {
    contentId: content.contentId,
    priority,
    flags,
    requiresExtraScrutiny: flags.length > 0,
    telegramMessage: formatTelegramReviewMessage(content, flags)
  };
}

// Format the Telegram review message with flags highlighted
function formatTelegramReviewMessage(content: ContentOutput, flags: ContentFlag[]): string {
  let message = `📝 *New Content Ready for Review*\n\n`;
  message += `*Topic:* ${content.script.title}\n`;
  message += `*Duration:* ${content.script.estimatedDuration}s\n`;
  message += `*Quality Score:* ${content.qualityScore}/100\n\n`;

  if (flags.length > 0) {
    message += `⚠️ *Flags to Review:*\n`;
    flags.forEach(f => {
      const icon = f.priority === 'high' ? '🔴' : f.priority === 'medium' ? '🟡' : '🟢';
      message += `${icon} ${f.message}\n`;
    });
    message += '\n';
  }

  message += `*Hook:* "${content.script.hook}"\n\n`;
  message += `[Preview Video](${content.video.r2Url})`;

  return message;
}
```

---

## Database Schema

```sql
-- Core content table
CREATE TABLE educational_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche VARCHAR(50) NOT NULL,
  topic_category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'generating',

  -- Research output
  topic_data JSONB,

  -- Script versions
  initial_script JSONB,
  final_script JSONB,
  iterations_needed INTEGER,

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
  total_cost DECIMAL(10,4),
  cost_breakdown JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  posted_at TIMESTAMP,

  -- Escalation
  requires_human_review BOOLEAN DEFAULT FALSE,
  escalation_reasons TEXT[],
  human_approved BOOLEAN,
  human_approved_at TIMESTAMP
);

-- Performance tracking (Instagram only)
CREATE TABLE content_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES educational_content(id),
  platform VARCHAR(50) DEFAULT 'instagram',  -- Instagram only for now

  -- Raw metrics (updated daily)
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,

  -- Retention metrics
  three_second_retention DECIMAL(5,2),
  average_watch_time DECIMAL(5,2),
  completion_rate DECIMAL(5,2),
  replay_rate DECIMAL(5,2),

  -- Calculated
  engagement_rate DECIMAL(5,4),
  performance_vs_average DECIMAL(5,2),

  -- Timestamps
  first_recorded_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW()
);

-- Successful patterns (for few-shot learning)
CREATE TABLE successful_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type VARCHAR(50),  -- 'hooks', 'topics', 'ctas', etc.
  niche VARCHAR(50),
  examples JSONB,
  performance_data JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Prompt history (track changes)
CREATE TABLE prompt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR(100),
  prompt_section VARCHAR(100),
  previous_text TEXT,
  new_text TEXT,
  reasoning TEXT,
  data_points_used INTEGER,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Processing logs
CREATE TABLE processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES educational_content(id),
  agent_name VARCHAR(100),
  action VARCHAR(100),
  input_summary JSONB,
  output_summary JSONB,
  duration_ms INTEGER,
  cost DECIMAL(10,4),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Cost Estimates (30-Second Format)

| Component | Provider | Cost per Video |
|-----------|----------|----------------|
| Research | Claude API | $0.01 |
| Script Generation | Claude API | $0.02 |
| Script Critique (3x) | Claude API | $0.03 |
| Script Refinement (2x) | Claude API | $0.02 |
| Asset Search | Pexels (free) | $0.00 |
| AI Images (4-5 per video) | Fal.ai Flux | $0.08 |
| Voiceover (30 sec) | ElevenLabs | $0.03 |
| Music | Pixabay (free) | $0.00 |
| Video Composition | FFmpeg (local) | $0.00 |
| R2 Storage/CDN | Cloudflare (free tier) | $0.00 |
| **Total** | | **~$0.19** |

### Cost Comparison

| Approach | Cost/Video | Monthly (30 videos) | Iteration Cost (10 A/B tests) |
|----------|------------|---------------------|-------------------------------|
| **This pipeline (image-based)** | **$0.19** | **$5.70** | **$3.80** |
| ASMR pipeline (Veo 3) | $3.00 | $90.00 | $60.00 |
| ASMR pipeline (WAN 2.5) | $1.50 | $45.00 | $30.00 |
| Manual production | 2-3 hours | 60-90 hours | Not feasible |

### Why This Matters

**At $0.19/video you can:**
- A/B test aggressively (10 tests = $3.80)
- Fail fast and learn cheap
- Scale to multiple posts per day
- Build a content library quickly

**At $3.00/video (Veo 3):**
- Each A/B test costs $6
- Hesitation to experiment
- Slower learning cycles
- Higher risk per decision

### ElevenLabs Voice Clone Cost Note

Custom voice clone requires ElevenLabs subscription:
- **Creator plan:** $22/month (30,000 characters = ~100 videos at 300 chars each)
- **Pro plan:** $99/month (100,000 characters = ~333 videos)

For 30 videos/month, Creator plan is sufficient. Cost per video: ~$0.73 in subscription allocation, but this is fixed cost, not per-video marginal cost.

---

## Implementation Roadmap

### Phase 1: Core Agents (Week 1)
- [ ] Research Agent with Google Trends integration
- [ ] Generator Agent with quality prompts
- [ ] Critic Agent with rubric
- [ ] Basic quality loop

### Phase 2: Refinement & Assets (Week 2)
- [ ] Refiner Agent
- [ ] Asset Agent with Pexels integration
- [ ] Audio Agent with ElevenLabs
- [ ] Composer Agent with FFmpeg

### Phase 3: Feedback Loop (Week 3)
- [ ] Performance tracking database
- [ ] Analytics API integrations
- [ ] Performance Agent analysis
- [ ] Dynamic prompt enhancement

### Phase 4: Production Hardening (Week 4)
- [ ] Multi-agent debate for hooks
- [ ] Escalation rules
- [ ] Monitoring and alerts
- [ ] A/B testing framework

---

## Framework Options

### Option A: CrewAI (Python)
```python
from crewai import Agent, Task, Crew

research_agent = Agent(
    role='Viral Content Researcher',
    goal='Find underserved topics with viral potential',
    backstory='...',
    tools=[GoogleTrendsTool(), TikTokTrendsTool()]
)

# ... define other agents

crew = Crew(
    agents=[research_agent, generator_agent, critic_agent, refiner_agent],
    tasks=[research_task, generate_task, critique_task, refine_task],
    process=Process.sequential
)

result = crew.kickoff()
```

### Option B: LangGraph (Python)
```python
from langgraph.graph import StateGraph

workflow = StateGraph(ContentState)

workflow.add_node("research", research_agent)
workflow.add_node("generate", generator_agent)
workflow.add_node("critique", critic_agent)
workflow.add_node("refine", refiner_agent)

workflow.add_edge("research", "generate")
workflow.add_edge("generate", "critique")
workflow.add_conditional_edges(
    "critique",
    should_refine,
    {"refine": "refine", "continue": "assets"}
)
workflow.add_edge("refine", "critique")
```

### Option C: Custom TypeScript (Current Stack)
```typescript
// Extends existing pipeline architecture
class AgenticEducationalPipeline extends BasePipeline {
  private researchAgent: ResearchAgent;
  private generatorAgent: GeneratorAgent;
  private criticAgent: CriticAgent;
  private refinerAgent: RefinerAgent;
  // ...

  async run(niche: string): Promise<ContentOutput> {
    // Implementation as shown above
  }
}
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Quality score (auto) | >80 average | Critic Agent evaluation |
| 3-second retention | >70% | Instagram Insights |
| Completion rate | >65% | Instagram Insights (higher target for 30-sec) |
| Save rate | >3% | saves / views |
| Share rate | >1% | shares / views |
| Cost per video | <$0.25 | Cost tracking |
| Videos per day | 1-2 initially, scale to 3-5 | Pipeline throughput |
| Telegram approval rate | >90% | Review logs |

---

## References

- [Multi-Agent Content Creation - Insoftex](https://insoftex.com/multi-agent-system-autonomous-marketing-ai-agents/)
- [Evaluator-Optimizer Pattern - AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/evaluator-reflect-refine-loop-patterns.html)
- [CrewAI Framework](https://github.com/crewAIInc/crewAI)
- [Miss Excel Strategy Analysis](https://www.marketingexamined.com/blog/miss-excel-creates-viral-tiktok-content)
- [Instagram Reels Best Practices](https://business.instagram.com/blog/instagram-reels-best-practices)
- [ElevenLabs Voice Cloning](https://elevenlabs.io/voice-cloning)
- [Fal.ai Flux Image Generation](https://fal.ai/models/flux)

---

**Last Updated:** 2025-12-13
**Status:** Specification Complete - Instagram Focus
**Platform:** Instagram Reels only (single platform focus)
**Format:** 30-second educational videos (image-based, not AI video)
**Review:** All content requires Telegram approval before posting
**Next Step:** Implementation Phase 1
