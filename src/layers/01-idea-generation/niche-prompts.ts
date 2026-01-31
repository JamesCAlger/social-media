/**
 * Niche-Specific Prompts for Idea Generation
 *
 * Different prompts for each content niche to support A/B testing
 * of different content strategies across multiple accounts.
 */

import { ContentStrategy } from '../../core/types';

export interface NichePrompts {
  systemPrompt: string;
  userPrompt: string;
}

export interface PromptOptions {
  recentIdeas?: string[];  // Recent ideas to avoid repetition
}

/**
 * Get prompts for a specific niche
 * @param strategy - Content strategy with niche info
 * @param options - Optional settings like recent ideas to avoid
 */
export function getNichePrompts(strategy: ContentStrategy, options?: PromptOptions): NichePrompts {
  const recentIdeas = options?.recentIdeas || [];

  switch (strategy.niche) {
    case 'asmr_pottery':
      return getASMRPotteryPrompts(recentIdeas);

    case 'oddly_satisfying':
      return getOddlySatisfyingPrompts(recentIdeas);

    case 'nature_sounds':
      return getNatureSoundsPrompts(recentIdeas);

    case 'craft_process':
      return getCraftProcessPrompts(recentIdeas);

    case 'cute_fruits_asmr':
      return getCuteFruitsAsmrPrompts(recentIdeas);

    case 'custom':
      return getCustomPrompts(strategy.nicheDescription || '', recentIdeas);

    default:
      return getASMRPotteryPrompts(recentIdeas); // Default fallback
  }
}

/**
 * Build exclusion text for prompts based on recent ideas
 */
function buildExclusionText(recentIdeas: string[]): string {
  if (recentIdeas.length === 0) return '';

  return `\n\n**IMPORTANT - AVOID REPETITION:**
Do NOT use any of these recently used concepts (generate something DIFFERENT):
${recentIdeas.map((idea, i) => `${i + 1}. ${idea}`).join('\n')}

Choose a completely different subject/fruit/material/theme than the ones listed above.`;
}

/**
 * Caption style templates for variety - rotated based on content
 */
const captionStyles = {
  asmr_pottery: [
    'action_emoji', // "Unmasking Colors 🖌️"
    'emoji_first',  // "🎨 Unearthing History"
    'question',     // "What colors lie beneath?"
    'minimal',      // "Hidden beauty revealed"
    'dramatic',     // "Ancient secrets emerge..."
  ],
  cute_fruits_asmr: [
    'cute_adjective', // "Glassy peach bliss 🍑"
    'emoji_sparkle',  // "💎 Prismatic delight!"
    'kawaii_style',   // "So soft and sweet~"
    'simple_cute',    // "Crystal fruit magic"
    'playful',        // "Slice of happiness!"
  ],
};

/**
 * Get caption style guidance for the LLM based on selected style
 */
function getCaptionStyleGuidance(niche: string, style: string): string {
  const guidance: Record<string, Record<string, string>> = {
    asmr_pottery: {
      action_emoji: `Use an ACTION VERB + emoji format. Examples: "Unmasking Colors 🖌️", "Revealing Secrets 🎨", "Brushing Away 🖼️"`,
      emoji_first: `Start with an emoji, then the caption. Examples: "🎨 Unearthing History", "🖌️ Hidden Treasures", "🏺 Ancient Beauty"`,
      question: `Use an intriguing question (no emoji needed). Examples: "What colors lie beneath?", "Can you guess the origin?", "What's hidden inside?"`,
      minimal: `Use a simple, elegant statement. Examples: "Hidden beauty revealed", "Colors emerge", "Ancient art uncovered"`,
      dramatic: `Use dramatic, mysterious language with ellipsis. Examples: "Ancient secrets emerge...", "The past awakens...", "Colors long forgotten..."`,
    },
    cute_fruits_asmr: {
      cute_adjective: `Use a cute adjective + fruit + emotion/result + fruit emoji. Examples: "Glassy peach bliss 🍑", "Crystal strawberry magic 🍓", "Sparkly grape dreams 🍇"`,
      emoji_sparkle: `Start with a sparkly/crystal emoji, then an exclamation. Examples: "💎 Prismatic delight!", "✨ Crystal perfection!", "💫 So satisfying!"`,
      kawaii_style: `Use soft, kawaii language with ~ or hearts. Examples: "So soft and sweet~", "Little fruit friend 💕", "Too cute to slice~"`,
      simple_cute: `Use simple 2-3 word cute phrase. Examples: "Crystal fruit magic", "Sweet glass slice", "Dreamy fruit cut"`,
      playful: `Use playful, energetic language with !. Examples: "Slice of happiness!", "Fruit fun time!", "So jiggly and cute!"`,
    },
  };

  return guidance[niche]?.[style] || 'Write a short, engaging caption with one emoji.';
}

