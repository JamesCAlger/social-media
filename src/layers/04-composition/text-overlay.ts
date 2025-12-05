/**
 * Text Overlay Module for Video Composition
 * Uses FFmpeg to add text overlays to videos
 */

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../core/logger';
import { TextOverlays } from '../../core/types';
import {
  TextOverlayConfig,
  TextPosition,
  TextAnimation,
  getFontPath,
  getTextOverlayConfig,
} from '../../config/text-overlay';

const execAsync = promisify(exec);

// Video dimensions for 720p 9:16 vertical
const VIDEO_WIDTH = 720;
const VIDEO_HEIGHT = 1280;

/**
 * Maps position names to FFmpeg x/y coordinates
 */
function getPositionCoordinates(position: TextPosition): { x: string; y: string } {
  const positions: Record<TextPosition, { x: string; y: string }> = {
    'top-left': { x: '50', y: '80' },
    'top-center': { x: '(w-text_w)/2', y: '80' },
    'top-right': { x: 'w-text_w-50', y: '80' },
    'center-left': { x: '50', y: '(h-text_h)/2' },
    'center': { x: '(w-text_w)/2', y: '(h-text_h)/2' },
    'center-right': { x: 'w-text_w-50', y: '(h-text_h)/2' },
    'bottom-left': { x: '50', y: 'h-text_h-150' },
    'bottom-center': { x: '(w-text_w)/2', y: 'h-text_h-150' },
    'bottom-right': { x: 'w-text_w-50', y: 'h-text_h-150' },
  };
  return positions[position];
}

/**
 * Converts percentage-based font size to pixels
 */
function fontSizeToPixels(percentage: number): number {
  return Math.round((percentage / 100) * VIDEO_HEIGHT);
}

/**
 * Converts text to Title Case (capitalizes first letter of each word)
 */
function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Escapes text for FFmpeg drawtext filter
 * FFmpeg drawtext requires special character escaping
 */
function escapeTextForFFmpeg(text: string): string {
  return text
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/:/g, '\\:') // Escape colons
    .replace(/\[/g, '\\[') // Escape brackets
    .replace(/\]/g, '\\]');
}

/**
 * Escapes a file path for FFmpeg on Windows
 * Handles the drive letter colon properly (C: -> C\:)
 */
function escapePathForFFmpeg(filePath: string): string {
  // Convert to forward slashes
  let escaped = filePath.replace(/\\/g, '/');
  // Escape colons in drive letter (C: -> C\:)
  // The backslash before colon is needed for FFmpeg filter parsing
  escaped = escaped.replace(/^([A-Za-z]):/, '$1\\:');
  return escaped;
}

/**
 * Builds the alpha expression for fade animations
 */
function buildAlphaExpression(
  animation: TextAnimation,
  fadeDuration: number,
  clipDuration: number
): string {
  if (animation === 'none') {
    return '1';
  }

  const fadeIn = `min(t/${fadeDuration},1)`;
  const fadeOut = `min((${clipDuration}-t)/${fadeDuration},1)`;

  switch (animation) {
    case 'fade-in':
      return fadeIn;
    case 'fade-out':
      return fadeOut;
    case 'fade-both':
      return `${fadeIn}*${fadeOut}`;
    default:
      return '1';
  }
}

/**
 * Generates an intro clip with text overlay
 * Supports video background with dark overlay or solid color background
 * Text format: [ASMR prefix] / [Intro Text] / [Subtext]
 */
