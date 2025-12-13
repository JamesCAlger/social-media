/**
 * Asset Agent
 *
 * Generates visual assets for each script segment using:
 * - Fal.ai Flux Pro for AI-generated images
 * - Text cards for key points
 *
 * Each segment gets a single image that will be displayed
 * for the duration of that segment in the final video.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../core/logger';
import { Script, ScriptSegment } from '../generator/schema';
import {
  AssetInput,
  AssetInputSchema,
  AssetOutput,
  AssetOutputSchema,
  GeneratedAsset
} from './schema';
import { generateImage, createTextCard, ImageGenerationResult } from './providers';

// ============================================================================
// Configuration
// ============================================================================

interface AssetAgentConfig {
  outputBaseDir: string;
  mockMode?: boolean;  // For testing without API calls
}

const DEFAULT_CONFIG: AssetAgentConfig = {
  outputBaseDir: './content',
  mockMode: false
};

// ============================================================================
// Asset Agent
// ============================================================================

export class AssetAgent {
  private config: AssetAgentConfig;

  constructor(config: Partial<AssetAgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate all visual assets for a script
   */
  async execute(input: AssetInput): Promise<AssetOutput> {
    const startTime = Date.now();

    // Validate input
    const validatedInput = AssetInputSchema.parse(input);
    const { script, contentId, niche, outputDir } = validatedInput;

    // Determine output directory
    const assetDir = outputDir || path.join(this.config.outputBaseDir, contentId, 'assets');

    // Ensure directory exists
    if (!fs.existsSync(assetDir)) {
      fs.mkdirSync(assetDir, { recursive: true });
    }

    logger.info('Asset Agent starting', {
      contentId,
      segmentCount: script.segments.length,
      niche,
      outputDir: assetDir
    });

    const assets: GeneratedAsset[] = [];
    let totalCost = 0;
    let aiImageCount = 0;
    let textCardCount = 0;

    // Process each segment
    for (let i = 0; i < script.segments.length; i++) {
      const segment = script.segments[i];

      logger.info(`Generating asset for segment ${i + 1}/${script.segments.length}`, {
        timestamp: segment.timestamp,
        visualType: segment.visualType,
        duration: segment.duration
      });

      try {
        const asset = await this.generateSegmentAsset(
          segment,
          i,
          assetDir,
          niche
        );

        assets.push(asset);
        totalCost += this.getAssetCost(asset.type);

        if (asset.type === 'ai_image') aiImageCount++;
        if (asset.type === 'text_card') textCardCount++;

        logger.info(`Asset generated for segment ${i + 1}`, {
          type: asset.type,
          localPath: asset.localPath,
          generationTimeMs: asset.generationTimeMs
        });

      } catch (error) {
        logger.error(`Failed to generate asset for segment ${i + 1}`, {
          error: (error as Error).message,
          segment: segment.timestamp
        });
        throw error;
      }
    }

    const totalTimeMs = Date.now() - startTime;

    logger.info('Asset Agent complete', {
      contentId,
      totalImages: aiImageCount,
      textCards: textCardCount,
      totalCost,
      totalTimeMs
    });

    const output: AssetOutput = {
      contentId,
      assets,
      totalImages: aiImageCount,
      textCards: textCardCount,
      outputDir: assetDir,
      generatedAt: new Date(),
      totalCost,
      totalTimeMs
    };

    return AssetOutputSchema.parse(output);
  }

  /**
   * Generate asset for a single segment
   */
  private async generateSegmentAsset(
    segment: ScriptSegment,
    segmentIndex: number,
    outputDir: string,
    niche: string
  ): Promise<GeneratedAsset> {
    const filename = `segment_${segmentIndex + 1}_${segment.visualType}.png`;
    const outputPath = path.join(outputDir, filename);

    // Use mock mode for testing
    if (this.config.mockMode) {
      return this.generateMockAsset(segment, segmentIndex, outputPath);
    }

    let result: ImageGenerationResult;

    switch (segment.visualType) {
      case 'ai_image':
        result = await generateImage(
          segment.visualDescription,
          outputPath,
          niche
        );
        break;

      case 'text_card':
        // Generate text card with the text overlay content
        const textContent = segment.textOverlay || segment.narration.slice(0, 50);
        result = await createTextCard(textContent, outputPath);
        break;

      case 'stock':
        // For stock images, generate an AI image as placeholder
        // In production, this would fetch from a stock API
        result = await generateImage(
          segment.visualDescription,
          outputPath,
          niche
        );
        break;

      default:
        throw new Error(`Unknown visual type: ${segment.visualType}`);
    }

    return {
      segmentIndex,
      timestamp: segment.timestamp,
      type: segment.visualType,
      localPath: result.localPath,
      width: result.width,
      height: result.height,
      duration: segment.duration,
      prompt: result.prompt,
      seed: result.seed,
      generationTimeMs: result.generationTimeMs
    };
  }

  /**
   * Generate mock asset for testing
   */
  private generateMockAsset(
    segment: ScriptSegment,
    segmentIndex: number,
    outputPath: string
  ): GeneratedAsset {
    // Create a simple placeholder file in mock mode
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write minimal PNG placeholder (1x1 pixel)
    const minimalPng = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x08, 0xD7, 0x63, 0x60, 0x60, 0x60, 0x00,
      0x00, 0x00, 0x04, 0x00, 0x01, 0x5C, 0xCD, 0xFF,
      0xA2, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
      0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    fs.writeFileSync(outputPath, minimalPng);

    return {
      segmentIndex,
      timestamp: segment.timestamp,
      type: segment.visualType,
      localPath: outputPath,
      width: 1080,
      height: 1920,
      duration: segment.duration,
      prompt: `[MOCK] ${segment.visualDescription}`,
      seed: 12345,
      generationTimeMs: 50  // Simulated fast generation
    };
  }

  /**
   * Get cost for asset type
   */
  private getAssetCost(type: string): number {
    switch (type) {
      case 'ai_image':
        return 0.02;  // Flux Pro cost
      case 'text_card':
        return 0.015; // Simpler generation
      case 'stock':
        return 0.02;  // Using AI as fallback
      default:
        return 0.02;
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createAssetAgent(config?: Partial<AssetAgentConfig>): AssetAgent {
  return new AssetAgent(config);
}

// Re-export types
export * from './schema';
export { ImageGenerationResult } from './providers';