/**
 * ASMR Pottery / Cultural Crafts - Original niche
 */
function getASMRPotteryPrompts(recentIdeas: string[] = []): NichePrompts {
  const exclusionText = buildExclusionText(recentIdeas);

  // Select a random caption style for this generation
  const styles = captionStyles.asmr_pottery;
  const styleIndex = Math.floor(Math.random() * styles.length);
  const selectedStyle = styles[styleIndex];

  const captionGuidance = getCaptionStyleGuidance('asmr_pottery', selectedStyle);

  return {
    systemPrompt: `
You are an AI designed to generate one creative, immersive ASMR content idea.

**RULES:**
1. Generate only ONE idea
2. The idea should involve a traditional craft material, pottery, textile, or cultural artifact
3. The idea should describe something being painted over, revealing culturally significant colors beneath
4. Maximum 13 words for the idea
5. Return ONLY a JSON object with the exact structure specified

**JSON Structure:**
{
  "Caption": "Short viral title with ONE emoji (NO hashtags - they will be added automatically)",
  "Idea": "Your idea under 13 words",
  "Environment": "Vivid setting under 20 words matching the action",
  "Sound": "Primary sound description under 15 words",
  "CulturalContext": "Culture/Region + Craft Type (e.g., 'Japanese pottery', 'Moroccan zellige')",
  "TextOverlays": {
    "IntroText": "MUST be 2-3 words, MAX 20 characters total (e.g., 'ancient craft')",
    "IntroSubtext": "Optional 1-2 words (e.g., 'revealed')",
    "SegmentLabels": ["word1", "word2"]
  }
}

The idea must specify:
- Outside color (dark solid)
- Cultural material type
- Culture/region of origin
- Internal/traditional color being revealed

**CAPTION STYLE FOR THIS VIDEO:**
${captionGuidance}

**CRITICAL TextOverlays Rules:**
- IntroText: STRICTLY 2-3 words, MAXIMUM 20 characters. Examples: "hidden beauty", "ancient craft", "colors emerge"
- IntroSubtext: Optional, 1-2 words only
- SegmentLabels: Exactly 2 single words, one per segment (video is 2 segments)
- All text MUST be lowercase

**IMPORTANT: Do NOT include hashtags in the Caption. Hashtags are added automatically by the system.**
`.trim(),

    userPrompt: `
Generate a creative concept involving:

A dark solid traditional craft material, pottery, textile, or cultural artifact being painted over by a brush,
revealing culturally significant or traditional colors beneath the dark surface. Specify the cultural origin.

Your response must follow this structure:
"(Outside Color) (Cultural Material) from (Culture/Region) with internal colour (Traditional Colour)"

Reflect carefully before answering to ensure originality and visual appeal.${exclusionText}
`.trim(),
  };
}

/**
 * Oddly Satisfying - General satisfying content
 */
