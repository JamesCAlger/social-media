/**
 * Quality Loop
 *
 * Orchestrates the Generate → Critique → Refine cycle until
 * the script passes quality threshold or max iterations reached.
 *
 * Flow:
 * 1. Generate initial script from topic
 * 2. Evaluate with Critic
 * 3. If score < target, Refine based on feedback
 * 4. Re-evaluate
 * 5. Repeat until passed or max iterations
 */

import { logger } from '../../core/logger';
import { GeneratorAgent, createGeneratorAgent } from '../generator';
import { CriticAgent, createCriticAgent } from '../critic';
import { RefinerAgent, createRefinerAgent } from '../refiner';
import { Script, ScriptMetadata } from '../generator/schema';
import { CriticOutput } from '../critic/schema';
import { RefinerOutput, ChangeLog } from '../refiner/schema';
import {
  QualityLoopInput,
  QualityLoopInputSchema,
  QualityLoopOutput,
  QualityLoopOutputSchema,
  IterationRecord
} from './schema';

// ============================================================================
// Configuration
// ============================================================================

interface QualityLoopConfig {
  generator: GeneratorAgent;
  critic: CriticAgent;
  refiner: RefinerAgent;
}

// ============================================================================
// Quality Loop
// ============================================================================

export class QualityLoop {
  private generator: GeneratorAgent;
  private critic: CriticAgent;
  private refiner: RefinerAgent;

  constructor(config: QualityLoopConfig) {
    this.generator = config.generator;
    this.critic = config.critic;
    this.refiner = config.refiner;
  }

  /**
   * Execute the quality loop
   */
  async execute(input: QualityLoopInput): Promise<QualityLoopOutput> {
    const startTime = Date.now();

    // Validate input
    const validatedInput = QualityLoopInputSchema.parse(input);
    const { topic, niche, targetScore, maxIterations } = validatedInput;

    logger.info('Quality Loop starting', {
      topic: topic.topic,
      targetScore,
      maxIterations
    });

    const iterations: IterationRecord[] = [];
    const scoreProgression: number[] = [];
    let totalCost = 0;

    let currentScript: Script | null = null;
    let currentMetadata: ScriptMetadata | null = null;
    let currentCriticOutput: CriticOutput | null = null;
    let passed = false;

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      const iterationStartTime = Date.now();

      logger.info(`Quality Loop iteration ${iteration}/${maxIterations}`);

      try {
        // Step 1: Generate or Refine
        if (iteration === 1) {
          // First iteration: Generate from scratch
          logger.info('Generating initial script...');
          const generatorOutput = await this.generator.execute({
            topic,
            niche
          });

          currentScript = generatorOutput.script;
          currentMetadata = generatorOutput.metadata;
          totalCost += generatorOutput.cost;

          logger.info('Initial script generated', {
            title: currentScript.title,
            hookStyle: currentScript.hookStyle
          });
        } else {
          // Subsequent iterations: Refine based on feedback
          logger.info('Refining script based on feedback...');
          const refinerOutput = await this.refiner.execute({
            script: currentScript!,
            metadata: currentMetadata!,
            criticFeedback: currentCriticOutput!,
            niche,
            iterationNumber: iteration
          });

          currentScript = refinerOutput.refinedScript;
          currentMetadata = refinerOutput.refinedMetadata;
          totalCost += refinerOutput.cost;

          logger.info('Script refined', {
            changesMade: refinerOutput.changesMade.length,
            addressedIssues: refinerOutput.addressedIssues.length
          });
        }

        // Step 2: Evaluate with Critic
        logger.info('Evaluating script...');
        currentCriticOutput = await this.critic.execute({
          script: currentScript!,
          metadata: currentMetadata!,
          niche,
          iterationNumber: iteration
        });

        totalCost += currentCriticOutput.cost;
        scoreProgression.push(currentCriticOutput.overallScore);

        logger.info('Evaluation complete', {
          score: currentCriticOutput.overallScore,
          passed: currentCriticOutput.passed,
          criticalIssues: currentCriticOutput.criticalIssues.length
        });

        // Record this iteration
        const iterationDuration = Date.now() - iterationStartTime;
        iterations.push({
          iteration,
          script: currentScript!,
          metadata: currentMetadata!,
          criticOutput: currentCriticOutput,
          changesMade: iteration > 1 ? [] : undefined, // Would need to track from refiner
          durationMs: iterationDuration
        });

        // Check if passed
        if (currentCriticOutput.overallScore >= targetScore &&
            !currentCriticOutput.criticalIssues.some(i => i.severity === 'critical')) {
          passed = true;
          logger.info('Quality threshold met!', {
            finalScore: currentCriticOutput.overallScore,
            iterations: iteration
          });
          break;
        }

        // If not passed and more iterations available, continue
        if (iteration < maxIterations) {
          logger.info('Quality threshold not met, refining...', {
            currentScore: currentCriticOutput.overallScore,
            targetScore,
            remainingIterations: maxIterations - iteration
          });
        }

      } catch (error) {
        logger.error(`Quality Loop iteration ${iteration} failed`, {
          error: (error as Error).message
        });
        throw error;
      }
    }

    const totalDuration = Date.now() - startTime;

    // Log final result
    if (passed) {
      logger.info('Quality Loop completed successfully', {
        finalScore: currentCriticOutput!.overallScore,
        totalIterations: iterations.length,
        totalCost,
        totalDuration: `${(totalDuration / 1000).toFixed(2)}s`
      });
    } else {
      logger.warn('Quality Loop exhausted iterations without passing', {
        finalScore: currentCriticOutput!.overallScore,
        targetScore,
        totalIterations: iterations.length,
        totalCost
      });
    }

    const output: QualityLoopOutput = {
      finalScript: currentScript!,
      finalMetadata: currentMetadata!,
      finalScore: currentCriticOutput!.overallScore,
      passed,
      iterations,
      totalIterations: iterations.length,
      scoreProgression,
      totalCost,
      totalDurationMs: totalDuration,
      completedAt: new Date()
    };

    return QualityLoopOutputSchema.parse(output);
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createQualityLoop(): QualityLoop {
  return new QualityLoop({
    generator: createGeneratorAgent(),
    critic: createCriticAgent(),
    refiner: createRefinerAgent()
  });
}

// Re-export types
export * from './schema';
