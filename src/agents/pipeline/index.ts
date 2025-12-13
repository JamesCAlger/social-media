/**
 * Educational Content Pipeline
 *
 * Orchestrates the full content generation flow:
 * 1. Research - Find topic (or use provided topic)
 * 2. Quality Loop - Generate → Critique → Refine until quality threshold
 * 3. Assets - Generate images for each segment
 * 4. Audio - Generate voiceover
 * 5. Compose - Create final video
 * 6. Review - Prepare for human approval
 *
 * All content requires human approval before posting.
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../core/logger';
import { TopicSuggestion } from '../research/schema';
import { createQualityLoop, QualityLoopOutput } from '../quality-loop';
import { createAssetAgent, AssetOutput } from '../asset';
import { createAudioAgent, AudioOutput } from '../audio';
import { createComposerAgent, ComposerOutput } from '../composer';
import {
  PipelineInput,
  PipelineInputSchema,
  PipelineOutput,
  PipelineOutputSchema,
  PipelineConfig,
  PipelineConfigSchema,
  StageResult,
  ReviewRequest
} from './schema';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: PipelineConfig = {
  niche: 'finance',
  targetQualityScore: 80,
  maxQualityIterations: 3,
  mockMode: false,
  outputBaseDir: './content'
};

// ============================================================================
// Pipeline
// ============================================================================

export class EducationalPipeline {
  private config: PipelineConfig;

  // Agents (lazy initialized)
  private _qualityLoop: ReturnType<typeof createQualityLoop> | null = null;
  private _assetAgent: ReturnType<typeof createAssetAgent> | null = null;
  private _audioAgent: ReturnType<typeof createAudioAgent> | null = null;
  private _composerAgent: ReturnType<typeof createComposerAgent> | null = null;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = PipelineConfigSchema.parse({ ...DEFAULT_CONFIG, ...config });
  }

  private get qualityLoop() {
    if (!this._qualityLoop) {
      this._qualityLoop = createQualityLoop();
    }
    return this._qualityLoop;
  }

  private get assetAgent() {
    if (!this._assetAgent) {
      this._assetAgent = createAssetAgent({ mockMode: this.config.mockMode });
    }
    return this._assetAgent;
  }

  private get audioAgent() {
    if (!this._audioAgent) {
      this._audioAgent = createAudioAgent({ mockMode: this.config.mockMode });
    }
    return this._audioAgent;
  }

  private get composerAgent() {
    if (!this._composerAgent) {
      this._composerAgent = createComposerAgent({ mockMode: this.config.mockMode });
    }
    return this._composerAgent;
  }

  /**
   * Execute the full pipeline
   */
  async execute(input: PipelineInput): Promise<PipelineOutput> {
    const startTime = Date.now();
    const contentId = uuidv4();

    // Validate and merge input
    const validatedInput = PipelineInputSchema.parse(input);
    const niche = validatedInput.niche || this.config.niche;

    logger.info('Educational Pipeline starting', {
      contentId,
      niche,
      mockMode: this.config.mockMode,
      targetQualityScore: this.config.targetQualityScore
    });

    const stageResults: StageResult[] = [];
    let totalCost = 0;

    try {
      // ========================================
      // Stage 1: Research (or use provided topic)
      // ========================================
      let topic: TopicSuggestion;

      if (validatedInput.topic) {
        topic = validatedInput.topic;
        logger.info('Using provided topic', { topic: topic.topic });
        stageResults.push({
          stage: 'research',
          success: true,
          durationMs: 0,
          cost: 0
        });
      } else {
        // Research requires API keys and database - throw error in mock mode
        throw new Error('Topic must be provided when running pipeline. Research Agent requires API keys and database connection.');
      }

      // ========================================
      // Stage 2: Quality Loop (Generate → Critique → Refine)
      // ========================================
      const qualityStart = Date.now();
      logger.info('Stage 2: Quality Loop - Generating and refining script');

      const qualityOutput: QualityLoopOutput = await this.qualityLoop.execute({
        topic,
        niche,
        targetScore: this.config.targetQualityScore,
        maxIterations: this.config.maxQualityIterations
      });

      const qualityDuration = Date.now() - qualityStart;
      totalCost += qualityOutput.totalCost;

      stageResults.push({
        stage: 'quality_loop',
        success: qualityOutput.passed,
        durationMs: qualityDuration,
        cost: qualityOutput.totalCost
      });

      logger.info('Quality Loop complete', {
        finalScore: qualityOutput.finalScore,
        iterations: qualityOutput.totalIterations,
        passed: qualityOutput.passed
      });

      // ========================================
      // Stage 3: Asset Generation
      // ========================================
      const assetStart = Date.now();
      logger.info('Stage 3: Asset Agent - Generating images');

      const assetOutput: AssetOutput = await this.assetAgent.execute({
        script: qualityOutput.finalScript,
        contentId,
        niche
      });

      const assetDuration = Date.now() - assetStart;
      totalCost += assetOutput.totalCost;

      stageResults.push({
        stage: 'assets',
        success: true,
        durationMs: assetDuration,
        cost: assetOutput.totalCost
      });

      logger.info('Assets complete', {
        totalImages: assetOutput.totalImages,
        textCards: assetOutput.textCards,
        cost: assetOutput.totalCost
      });

      // ========================================
      // Stage 4: Audio Generation
      // ========================================
      const audioStart = Date.now();
      logger.info('Stage 4: Audio Agent - Generating voiceover');

      const audioOutput: AudioOutput = await this.audioAgent.execute({
        script: qualityOutput.finalScript,
        contentId,
        niche
      });

      const audioDuration = Date.now() - audioStart;
      totalCost += audioOutput.totalCost;

      stageResults.push({
        stage: 'audio',
        success: true,
        durationMs: audioDuration,
        cost: audioOutput.totalCost
      });

      logger.info('Audio complete', {
        duration: audioOutput.voiceover.duration,
        cost: audioOutput.totalCost
      });

      // ========================================
      // Stage 5: Video Composition
      // ========================================
      const composeStart = Date.now();
      logger.info('Stage 5: Composer Agent - Creating final video');

      const composerOutput: ComposerOutput = await this.composerAgent.execute({
        script: qualityOutput.finalScript,
        assets: assetOutput,
        audio: audioOutput,
        contentId
      });

      const composeDuration = Date.now() - composeStart;
      totalCost += composerOutput.totalCost;

      stageResults.push({
        stage: 'compose',
        success: true,
        durationMs: composeDuration,
        cost: composerOutput.totalCost
      });

      logger.info('Composition complete', {
        duration: composerOutput.finalVideo.duration,
        fileSize: composerOutput.finalVideo.fileSize
      });

      // ========================================
      // Stage 6: Prepare for Review
      // ========================================
      const reviewFlags = this.checkForReviewFlags(
        qualityOutput,
        topic
      );

      const totalDurationMs = Date.now() - startTime;

      logger.info('Pipeline complete', {
        contentId,
        totalCost,
        totalDuration: `${(totalDurationMs / 1000).toFixed(2)}s`,
        qualityScore: qualityOutput.finalScore,
        reviewFlags: reviewFlags.length
      });

      const output: PipelineOutput = {
        contentId,
        niche,
        topic,
        script: qualityOutput.finalScript,
        scriptMetadata: qualityOutput.finalMetadata,
        qualityScore: qualityOutput.finalScore,
        qualityIterations: qualityOutput.totalIterations,
        finalVideo: composerOutput.finalVideo,
        videoR2Url: composerOutput.finalVideo.r2Url,
        stageResults,
        totalCost,
        totalDurationMs,
        generatedAt: new Date(),
        status: 'pending_review',
        reviewFlags
      };

      return PipelineOutputSchema.parse(output);

    } catch (error) {
      const totalDurationMs = Date.now() - startTime;

      logger.error('Pipeline failed', {
        contentId,
        error: (error as Error).message,
        totalDuration: `${(totalDurationMs / 1000).toFixed(2)}s`,
        completedStages: stageResults.filter(s => s.success).length
      });

      throw error;
    }
  }

  /**
   * Check for content that needs extra review attention
   */
  private checkForReviewFlags(
    qualityOutput: QualityLoopOutput,
    topic: TopicSuggestion
  ): string[] {
    const flags: string[] = [];

    // Low quality score
    if (qualityOutput.finalScore < 75) {
      flags.push('Low quality score - review carefully');
    }

    // Multiple iterations needed
    if (qualityOutput.totalIterations >= 3) {
      flags.push('Required multiple refinement iterations');
    }

    // Low confidence topic
    if (topic.confidence < 70) {
      flags.push('Topic has lower confidence score');
    }

    // Controversial content detection (basic)
    const script = qualityOutput.finalScript;
    const fullText = [
      script.hook,
      ...script.segments.map(s => s.narration),
      script.cta
    ].join(' ').toLowerCase();

    const controversialPatterns = [
      'scam', 'steal', 'lying', 'exposed', 'they don\'t want you',
      'secret', 'banks are', 'government'
    ];

    if (controversialPatterns.some(p => fullText.includes(p))) {
      flags.push('Contains potentially controversial language');
    }

    return flags;
  }

  /**
   * Create review request for Telegram
   */
  createReviewRequest(output: PipelineOutput): ReviewRequest {
    const priority = output.reviewFlags && output.reviewFlags.length > 0
      ? 'high'
      : output.qualityScore < 80
        ? 'medium'
        : 'low';

    return {
      contentId: output.contentId,
      title: output.script.title,
      hook: output.script.hook,
      duration: output.finalVideo.duration,
      qualityScore: output.qualityScore,
      videoUrl: output.videoR2Url || output.finalVideo.localPath,
      flags: output.reviewFlags || [],
      priority
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createEducationalPipeline(
  config?: Partial<PipelineConfig>
): EducationalPipeline {
  return new EducationalPipeline(config);
}

// Re-export types
export * from './schema';
