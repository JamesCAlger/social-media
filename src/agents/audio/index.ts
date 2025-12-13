/**
 * Audio Agent
 *
 * Generates voiceover audio using ElevenLabs voice clone.
 * - Custom voice clone for brand consistency
 * - Niche-specific speed adjustments
 * - Segment timing extraction for video sync
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { logger } from '../../core/logger';
import { Script } from '../generator/schema';
import {
  AudioInput,
  AudioInputSchema,
  AudioOutput,
  AudioOutputSchema,
  VoiceoverResult,
  SegmentTiming
} from './schema';
import {
  VOICE_ID,
  baseVoiceSettings,
  getVoiceSpeed,
  elevenlabsConfig,
  estimateVoiceoverCost
} from './voice-config';

// ============================================================================
// Configuration
// ============================================================================

interface AudioAgentConfig {
  outputBaseDir: string;
  mockMode?: boolean;
  voiceId?: string;
}

const DEFAULT_CONFIG: AudioAgentConfig = {
  outputBaseDir: './content',
  mockMode: false,
  voiceId: VOICE_ID
};

// ============================================================================
// Audio Agent
// ============================================================================

export class AudioAgent {
  private config: AudioAgentConfig;
  private apiKey: string;

  constructor(config: Partial<AudioAgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
  }

  /**
   * Generate voiceover audio for a script
   */
  async execute(input: AudioInput): Promise<AudioOutput> {
    const startTime = Date.now();

    // Validate input
    const validatedInput = AudioInputSchema.parse(input);
    const { script, contentId, niche, outputDir } = validatedInput;

    // Determine output directory
    const audioDir = outputDir || path.join(this.config.outputBaseDir, contentId, 'audio');

    // Ensure directory exists
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    logger.info('Audio Agent starting', {
      contentId,
      segmentCount: script.segments.length,
      niche
    });

    // Combine all narration into a single text
    const fullNarration = this.combineNarration(script);
    const speed = getVoiceSpeed(niche);

    logger.info('Generating voiceover', {
      characterCount: fullNarration.length,
      speed,
      estimatedCost: estimateVoiceoverCost(fullNarration)
    });

    try {
      // Generate voiceover
      const voiceoverPath = path.join(audioDir, 'voiceover.mp3');
      const voiceover = await this.generateVoiceover(
        fullNarration,
        voiceoverPath,
        speed
      );

      // Calculate segment timings based on script durations
      const segmentTimings = this.calculateSegmentTimings(script);

      const totalTimeMs = Date.now() - startTime;

      logger.info('Audio Agent complete', {
        contentId,
        voiceoverDuration: voiceover.duration,
        totalCost: voiceover.cost,
        totalTimeMs
      });

      const output: AudioOutput = {
        contentId,
        voiceover,
        segmentTimings,
        outputDir: audioDir,
        generatedAt: new Date(),
        totalCost: voiceover.cost,
        totalTimeMs
      };

      return AudioOutputSchema.parse(output);

    } catch (error) {
      logger.error('Audio Agent failed', {
        error: (error as Error).message,
        contentId
      });
      throw error;
    }
  }

  /**
   * Combine all narration segments into a single text
   */
  private combineNarration(script: Script): string {
    return script.segments
      .map(seg => seg.narration)
      .join(' ');
  }

  /**
   * Calculate segment timings based on script duration values
   */
  private calculateSegmentTimings(script: Script): SegmentTiming[] {
    const timings: SegmentTiming[] = [];
    let currentTime = 0;

    for (let i = 0; i < script.segments.length; i++) {
      const segment = script.segments[i];
      const startTime = currentTime;
      const endTime = currentTime + segment.duration;

      timings.push({
        segmentIndex: i,
        startTime,
        endTime,
        duration: segment.duration,
        narration: segment.narration
      });

      currentTime = endTime;
    }

    return timings;
  }

  /**
   * Generate voiceover using ElevenLabs
   */
  private async generateVoiceover(
    text: string,
    outputPath: string,
    speed: number
  ): Promise<VoiceoverResult> {
    // Use mock mode for testing
    if (this.config.mockMode) {
      return this.generateMockVoiceover(text, outputPath, speed);
    }

    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const voiceId = this.config.voiceId || VOICE_ID;
    const startTime = Date.now();

    try {
      const response = await axios({
        method: 'post',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        data: {
          text,
          model_id: elevenlabsConfig.modelId,
          voice_settings: {
            stability: baseVoiceSettings.stability,
            similarity_boost: baseVoiceSettings.similarityBoost,
            style: baseVoiceSettings.style,
            use_speaker_boost: baseVoiceSettings.useSpeakerBoost
          }
        },
        responseType: 'arraybuffer'
      });

      // Save audio file
      fs.writeFileSync(outputPath, response.data);

      // Calculate duration (approximate based on text length and speed)
      // In production, you'd use audio metadata
      const baseDuration = text.length / 15;  // ~15 chars per second
      const duration = baseDuration / speed;

      const generationTimeMs = Date.now() - startTime;

      logger.info('ElevenLabs voiceover generated', {
        outputPath,
        duration,
        generationTimeMs,
        characterCount: text.length
      });

      return {
        localPath: outputPath,
        duration,
        provider: 'elevenlabs',
        voiceId,
        isCustomClone: true,
        speed,
        cost: estimateVoiceoverCost(text),
        characterCount: text.length
      };

    } catch (error) {
      logger.error('ElevenLabs API call failed', {
        error: (error as Error).message,
        voiceId
      });
      throw error;
    }
  }

  /**
   * Generate mock voiceover for testing
   */
  private generateMockVoiceover(
    text: string,
    outputPath: string,
    speed: number
  ): VoiceoverResult {
    // Create directory if needed
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create a minimal MP3 file placeholder
    // This is a valid but silent MP3 frame
    const silentMp3 = Buffer.from([
      0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);

    fs.writeFileSync(outputPath, silentMp3);

    // Calculate mock duration
    const baseDuration = text.length / 15;
    const duration = baseDuration / speed;

    return {
      localPath: outputPath,
      duration,
      provider: 'elevenlabs',
      voiceId: 'mock-voice-id',
      isCustomClone: false,
      speed,
      cost: estimateVoiceoverCost(text),
      characterCount: text.length
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createAudioAgent(config?: Partial<AudioAgentConfig>): AudioAgent {
  return new AudioAgent(config);
}

// Re-export types
export * from './schema';
export { getVoiceSpeed, estimateVoiceoverCost } from './voice-config';
