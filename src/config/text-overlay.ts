import path from 'path';

// Text position options for overlays
export type TextPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

// Animation types for text
export type TextAnimation = 'none' | 'fade-in' | 'fade-out' | 'fade-both';

// Intro screen configuration
export interface IntroConfig {
  enabled: boolean;
  duration: number; // seconds
  backgroundColor: string; // hex color (fallback if no video background)
  textColor: string; // hex color
  font: string; // font filename or path
  fontSize: number; // relative to video height (percentage)
  subtextFontSize: number; // for secondary text
  position: TextPosition;
  animation: TextAnimation;
  fadeDuration: number; // seconds for fade animation
  titlePrefix: string; // e.g., "ASMR" - shown above intro text
  titlePrefixFontSize: number; // percentage of video height
  useVideoBackground: boolean; // use frame from video as background
  backgroundOverlayOpacity: number; // 0-1, darkening overlay on video background
}

// Segment label configuration
export interface SegmentLabelConfig {
  enabled: boolean;
  position: TextPosition;
  font: string;
  fontSize: number;
  textColor: string;
  backgroundColor: string; // for pill/box background, empty string for none
  backgroundOpacity: number; // 0-1
  padding: number; // pixels
  animation: TextAnimation;
  fadeDuration: number;
  timing: 'start' | 'full-duration' | 'end'; // when to show the label
  displayDuration: number; // seconds to show (if not full-duration)
}

// Complete text overlay configuration
export interface TextOverlayConfig {
  enabled: boolean;
  intro: IntroConfig;
  segmentLabels: SegmentLabelConfig;
  fontDirectory: string; // path to font files
}

// Default configuration
export const defaultTextOverlayConfig: TextOverlayConfig = {
  enabled: parseBoolEnv('TEXT_OVERLAY_ENABLED', true),

  intro: {
    enabled: parseBoolEnv('TEXT_INTRO_ENABLED', true),
    duration: parseFloatEnv('TEXT_INTRO_DURATION', 2.5),
    backgroundColor: process.env.TEXT_INTRO_BG_COLOR || '#1a1a2e',
    textColor: process.env.TEXT_INTRO_TEXT_COLOR || '#ffffff',
    font: process.env.TEXT_INTRO_FONT || 'Montserrat-Bold.ttf',
    fontSize: parseFloatEnv('TEXT_INTRO_FONT_SIZE', 5.5), // 5.5% of video height (~70px) - fits longer text
    subtextFontSize: parseFloatEnv('TEXT_INTRO_SUBTEXT_SIZE', 3.5),
    position: (process.env.TEXT_INTRO_POSITION as TextPosition) || 'center',
    animation: (process.env.TEXT_INTRO_ANIMATION as TextAnimation) || 'fade-both',
    fadeDuration: parseFloatEnv('TEXT_INTRO_FADE_DURATION', 0.5),
    titlePrefix: process.env.TEXT_INTRO_TITLE_PREFIX || 'ASMR',
    titlePrefixFontSize: parseFloatEnv('TEXT_INTRO_PREFIX_SIZE', 4), // 4% of height (~51px)
    useVideoBackground: parseBoolEnv('TEXT_INTRO_VIDEO_BG', true),
    backgroundOverlayOpacity: parseFloatEnv('TEXT_INTRO_BG_OVERLAY', 0.5),
  },

  segmentLabels: {
    enabled: parseBoolEnv('TEXT_SEGMENT_ENABLED', true),
    position: (process.env.TEXT_SEGMENT_POSITION as TextPosition) || 'bottom-center',
    font: process.env.TEXT_SEGMENT_FONT || 'Montserrat-SemiBold.ttf',
    fontSize: parseFloatEnv('TEXT_SEGMENT_FONT_SIZE', 5),
    textColor: process.env.TEXT_SEGMENT_TEXT_COLOR || '#ffffff',
    backgroundColor: process.env.TEXT_SEGMENT_BG_COLOR || '#000000',
    backgroundOpacity: parseFloatEnv('TEXT_SEGMENT_BG_OPACITY', 0.6),
    padding: parseIntEnv('TEXT_SEGMENT_PADDING', 20),
    animation: (process.env.TEXT_SEGMENT_ANIMATION as TextAnimation) || 'fade-both',
    fadeDuration: parseFloatEnv('TEXT_SEGMENT_FADE_DURATION', 0.3),
    timing: (process.env.TEXT_SEGMENT_TIMING as 'start' | 'full-duration' | 'end') || 'start',
    displayDuration: parseFloatEnv('TEXT_SEGMENT_DISPLAY_DURATION', 2),
  },

  fontDirectory: process.env.TEXT_FONT_DIRECTORY || path.resolve('./assets/fonts'),
};