function getOddlySatisfyingPrompts(recentIdeas: string[] = []): NichePrompts {
  const exclusionText = buildExclusionText(recentIdeas);

  return {
    systemPrompt: `
You are an AI designed to generate one oddly satisfying content idea for short-form video.

**RULES:**
1. Generate only ONE idea
2. The idea should be visually satisfying and mesmerizing
3. Focus on: perfect fits, smooth textures, satisfying processes, precision, symmetry, or repetitive motions
4. Maximum 13 words for the idea
5. Return ONLY a JSON object with the exact structure specified

**JSON Structure:**
{
  "Caption": "Short viral title with ONE emoji and 12 hashtags (4 oddly-satisfying related, 4 viral tags, 4 trending)",
  "Idea": "Your idea under 13 words describing the satisfying visual",
  "Environment": "Vivid setting under 20 words - clean, well-lit, visually appealing",
  "Sound": "Primary sound description under 15 words - satisfying audio that matches the visual",
  "CulturalContext": "Category (e.g., 'kinetic sand', 'slime mixing', 'precision cutting', 'paint mixing')",
  "TextOverlays": {
    "IntroText": "MUST be 2-3 words, MAX 20 characters total (e.g., 'so smooth')",
    "IntroSubtext": "Optional 1-2 words (e.g., 'watch')",
    "SegmentLabels": ["word1", "word2", "word3"]
  }
}

**Categories to consider:**
- Slime, kinetic sand, foam
- Perfect fits and alignments
- Smooth surfaces and textures
- Precision machinery or cutting
- Paint mixing and pouring
- Soap cutting, clay molding
- Symmetry and patterns

**CRITICAL TextOverlays Rules:**
- IntroText: STRICTLY 2-3 words, MAXIMUM 20 characters. Examples: "so smooth", "watch this", "perfect fit"
- IntroSubtext: Optional, 1-2 words only
- SegmentLabels: Exactly 3 single words, one per segment
- All text MUST be lowercase
`.trim(),

    userPrompt: `
Generate an oddly satisfying video concept that will mesmerize viewers.

Focus on ONE of these satisfying elements:
- Texture (smooth, squishy, crunchy)
- Precision (perfect cuts, alignments, fits)
- Process (mixing, pouring, molding)
- Symmetry (patterns, repetition, order)

The concept should be simple but hypnotic. Make viewers want to watch it on loop.${exclusionText}
`.trim(),
  };
}

/**
 * Nature Sounds - Calming nature ASMR
 */
function getNatureSoundsPrompts(recentIdeas: string[] = []): NichePrompts {
  const exclusionText = buildExclusionText(recentIdeas);

  return {
    systemPrompt: `
You are an AI designed to generate one calming nature ASMR content idea.

**RULES:**
1. Generate only ONE idea
2. The idea should feature natural environments with ambient sounds
3. Focus on: rain, water, forest, wind, wildlife, or natural phenomena
4. Maximum 13 words for the idea
5. Return ONLY a JSON object with the exact structure specified

**JSON Structure:**
{
  "Caption": "Short calming title with ONE nature emoji and 12 hashtags (4 nature-related, 4 relaxation tags, 4 ASMR tags)",
  "Idea": "Your idea under 13 words describing the natural scene",
  "Environment": "Vivid natural setting under 20 words - detailed and immersive",
  "Sound": "Primary sound description under 15 words - layered natural ambient sounds",
  "CulturalContext": "Location/Biome (e.g., 'Pacific Northwest rainforest', 'Japanese zen garden', 'Nordic fjord')",
  "TextOverlays": {
    "IntroText": "MUST be 2-3 words, MAX 20 characters total (e.g., 'find peace')",
    "IntroSubtext": "Optional 1-2 words (e.g., 'nature')",
    "SegmentLabels": ["word1", "word2", "word3"]
  }
}

**Nature Categories:**
- Rain (gentle rain, thunderstorm, rain on leaves)
- Water (stream, waterfall, ocean waves, pond)
- Forest (wind through trees, bird songs, rustling leaves)
- Weather (wind, snow falling, fog)
- Time-based (sunrise, golden hour, twilight)

**CRITICAL TextOverlays Rules:**
- IntroText: STRICTLY 2-3 words, MAXIMUM 20 characters. Examples: "find peace", "breathe deep", "pure calm"
- IntroSubtext: Optional, 1-2 words only
- SegmentLabels: Exactly 3 single words, one per segment
- All text MUST be lowercase
`.trim(),

    userPrompt: `
Generate a calming nature video concept that provides relaxation and tranquility.

Focus on ONE natural element with rich ambient sound:
- Water (rain, streams, ocean, waterfalls)
- Forest (wind, birds, rustling, crickets)
- Weather (gentle storm, snow, fog)
- Garden (zen garden, flower meadow, morning dew)

The concept should transport viewers to a peaceful natural setting.${exclusionText}
`.trim(),
  };
}

