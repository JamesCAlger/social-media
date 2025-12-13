/**
 * Brand color palette for Educational Pipeline
 * Use these consistently across ALL visual content
 */

export const brandColors = {
  // Primary backgrounds
  primary: '#1a1a2e',       // Dark navy - main background
  secondary: '#16213e',     // Lighter navy - secondary backgrounds

  // Accent and highlights
  accent: '#e94560',        // Coral/red - emphasis, key numbers, highlights

  // Text colors
  text: '#ffffff',          // White - primary text
  textSecondary: '#a0a0a0', // Gray - secondary text, captions

  // Semantic colors
  success: '#00d9a5',       // Teal - positive numbers, growth indicators
  warning: '#ffc107',       // Amber - warnings, attention

  // Derived colors for gradients/effects
  accentDark: '#c73e54',    // Darker coral for hover/press states
  primaryLight: '#252547',  // Lighter primary for subtle contrast
} as const;

export type BrandColor = keyof typeof brandColors;

/**
 * Get hex color value by name
 */
export function getColor(name: BrandColor): string {
  return brandColors[name];
}

/**
 * Convert hex to RGB for use in image generation prompts
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

/**
 * Color descriptions for AI image prompts
 */
export const colorDescriptions = {
  background: `dark navy background (${brandColors.primary})`,
  accent: `coral accent lighting (${brandColors.accent})`,
  highlights: `coral red highlights (${brandColors.accent})`,
  success: `teal green for growth (${brandColors.success})`,
} as const;