export async function generateIntroClip(
  textOverlays: TextOverlays,
  outputPath: string,
  config: TextOverlayConfig = getTextOverlayConfig(),
  backgroundVideoPath?: string
): Promise<string> {
  const { intro } = config;

  if (!intro.enabled) {
    logger.info('Intro clip disabled, skipping');
    return '';
  }

  logger.info('Generating intro clip', {
    text: textOverlays.introText,
    duration: intro.duration,
    useVideoBackground: intro.useVideoBackground && !!backgroundVideoPath,
  });

  // Escape font path for FFmpeg filter
  const fontPath = escapePathForFFmpeg(getFontPath(intro.font, config));
  const prefixFontSize = fontSizeToPixels(intro.titlePrefixFontSize);
  const fontSize = fontSizeToPixels(intro.fontSize);
  const subtextFontSize = fontSizeToPixels(intro.subtextFontSize);
  const alphaExpr = buildAlphaExpression(intro.animation, intro.fadeDuration, intro.duration);

  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // Normalize output path for FFmpeg (use forward slashes)
  const normalizedOutput = outputPath.replace(/\\/g, '/');

  // Calculate vertical positions for centered multi-line text
  // Layout: [prefix] - [gap] - [main text] - [gap] - [subtext]
  const gap = 15; // pixels between lines
  const totalTextHeight = prefixFontSize + gap + fontSize + (textOverlays.introSubtext ? gap + subtextFontSize : 0);
  const startY = `(h-${totalTextHeight})/2`;

  // Build text filters
  const filters: string[] = [];

  // Add dark overlay if using video background
  if (intro.useVideoBackground && backgroundVideoPath) {
    const overlayOpacity = intro.backgroundOverlayOpacity;
    filters.push(`drawbox=x=0:y=0:w=iw:h=ih:color=black@${overlayOpacity}:t=fill`);
  }

  // 1. Title prefix (e.g., "ASMR") - top line
  if (intro.titlePrefix) {
    const escapedPrefix = escapeTextForFFmpeg(intro.titlePrefix);
    filters.push(
      `drawtext=fontfile='${fontPath}':text='${escapedPrefix}':fontcolor=${intro.textColor}:fontsize=${prefixFontSize}:x=(w-text_w)/2:y=${startY}:alpha='${alphaExpr}'`
    );
  }

  // 2. Main intro text (e.g., "History Unmasked") - middle line, converted to Title Case
  const escapedIntroText = escapeTextForFFmpeg(toTitleCase(textOverlays.introText));
  const mainTextY = intro.titlePrefix
    ? `${startY}+${prefixFontSize + gap}`
    : startY;
  filters.push(
    `drawtext=fontfile='${fontPath}':text='${escapedIntroText}':fontcolor=${intro.textColor}:fontsize=${fontSize}:x=(w-text_w)/2:y=${mainTextY}:alpha='${alphaExpr}'`
  );

  // 3. Subtext (e.g., "ancient whispers") - bottom line
  if (textOverlays.introSubtext) {
    const escapedSubtext = escapeTextForFFmpeg(textOverlays.introSubtext);
    const subtextY = intro.titlePrefix
      ? `${startY}+${prefixFontSize + gap + fontSize + gap}`
      : `${startY}+${fontSize + gap}`;
    filters.push(
      `drawtext=fontfile='${fontPath}':text='${escapedSubtext}':fontcolor=${intro.textColor}@0.7:fontsize=${subtextFontSize}:x=(w-text_w)/2:y=${subtextY}:alpha='${alphaExpr}'`
    );
  }

  const videoFilter = filters.join(',');

  let ffmpegCmd: string;

  if (intro.useVideoBackground && backgroundVideoPath) {
    // Use video as background - loop it for the intro duration
    const normalizedBgPath = backgroundVideoPath.replace(/\\/g, '/');
    ffmpegCmd = [
      'ffmpeg',
      '-y',
      '-stream_loop', '-1', // Loop the video
      '-i', `"${normalizedBgPath}"`,
      '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
      '-vf', `"scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=increase,crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT},${videoFilter}"`,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-shortest',
      '-t', intro.duration.toString(),
      `"${normalizedOutput}"`,
    ].join(' ');
  } else {
    // Use solid color background (fallback)
    const colorInput = `color=c=${intro.backgroundColor}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:d=${intro.duration}:r=30`;
    const audioInput = 'anullsrc=r=44100:cl=stereo';
    ffmpegCmd = [
      'ffmpeg',
      '-y',
      '-f', 'lavfi', '-i', `"${colorInput}"`,
      '-f', 'lavfi', '-i', `"${audioInput}"`,
      '-vf', `"${videoFilter}"`,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-shortest',
      '-t', intro.duration.toString(),
      `"${normalizedOutput}"`,
    ].join(' ');
  }

  logger.debug('FFmpeg intro command', { cmd: ffmpegCmd });

  try {
    const { stderr } = await execAsync(ffmpegCmd, { maxBuffer: 10 * 1024 * 1024 });
    logger.debug('FFmpeg output', { stderr: stderr.slice(-500) });
    logger.info('Intro clip generated', { outputPath });
    return outputPath;
  } catch (error) {
    const err = error as Error & { stderr?: string };
    logger.error('Failed to generate intro clip', {
      error: err.message,
      stderr: err.stderr?.slice(-500),
    });
    throw error;
  }
}

/**
 * Applies text overlay to a video segment
 */