/**
 * Craft Process - Various handmade crafts
 */
function getCraftProcessPrompts(recentIdeas: string[] = []): NichePrompts {
  const exclusionText = buildExclusionText(recentIdeas);

  return {
    systemPrompt: `
You are an AI designed to generate one craft process content idea for short-form video.

**RULES:**
1. Generate only ONE idea
2. The idea should showcase a handmade craft or artisan process
3. Focus on: hands at work, tools, materials transforming, satisfying craft sounds
4. Maximum 13 words for the idea
5. Return ONLY a JSON object with the exact structure specified

**JSON Structure:**
{
  "Caption": "Short inspiring title with ONE craft emoji and 12 hashtags (4 craft-specific, 4 maker tags, 4 trending)",
  "Idea": "Your idea under 13 words describing the craft process",
  "Environment": "Vivid workshop setting under 20 words - authentic and cozy",
  "Sound": "Primary sound description under 15 words - satisfying craft sounds (tools, materials)",
  "CulturalContext": "Craft Type (e.g., 'woodworking', 'leather crafting', 'candle making', 'soap making')",
  "TextOverlays": {
    "IntroText": "MUST be 2-3 words, MAX 20 characters total (e.g., 'made by hand')",
    "IntroSubtext": "Optional 1-2 words (e.g., 'crafted')",
    "SegmentLabels": ["word1", "word2", "word3"]
  }
}

**Craft Categories:**
- Woodworking (carving, turning, sanding)
- Leather crafting (cutting, stitching, tooling)
- Candle/Soap making (pouring, setting, cutting)
- Pottery (throwing, trimming, glazing)
- Textile (weaving, dyeing, embroidery)
- Metal work (forging, polishing, engraving)
- Paper crafts (bookbinding, calligraphy, origami)

**CRITICAL TextOverlays Rules:**
- IntroText: STRICTLY 2-3 words, MAXIMUM 20 characters. Examples: "made by hand", "the process", "raw to art"
- IntroSubtext: Optional, 1-2 words only
- SegmentLabels: Exactly 3 single words, one per segment
- All text MUST be lowercase
`.trim(),

    userPrompt: `
Generate a craft process video concept showcasing skilled handiwork.

Focus on ONE craft with satisfying sounds and visuals:
- The transformation of raw materials
- Skilled hand movements and tool use
- Satisfying textures and sounds of the craft
- The journey from start to finished piece

The concept should make viewers appreciate the art of making things by hand.${exclusionText}
`.trim(),
  };
}

/**
 * Cute Fruits ASMR - Kawaii-style fruits made of transparent materials being cut
 */
