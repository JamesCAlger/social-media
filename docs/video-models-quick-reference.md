# Video Models Quick Reference

**Quick guide for switching between Ray 2 Flash, Kling 2.5 Turbo, and WAN 2.5**

---

## TL;DR - Just Want to Switch Models?

### 1. Add API Keys to `.env`
```bash
FAL_API_KEY=your-fal-key          # For Ray 2 Flash + WAN 2.5
KIE_API_KEY=your-kie-key          # For Kling 2.5 Turbo
```

### 2. Choose Your Model in `.env`
```bash
# Pick one:
VIDEO_MODEL=ray2-flash            # Cheapest ($0.60 per video)
VIDEO_MODEL=kling-turbo           # Best quality/price ($0.63 per video)
VIDEO_MODEL=wan25                 # Current baseline ($1.50 per video)
```

### 3. Done!
Your pipeline will automatically use the selected model.

---

## Cost Comparison (for 3×5sec clips)

| Model | Provider | Cost per Video | Monthly (30 videos) | Savings |
|-------|----------|----------------|---------------------|---------|
| **Ray 2 Flash** | fal.ai | **$0.60** | **$18.90** | **Save $27/mo** |
| **Kling 2.5 Turbo** | Kie.ai | **$0.63** | **$19.80** | **Save $26/mo** |
| **WAN 2.5** (current) | fal.ai | $1.50 | $45.90 | Baseline |

---

## When to Use Each Model

### Ray 2 Flash ⚡
- **Best for:** Cost optimization, fast iteration
- **Use when:** Budget is priority, simple ASMR scenes
- **Pros:** Fastest, cheapest, same provider (fal.ai)
- **Cons:** Slightly lower quality than Kling

### Kling 2.5 Turbo 🎯
- **Best for:** Complex prompts, dynamic motion
- **Use when:** Need superior prompt adherence, physics simulation
- **Pros:** Best quality, excellent motion, only 5% more than Ray 2
- **Cons:** Different provider (requires Kie.ai API key)

### WAN 2.5 📊
- **Best for:** Baseline comparison
- **Use when:** Other models fail (fallback)
- **Pros:** Proven, reliable
- **Cons:** 2.5x more expensive, no significant quality advantage

---

## Running the Comparison Test

```bash
# 1. Ensure API keys are set in .env
FAL_API_KEY=xxx
KIE_API_KEY=xxx

# 2. Run comparison script
npm run compare-models

# 3. Review output
# - Videos generated for each model
# - Cost and time statistics
# - Report saved to ./test-output/
```

**Test will generate:**
- 15 videos total (5 prompts × 3 models)
- Cost: ~$3.50 total
- Time: ~15-20 minutes

---

## Quick Implementation Checklist

- [ ] Get Kie.ai API key from https://kie.ai/dashboard/api-keys
- [ ] Add `KIE_API_KEY` to `.env`
- [ ] Create provider files (see full guide)
- [ ] Update Layer 3 to support multiple providers
- [ ] Run comparison test: `npm run compare-models`
- [ ] Review videos and choose winner
- [ ] Set `VIDEO_MODEL` in `.env`
- [ ] Deploy and monitor costs

---

## API Key Setup

### Fal.ai (for Ray 2 Flash + WAN 2.5)
1. Go to https://fal.ai/dashboard/keys
2. Create new API key
3. Add to `.env`: `FAL_API_KEY=xxx`

### Kie.ai (for Kling 2.5 Turbo)
1. Go to https://kie.ai/dashboard/api-keys
2. Create new API key
3. Add to `.env`: `KIE_API_KEY=xxx`

---

## Environment Variables Reference

```bash
# Required
FAL_API_KEY=your-fal-key
KIE_API_KEY=your-kie-key

# Model Selection
VIDEO_MODEL=ray2-flash              # Options: ray2-flash | kling-turbo | wan25

# Optional - Testing
ENABLE_MODEL_COMPARISON=false       # Set true to test multiple models
COMPARISON_MODELS=ray2-flash,kling-turbo,wan25
```

---

## Troubleshooting

### "KIE_API_KEY not found"
```bash
# Add to .env
KIE_API_KEY=your-key-here
```

### "Unknown video model: xyz"
```bash
# Check your .env - must be one of:
VIDEO_MODEL=ray2-flash
VIDEO_MODEL=kling-turbo
VIDEO_MODEL=wan25
```

### Videos look low quality
```bash
# Try switching to Kling 2.5 Turbo
VIDEO_MODEL=kling-turbo
```

### Generation timeout
```bash
# Increase timeout in provider file
# See full guide for details
```

---

## Cost Calculator

**Calculate your monthly costs:**

```
Videos per day: _____
Days per month: 30
Videos per video: 3 (segments)
Cost per clip: $____ (from table above)

Monthly cost = Videos/day × 30 × 3 × Cost/clip

Example with Ray 2 Flash:
1 video/day × 30 × 3 clips × $0.20/clip = $18/month
```

---

## Recommended Configuration

```bash
# .env - Recommended starter config
VIDEO_MODEL=ray2-flash
FAL_API_KEY=your-fal-key
KIE_API_KEY=your-kie-key  # Keep as backup

# Rationale:
# - Ray 2 Flash is 60% cheaper
# - Same provider (easy integration)
# - Good quality for ASMR
# - Can switch to Kling if needed
```

---

## Migration Path

### Week 1: Testing
- Run comparison test
- Review video quality
- Choose primary model

### Week 2: Parallel
- Generate with both old and new model
- Compare production results
- Verify cost savings

### Week 3: Full Switch
- Switch to new model
- Monitor for issues
- Remove old model

---

## Support & Documentation

- **Full Implementation Guide:** `./docs/video-model-comparison-guide.md`
- **Architecture Docs:** `./specs/architecture.md`
- **Project Context:** `./CLAUDE.md`

---

**Last Updated:** 2025-10-31
