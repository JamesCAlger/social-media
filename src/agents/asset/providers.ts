/**
 * Asset Generation Providers
 * Handles image generation via Fal.ai Flux
 */

import * as fal from '@fal-ai/serverless-client';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { logger } from '../../core/logger';
import {
  generateImagePrompt,
  negativePrompt,
  fluxConfig,
  TopicStyle
} from '../../shared/visual-identity/ai-image-style';

// Initialize Fal.ai client
fal.config({
  credentials: process.env.FAL_API_KEY
});

export interface ImageGenerationResult {
  localPath: string;
  width: number;
  height: number;
  prompt: string;
  seed: number;
  generationTimeMs: number;
  cost: number;
}

/**
 * Generate an AI image using Fal.ai Flux
 */
export async function generateImage(
  sceneDescription: string,
  outputPath: string,
  niche: string = 'finance',
  seed?: number
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  // Map niche to topic style
  const topicStyle = mapNicheToTopicStyle(niche);
  const prompt = generateImagePrompt(sceneDescription, topicStyle);

  // Use consistent seed for reproducibility if not provided
  const useSeed = seed ?? Math.floor(Math.random() * 2147483647);

  logger.info('Generating AI image', {
    prompt: prompt.substring(0, 100) + '...',
    seed: useSeed
  });

  try {
    const result = await fal.subscribe('fal-ai/flux-pro', {
      input: {
        prompt,
        negative_prompt: negativePrompt,
        image_size: {
          width: fluxConfig.width,
          height: fluxConfig.height
        },
        num_inference_steps: fluxConfig.numInferenceSteps,
        guidance_scale: fluxConfig.guidanceScale,
        seed: useSeed,
        output_format: fluxConfig.outputFormat
      },
      logs: false
    }) as { images: Array<{ url: string; width: number; height: number }> };

    if (!result.images || result.images.length === 0) {
      throw new Error('No image returned from Fal.ai');
    }

    const imageUrl = result.images[0].url;

    // Download image to local path
    await downloadImage(imageUrl, outputPath);

    const generationTimeMs = Date.now() - startTime;

    logger.info('AI image generated', {
      outputPath,
      generationTimeMs,
      width: result.images[0].width,
      height: result.images[0].height
    });

    return {
      localPath: outputPath,
      width: result.images[0].width,
      height: result.images[0].height,
      prompt,
      seed: useSeed,
      generationTimeMs,
      cost: 0.02  // Approximate cost per Flux image
    };

  } catch (error) {
    logger.error('Failed to generate AI image', {
      error: (error as Error).message,
      sceneDescription
    });
    throw error;
  }
}

/**
 * Create a text card image
 * For now, creates a placeholder - in production, use Canvas or similar
 */
export async function createTextCard(
  text: string,
  outputPath: string,
  style: 'hook' | 'body' | 'cta' = 'body'
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  // For MVP, generate a simple text card using Flux
  // In production, you'd use Canvas/Sharp for local generation
  const prompt = `
    Minimal text card design, solid dark navy background (#1a1a2e),
    clean modern typography, centered composition,
    no actual text visible, abstract geometric shapes suggesting text layout,
    subtle coral accent lines (#e94560), premium minimalist aesthetic,
    9:16 vertical format, high-end presentation slide style
  `.trim();

  logger.info('Creating text card', { text: text.substring(0, 50) + '...' });

  try {
    const result = await fal.subscribe('fal-ai/flux-pro', {
      input: {
        prompt,
        negative_prompt: negativePrompt,
        image_size: {
          width: fluxConfig.width,
          height: fluxConfig.height
        },
        num_inference_steps: 20,  // Fewer steps for simple background
        guidance_scale: 3.0,
        output_format: 'png'
      },
      logs: false
    }) as { images: Array<{ url: string; width: number; height: number }> };

    if (!result.images || result.images.length === 0) {
      throw new Error('No image returned from Fal.ai');
    }

    await downloadImage(result.images[0].url, outputPath);

    const generationTimeMs = Date.now() - startTime;

    return {
      localPath: outputPath,
      width: result.images[0].width,
      height: result.images[0].height,
      prompt,
      seed: 0,
      generationTimeMs,
      cost: 0.015  // Slightly less for simpler generation
    };

  } catch (error) {
    logger.error('Failed to create text card', { error: (error as Error).message });
    throw error;
  }
}

/**
 * Download image from URL to local path
 */
async function downloadImage(url: string, outputPath: string): Promise<void> {
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream'
  });

  const writer = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

/**
 * Map niche string to TopicStyle
 */
function mapNicheToTopicStyle(niche: string): TopicStyle {
  const mapping: Record<string, TopicStyle> = {
    finance: 'finance',
    investing: 'investing',
    budgeting: 'budgeting',
    psychology: 'psychology',
    history: 'history',
    science: 'science',
    health: 'science',  // Use science style for health
    productivity: 'psychology'  // Use psychology style for productivity
  };

  return mapping[niche.toLowerCase()] || 'finance';
}