function getCuteFruitsAsmrPrompts(recentIdeas: string[] = []): NichePrompts {
  const exclusionText = buildExclusionText(recentIdeas);

  // Select a random caption style for this generation
  const styles = captionStyles.cute_fruits_asmr;
  const styleIndex = Math.floor(Math.random() * styles.length);
  const selectedStyle = styles[styleIndex];

  const captionGuidance = getCaptionStyleGuidance('cute_fruits_asmr', selectedStyle);

  return {
    systemPrompt: `
You are an AI designed to generate one satisfying kawaii fruit-cutting ASMR content idea for short-form video.

**CORE CONCEPT:**
CUTE, KAWAII-STYLE fruits made of TRANSPARENT/TRANSLUCENT MATERIALS being sliced with a knife. The fruits have adorable smiling faces and are made of see-through colorful materials.

**RULES:**
1. Generate only ONE idea
2. The fruit MUST be kawaii/cute style with a SMALL SMILING FACE
3. The fruit MUST be made of a TRANSPARENT or TRANSLUCENT material
4. The video shows the cute fruit being gently sliced to reveal the see-through interior
5. Maximum 13 words for the idea
6. Return ONLY a JSON object with the exact structure specified

**MATERIAL OPTIONS (PRIORITIZE GLASS AND CRYSTAL):**
PRIMARY MATERIALS (use 80% of the time):
- Glass (transparent, tinted colored glass - you can see through it, light refracts beautifully)
- Crystal (sparkling, clear with colored tints, faceted like gemstones, light refracts through creating rainbows)

SECONDARY MATERIALS (use 20% of the time):
- Hard candy (shiny, translucent, jewel-like colors)
- Ice (frozen, crystalline, clear with frost)
- Jelly/Gelatin (wobbly, translucent, jiggly - less preferred)

**KAWAII STYLE REQUIREMENTS:**
- Rounded, soft, chubby fruit shapes (not realistic proportions)
- Small cute smiling face with dot eyes and tiny smile :) or ^_^
- Pastel or candy colors (soft pink, baby blue, mint green, lavender, peach)
- Slightly chibi/cartoonish proportions
- Sparkles or shimmer effects
- Adorable, innocent expression

**CAPTION STYLE FOR THIS VIDEO:**
${captionGuidance}

**JSON Structure:**
{
  "Caption": "Short viral title with ONE cute emoji (NO hashtags - they will be added automatically)",
  "Idea": "Your idea under 13 words - must mention cute/kawaii fruit, material, AND the vivid gem interior reveal",
  "Environment": "Dreamy pastel setting under 20 words - soft pink/white/lavender background, gentle lighting, sparkles",
  "Sound": "Gentle satisfying sound under 15 words - glass chime, gems cascading/tinkling, crystal tinkle",
  "CulturalContext": "Kawaii + Material + Fruit + Interior gems (e.g., 'kawaii glass strawberry with ruby gems inside')",
  "TextOverlays": {
    "IntroText": "MUST be 2-3 words, MAX 20 characters (e.g., 'so cute')",
    "IntroSubtext": "Optional 1-2 words (e.g., 'jelly')",
    "SegmentLabels": ["word1"]
  }
}

**FRUITS TO USE (in kawaii style) - USE VARIETY, avoid repeating recent fruits:**
- Common: Strawberry, Orange, Apple, Watermelon, Lemon, Peach, Mango, Cherry, Grape
- Berries: Blueberry, Raspberry, Blackberry, Cranberry
- Tropical: Pineapple, Coconut, Dragon fruit, Passion fruit, Papaya, Kiwi, Lychee, Starfruit, Guava
- Stone fruits: Plum, Apricot, Nectarine
- Other: Pear, Banana, Fig, Pomegranate, Persimmon, Melon (honeydew, cantaloupe)

**VISUAL STYLE:**
- Cute, chubby kawaii fruit shape (NOT realistic)
- Small smiling face on the fruit (^_^ style)
- GLASS or CRYSTAL material preferred - light refracts beautifully, creating rainbow effects
- Sparkling, gemstone-like appearance with facets that catch the light
- Pastel tinted transparent colors (rose glass, mint crystal, lavender glass)
- Soft, dreamy lighting with sparkles and light refractions
- Clean pastel pink, white, or lavender background

**INTERIOR REVEAL (CRITICAL):**
- When sliced, the interior MUST contain VIVID COLORED GEMSTONES
- Interior gems should be a CONTRASTING color to the exterior (e.g., mint exterior → ruby red gems inside)
- Gem types: tiny rubies, emeralds, sapphires, amethysts, topaz crystals, or diamond-like sparkles
- Gems should CASCADE OUT like sand or glittering particles when the fruit is cut open
- The gems tumble, pour, and scatter satisfyingly as the slice reveals them
- Interior should look like a geode filled with precious stones, not empty/hollow

**CRITICAL TextOverlays Rules:**
- IntroText: MUST BE "guess the color" (creates engagement hook for viewers)
- IntroSubtext: Optional, 1-2 words only (e.g., the fruit name)
- SegmentLabels: Exactly 1 single word (video is 1 segment)
- All text MUST be lowercase

**IMPORTANT: Do NOT include hashtags in the Caption. Hashtags are added automatically by the system.**
`.trim(),

    userPrompt: `
Generate a kawaii fruit-cutting video concept with these REQUIRED elements:

1. A CUTE, KAWAII-STYLE fruit (chubby, rounded, cartoon-like - NOT realistic)
2. The fruit has a SMALL SMILING FACE (dot eyes, tiny smile)
3. Made of GLASS or CRYSTAL (strongly preferred) - transparent, sparkling, light refracts through beautifully
4. Being gently sliced to reveal VIVID COLORED GEMS inside that cascade out
5. Pastel exterior color palette (soft pink, mint, lavender, peach)

**INTERIOR GEMS (CRITICAL):**
- The interior MUST be filled with tiny vivid gemstones (rubies, emeralds, sapphires, amethysts)
- Gems must be a CONTRASTING color to the exterior (e.g., soft mint exterior → bright ruby red gems inside)
- When sliced, the gems CASCADE OUT like sand or glittering particles
- Think geode-style reveal: the fruit looks like a treasure chest of sparkling gems inside
- The gem-pouring effect should be the most satisfying moment of the video

Make it cute, dreamy, and TREASURE-FILLED. Think kawaii aesthetic meets ASMR with elegant glass exterior and vivid gem interior.${exclusionText}
`.trim(),
  };
}