export async function applySegmentLabel(
  inputPath: string,
  outputPath: string,
  label: string,
  segmentDuration: number,
  config: TextOverlayConfig = getTextOverlayConfig()
): Promise<string> {
  const { segmentLabels } = config;

  if (!segmentLabels.enabled) {
    // Just copy the file
    await fs.copyFile(inputPath, outputPath);
    return outputPath;
  }

  logger.info('Applying segment label', { label, inputPath });

  // Normalize paths for FFmpeg on Windows
  const normalizedInputPath = inputPath.replace(/\\/g, '/');
  const normalizedOutputPath = outputPath.replace(/\\/g, '/');
  const fontPath = escapePathForFFmpeg(getFontPath(segmentLabels.font, config));

  const fontSize = fontSizeToPixels(segmentLabels.fontSize);
  const { x, y } = getPositionCoordinates(segmentLabels.position);
  const escapedLabel = escapeTextForFFmpeg(label);

  // Calculate timing based on config
  let enableExpr: string;
  switch (segmentLabels.timing) {
    case 'start':
      enableExpr = `between(t,0,${segmentLabels.displayDuration})`;
      break;
    case 'end':
      enableExpr = `between(t,${segmentDuration - segmentLabels.displayDuration},${segmentDuration})`;
      break;
    case 'full-duration':
    default:
      enableExpr = `between(t,0,${segmentDuration})`;
  }

  // Build alpha expression with timing
  const baseDuration =
    segmentLabels.timing === 'full-duration'
      ? segmentDuration
      : segmentLabels.displayDuration;
  const alphaExpr = buildAlphaExpression(
    segmentLabels.animation,
    segmentLabels.fadeDuration,
    baseDuration
  );

  // Build filter - with optional background box
  let drawTextFilter = `drawtext=fontfile='${fontPath}':text='${escapedLabel}':fontcolor=${segmentLabels.textColor}:fontsize=${fontSize}:x=${x}:y=${y}:enable='${enableExpr}':alpha='${alphaExpr}'`;

  // Add background box if configured
  if (segmentLabels.backgroundColor && segmentLabels.backgroundOpacity > 0) {
    drawTextFilter += `:box=1:boxcolor=${segmentLabels.backgroundColor}@${segmentLabels.backgroundOpacity}:boxborderw=${segmentLabels.padding}`;
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(normalizedInputPath)
      .videoFilters(drawTextFilter)
      .outputOptions([
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'copy', // Preserve audio
      ])
      .output(normalizedOutputPath)
      .on('start', (cmd) => {
        logger.debug('FFmpeg segment label command', { cmd });
      })
      .on('end', () => {
        logger.info('Segment label applied', { outputPath });
        resolve(outputPath);
      })
      .on('error', (err) => {
        logger.error('Failed to apply segment label', { error: err.message });
        reject(err);
      })
      .run();
  });
}

/**
 * Full composition with intro and segment labels
 * Orchestrates the complete text overlay process
 */
export async function composeWithTextOverlays(
  inputVideos: string[],
  textOverlays: TextOverlays,
  outputDir: string,
  config: TextOverlayConfig = getTextOverlayConfig()
): Promise<{
  processedVideos: string[];
  introClip: string | null;
}> {
  if (!config.enabled) {
    logger.info('Text overlays disabled, returning original videos');
    return {
      processedVideos: inputVideos,
      introClip: null,
    };
  }

  const processedVideos: string[] = [];
  let introClip: string | null = null;

  // 1. Generate intro clip (use last video as background to avoid repetition with first segment)
  if (config.intro.enabled) {
    const introPath = path.join(outputDir, 'intro.mp4');
    const backgroundVideo = config.intro.useVideoBackground && inputVideos.length > 0
      ? inputVideos[inputVideos.length - 1]  // Use last video to avoid repetition
      : undefined;
    introClip = await generateIntroClip(textOverlays, introPath, config, backgroundVideo);
  }

  // 2. Apply segment labels to each video
  if (config.segmentLabels.enabled && textOverlays.segmentLabels.length === inputVideos.length) {
    for (let i = 0; i < inputVideos.length; i++) {
      const inputPath = inputVideos[i];
      const label = textOverlays.segmentLabels[i];
      const outputPath = path.join(outputDir, `segment_${i + 1}_labeled.mp4`);

      const processedPath = await applySegmentLabel(
        inputPath,
        outputPath,
        label,
        5, // 5-second segments
        config
      );
      processedVideos.push(processedPath);
    }
  } else {
    // No labels or mismatch - use original videos
    processedVideos.push(...inputVideos);
  }

  return {
    processedVideos,
    introClip,
  };
}

/**
 * Concatenates intro and video segments into final output
 */
export async function concatenateWithIntro(
  introClip: string | null,
  videoSegments: string[],
  outputPath: string
): Promise<string> {
  const allVideos = introClip ? [introClip, ...videoSegments] : videoSegments;

  if (allVideos.length === 0) {
    throw new Error('No videos to concatenate');
  }

  if (allVideos.length === 1) {
    await fs.copyFile(allVideos[0], outputPath);
    return outputPath;
  }

  logger.info('Concatenating videos', {
    count: allVideos.length,
    hasIntro: !!introClip,
  });

  // Create concat file
  const concatDir = path.dirname(outputPath);
  const concatFilePath = path.join(concatDir, 'concat_with_intro.txt');
  const concatContent = allVideos.map((file) => `file '${file.replace(/\\/g, '/')}'`).join('\n');
  await fs.writeFile(concatFilePath, concatContent);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatFilePath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-c:a aac',
        '-b:a 128k',
      ])
      .output(outputPath)
      .on('start', (cmd) => {
        logger.debug('FFmpeg concat command', { cmd });
      })
      .on('end', async () => {
        // Clean up concat file
        await fs.unlink(concatFilePath).catch(() => {});
        logger.info('Videos concatenated', { outputPath });
        resolve(outputPath);
      })
      .on('error', (err) => {
        logger.error('Failed to concatenate videos', { error: err.message });
        reject(err);
      })
      .run();
  });
}