// Preset configurations for quick styling
export const textOverlayPresets: Record<string, Partial<TextOverlayConfig>> = {
  minimal: {
    intro: {
      ...defaultTextOverlayConfig.intro,
      backgroundColor: '#000000',
      animation: 'fade-both',
      fadeDuration: 0.8,
      useVideoBackground: false,
    },
    segmentLabels: {
      ...defaultTextOverlayConfig.segmentLabels,
      backgroundColor: '',
      backgroundOpacity: 0,
      animation: 'fade-both',
    },
  },

  bold: {
    intro: {
      ...defaultTextOverlayConfig.intro,
      backgroundColor: '#2d3436',
      fontSize: 6,
      animation: 'none',
      useVideoBackground: false,
    },
    segmentLabels: {
      ...defaultTextOverlayConfig.segmentLabels,
      fontSize: 6,
      backgroundColor: '#e17055',
      backgroundOpacity: 0.9,
    },
  },

  elegant: {
    intro: {
      ...defaultTextOverlayConfig.intro,
      backgroundColor: '#2c3e50',
      textColor: '#ecf0f1',
      fontSize: 5.5,
      animation: 'fade-both',
      fadeDuration: 1.0,
      useVideoBackground: true,
      backgroundOverlayOpacity: 0.6,
    },
    segmentLabels: {
      ...defaultTextOverlayConfig.segmentLabels,
      textColor: '#f5f5dc',
      backgroundColor: '#2c3e50',
      backgroundOpacity: 0.7,
      animation: 'fade-both',
      fadeDuration: 0.5,
    },
  },

  modern: {
    intro: {
      ...defaultTextOverlayConfig.intro,
      backgroundColor: '#0f0f0f',
      textColor: '#00d4ff',
      fontSize: 5.5,
      useVideoBackground: true,
      backgroundOverlayOpacity: 0.7,
    },
    segmentLabels: {
      ...defaultTextOverlayConfig.segmentLabels,
      textColor: '#00d4ff',
      backgroundColor: '#0f0f0f',
      backgroundOpacity: 0.8,
      position: 'top-center',
    },
  },
};

// Get configuration with optional preset
export function getTextOverlayConfig(preset?: string): TextOverlayConfig {
  if (preset && textOverlayPresets[preset]) {
    return {
      ...defaultTextOverlayConfig,
      ...textOverlayPresets[preset],
      intro: {
        ...defaultTextOverlayConfig.intro,
        ...textOverlayPresets[preset].intro,
      },
      segmentLabels: {
        ...defaultTextOverlayConfig.segmentLabels,
        ...textOverlayPresets[preset].segmentLabels,
      },
    };
  }
  return defaultTextOverlayConfig;
}

// Helper functions for parsing environment variables
function parseBoolEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function parseFloatEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseIntEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Get font path
export function getFontPath(fontName: string, config: TextOverlayConfig = defaultTextOverlayConfig): string {
  // If it's already an absolute path, return as is
  if (path.isAbsolute(fontName)) {
    return fontName;
  }
  return path.join(config.fontDirectory, fontName);
}
