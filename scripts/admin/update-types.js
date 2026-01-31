const fs = require('fs');
const path = 'src/core/types.ts';
let content = fs.readFileSync(path, 'utf8');

// Add HookStyle type after NicheType
const nicheTypeLine = "export type NicheType = 'asmr_pottery' | 'oddly_satisfying' | 'nature_sounds' | 'craft_process' | 'cute_fruits_asmr' | 'custom';";

const hookStyleType = `export type NicheType = 'asmr_pottery' | 'oddly_satisfying' | 'nature_sounds' | 'craft_process' | 'cute_fruits_asmr' | 'custom';

/**
 * Hook styles for the first few seconds of video
 * Based on viral ASMR content research
 */
export type HookStyle =
  | 'immediate_action'    // No text, start mid-slice, pure visual/sound
  | 'wait_for_it'         // "Wait for it..." text, build anticipation
  | 'question'            // "Why is this so satisfying?" engagement hook
  | 'result_first'        // Show gems spilling out first, then the slice
  | 'mystery'             // "What's inside this crystal fruit?"
  | 'sound_focus'         // "Turn your sound on" text overlay
  | 'guess_the_color'     // "Guess the color inside" - engagement hook
  | 'visual'              // Pure visual hook (legacy)
  | 'text_overlay';       // Generic text overlay (legacy)`;

if (content.includes(nicheTypeLine) && !content.includes('export type HookStyle')) {
  content = content.replace(nicheTypeLine, hookStyleType);
  fs.writeFileSync(path, content);
  console.log('Added HookStyle type');
} else if (content.includes('export type HookStyle')) {
  console.log('HookStyle type already exists');
} else {
  console.log('Could not find NicheType line to replace');
}
