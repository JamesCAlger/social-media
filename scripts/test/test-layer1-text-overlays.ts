/**
 * Test Script: Layer 1 Text Overlay Generation
 * Tests that the LLM generates proper text overlay content
 */

import dotenv from 'dotenv';
dotenv.config();

import { createIdeaProvider } from '../src/layers/01-idea-generation/providers';
import { IdeaOutputSchema } from '../src/layers/01-idea-generation/schema';

async function testLayer1TextOverlays() {
  console.log('=== Testing Layer 1: Text Overlay Generation ===\n');

  // Use OpenAI as default (matching config)
  const provider = createIdeaProvider('openai', 'gpt-4', 0.8);

  console.log('Generating idea with text overlays...\n');

  try {
    const idea = await provider.generateIdea();

    console.log('Generated Idea:');
    console.log('---------------');
    console.log(`ID: ${idea.id}`);
    console.log(`Idea: ${idea.idea}`);
    console.log(`Cultural Context: ${idea.culturalContext}`);
    console.log(`Environment: ${idea.environment}`);
    console.log(`Sound: ${idea.soundConcept}`);
    console.log('\nText Overlays:');
    console.log(`  Intro Text: "${idea.textOverlays.introText}"`);
    console.log(`  Intro Subtext: "${idea.textOverlays.introSubtext || '(none)'}"`);
    console.log(`  Segment Labels: [${idea.textOverlays.segmentLabels.map(l => `"${l}"`).join(', ')}]`);
    console.log('\nCaption (truncated):');
    console.log(`  ${idea.caption.substring(0, 100)}...`);

    // Validate against schema
    console.log('\n=== Validating against schema ===');
    const validated = IdeaOutputSchema.safeParse(idea);

    if (validated.success) {
      console.log('Schema validation: PASSED');
    } else {
      console.log('Schema validation: FAILED');
      console.log('Errors:', validated.error.errors);
    }

    // Check text overlay specifics
    console.log('\n=== Text Overlay Checks ===');
    const checks = [
      {
        name: 'Intro text length',
        pass: idea.textOverlays.introText.length <= 50,
        value: `${idea.textOverlays.introText.length} chars (max 50)`,
      },
      {
        name: 'Segment labels count',
        pass: idea.textOverlays.segmentLabels.length === 3,
        value: `${idea.textOverlays.segmentLabels.length} labels (expected 3)`,
      },
      {
        name: 'Segment labels max length',
        pass: idea.textOverlays.segmentLabels.every(l => l.length <= 20),
        value: idea.textOverlays.segmentLabels.map(l => `${l.length}`).join(', ') + ' chars',
      },
      {
        name: 'Intro text is lowercase',
        pass: idea.textOverlays.introText === idea.textOverlays.introText.toLowerCase(),
        value: idea.textOverlays.introText,
      },
    ];

    checks.forEach(check => {
      const status = check.pass ? 'PASS' : 'WARN';
      console.log(`  [${status}] ${check.name}: ${check.value}`);
    });

    console.log('\n=== Test Complete ===');
    console.log('Estimated cost:', provider.estimateCost().toFixed(4));

    return idea;
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

testLayer1TextOverlays()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
