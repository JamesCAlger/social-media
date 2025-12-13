/**
 * AI Image Generation Style Configuration
 * Used with Fal.ai Flux for consistent visual brand
 */

import { brandColors, colorDescriptions } from './colors';

export type TopicStyle = 'finance' | 'investing' | 'budgeting' | 'psychology' | 'history' | 'science';

/**
 * Base prompt applied to ALL generated images
 * This creates the consistent "look" of your brand
 */
export const baseImagePrompt = `
Minimalist 3D render, soft diffused studio lighting,
${colorDescriptions.background},
subtle ${colorDescriptions.accent},
clean geometric composition,
high-end product photography aesthetic,
centered subject, negative space for text overlay,
no text or words in image,
8k quality, photorealistic materials, sharp focus
`.trim().replace(/\n/g, ' ');

/**
 * Negative prompt - what to avoid in ALL images
 */
export const negativePrompt = `
cluttered, busy background, multiple subjects,
realistic human faces, text, watermarks, logos,
low quality, blurry, overexposed, underexposed,
cartoonish, flat design, clip art style,
noisy, grainy, artifacts, distorted
`.trim().replace(/\n/g, ' ');

/**
 * Topic-specific style additions
 */
export const topicStyles: Record<TopicStyle, string> = {
  finance: 'floating metallic coins, abstract currency symbols, premium materials, gold and silver accents, wealth aesthetic',
  investing: 'upward trending abstract graph, growth visualization, green accent highlights, stock chart elements, prosperity',
  budgeting: 'organized geometric shapes, minimalist wallet or piggy bank, clean lines, saving concept, organized',
  psychology: 'abstract brain visualization, thought bubbles, soft gradients, calming elements, mind concept',
  history: 'vintage objects with modern lighting, sepia tones blended with coral accent, timeless aesthetic',
  science: 'molecular structures, clean lab aesthetic, precise geometric patterns, discovery concept'
};

/**
 * Generate a complete prompt for image generation
 */
export function generateImagePrompt(
  sceneDescription: string,
  topic: TopicStyle = 'finance'
): string {
  const topicStyle = topicStyles[topic] || topicStyles.finance;

  return `${baseImagePrompt}, ${topicStyle}, Scene: ${sceneDescription}`;
}

/**
 * Fal.ai Flux configuration
 */
export const fluxConfig = {
  model: 'fal-ai/flux-pro',
  width: 1080,
  height: 1920,  // 9:16 vertical for Reels
  numInferenceSteps: 28,
  guidanceScale: 3.5,
  outputFormat: 'png'
} as const;

/**
 * Generate Fal.ai request payload
 */
export function createFluxRequest(
  sceneDescription: string,
  topic: TopicStyle = 'finance',
  seed?: number
) {
  return {
    prompt: generateImagePrompt(sceneDescription, topic),
    negative_prompt: negativePrompt,
    image_size: {
      width: fluxConfig.width,
      height: fluxConfig.height
    },
    num_inference_steps: fluxConfig.numInferenceSteps,
    guidance_scale: fluxConfig.guidanceScale,
    output_format: fluxConfig.outputFormat,
    ...(seed !== undefined && { seed })
  };
}