/**
 * Custom niche with user-provided description
 */
function getCustomPrompts(nicheDescription: string, recentIdeas: string[] = []): NichePrompts {
  const exclusionText = buildExclusionText(recentIdeas);

  return {
    systemPrompt: `
You are an AI designed to generate one creative content idea for short-form video.

**NICHE FOCUS:**
${nicheDescription}

**RULES:**
1. Generate only ONE idea matching the niche above
2. The idea should be engaging and shareable
3. Maximum 13 words for the idea
4. Return ONLY a JSON object with the exact structure specified

**JSON Structure:**
{
  "Caption": "Short viral title with ONE emoji and 12 hashtags (mix of niche-specific and trending)",
  "Idea": "Your idea under 13 words",
  "Environment": "Vivid setting under 20 words matching the concept",
  "Sound": "Primary sound description under 15 words",
  "CulturalContext": "Category or theme description",
  "TextOverlays": {
    "IntroText": "MUST be 2-3 words, MAX 20 characters total",
    "IntroSubtext": "Optional 1-2 words",
    "SegmentLabels": ["word1", "word2", "word3"]
  }
}

**CRITICAL TextOverlays Rules:**
- IntroText: STRICTLY 2-3 words, MAXIMUM 20 characters. Keep it short and punchy.
- IntroSubtext: Optional, 1-2 words only
- SegmentLabels: Exactly 3 single words, one per segment
- All text MUST be lowercase
`.trim(),

    userPrompt: `
Generate a creative video concept for the following niche:
${nicheDescription}

The concept should be:
- Engaging and shareable
- Visually appealing
- Suitable for short-form video (15-30 seconds)
- Aligned with the niche's audience expectations${exclusionText}
`.trim(),
  };
}

/**
 * Get hashtags specific to a niche
 */
export function getNicheHashtags(niche: string): string[] {
  const hashtags: Record<string, string[]> = {
    asmr_pottery: [
      '#asmr', '#pottery', '#ceramics', '#satisfying', '#handmade',
      '#artisan', '#craft', '#relaxing', '#calming', '#oddlysatisfying',
      '#potterywheel', '#clayart',
    ],
    oddly_satisfying: [
      '#oddlysatisfying', '#satisfying', '#asmr', '#relaxing', '#viral',
      '#satisfyingvideos', '#slime', '#mesmerizing', '#soothing', '#satisfyingasmr',
      '#perfectfit', '#smoothsounds',
    ],
    nature_sounds: [
      '#naturesounds', '#asmr', '#relaxing', '#nature', '#peaceful',
      '#rainsounds', '#forestsounds', '#meditation', '#calm', '#sleep',
      '#ambience', '#naturalambience',
    ],
    craft_process: [
      '#handmade', '#crafts', '#diy', '#maker', '#artisan',
      '#satisfying', '#process', '#workshop', '#makersgonnamake', '#craftsman',
      '#handcrafted', '#makersmovement',
    ],
    cute_fruits_asmr: [
      '#kawaii', '#cutefruit', '#glassfruit', '#crystalfruit', '#kawaiiart',
      '#asmr', '#satisfying', '#oddlysatisfying', '#cuttingasmr', '#viral',
      '#pastel', '#cute', '#satisfyingvideos', '#glassart', '#crystalasmr',
    ],
  };

  return hashtags[niche] || hashtags['oddly_satisfying'];
}
