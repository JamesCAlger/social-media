/**
 * Add a new niche with topic categories
 *
 * Usage:
 *   npx tsx scripts/add-niche.ts health
 *   npx tsx scripts/add-niche.ts productivity
 *   npx tsx scripts/add-niche.ts history
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Predefined niches with categories
const NICHE_CONFIGS: Record<string, {
  categories: Array<{
    id: string;
    name: string;
    description: string;
    weight: number;
    examples: string[];
  }>;
}> = {
  health: {
    categories: [
      {
        id: 'nutrition_basics',
        name: 'Nutrition Basics',
        description: 'Foundational nutrition facts and myths',
        weight: 0.25,
        examples: ['Protein myths debunked', 'Calorie deficit reality', 'Why macro ratios are overrated']
      },
      {
        id: 'fitness_myths',
        name: 'Fitness Myths',
        description: 'Debunking exercise misconceptions',
        weight: 0.25,
        examples: ['Spot reduction is impossible', 'Cardio vs weights truth', 'Why rest days build muscle']
      },
      {
        id: 'sleep_science',
        name: 'Sleep Science',
        description: 'Evidence-based sleep optimization',
        weight: 0.25,
        examples: ['Blue light overblown', 'Sleep debt is real', 'The 20-minute nap rule']
      },
      {
        id: 'mental_wellness',
        name: 'Mental Wellness',
        description: 'Accessible mental health tips',
        weight: 0.25,
        examples: ['Anxiety reduction in 60 seconds', 'Dopamine detox reality', 'Why stress makes you fat']
      }
    ]
  },
  productivity: {
    categories: [
      {
        id: 'time_management',
        name: 'Time Management',
        description: 'Practical time optimization strategies',
        weight: 0.25,
        examples: ['Why to-do lists fail', 'Time blocking secrets', 'The 2-minute rule']
      },
      {
        id: 'focus_attention',
        name: 'Focus & Attention',
        description: 'Deep work and concentration techniques',
        weight: 0.25,
        examples: ['Multitasking destroys productivity', 'Flow state triggers', 'Phone addiction fixes']
      },
      {
        id: 'habit_building',
        name: 'Habit Building',
        description: 'Science-backed habit formation',
        weight: 0.25,
        examples: ['21 days is a myth', 'Habit stacking explained', 'Why motivation fails']
      },
      {
        id: 'productivity_myths',
        name: 'Productivity Myths',
        description: 'Debunking hustle culture lies',
        weight: 0.25,
        examples: ['5am club is overrated', 'Rest is productive', 'Why busy means inefficient']
      }
    ]
  },
  history: {
    categories: [
      {
        id: 'hidden_history',
        name: 'Hidden History',
        description: 'Little-known historical facts',
        weight: 0.25,
        examples: ['History they didn\'t teach', 'Forgotten inventions', 'Unknown historical figures']
      },
      {
        id: 'history_myths',
        name: 'History Myths',
        description: 'Debunking common historical misconceptions',
        weight: 0.25,
        examples: ['Columbus didn\'t discover America', 'Vikings had no horned helmets', 'Napoleon wasn\'t short']
      },
      {
        id: 'historical_parallels',
        name: 'Historical Parallels',
        description: 'History repeating in modern times',
        weight: 0.25,
        examples: ['1920s scams on TikTok', 'Ancient Rome vs America', 'Historical market crashes']
      },
      {
        id: 'bizarre_history',
        name: 'Bizarre History',
        description: 'Strange but true historical events',
        weight: 0.25,
        examples: ['Dancing plague of 1518', 'The Great Emu War', 'London Beer Flood']
      }
    ]
  },
  psychology: {
    categories: [
      {
        id: 'cognitive_biases',
        name: 'Cognitive Biases',
        description: 'Mental shortcuts that trick us',
        weight: 0.25,
        examples: ['Confirmation bias everywhere', 'Sunk cost fallacy', 'The Dunning-Kruger effect']
      },
      {
        id: 'social_psychology',
        name: 'Social Psychology',
        description: 'How others influence our behavior',
        weight: 0.25,
        examples: ['The bystander effect', 'Social proof manipulation', 'Why peer pressure works']
      },
      {
        id: 'decision_making',
        name: 'Decision Making',
        description: 'How we make choices (and fail)',
        weight: 0.25,
        examples: ['Paradox of choice', 'Decision fatigue is real', 'Why we procrastinate']
      },
      {
        id: 'psychology_myths',
        name: 'Psychology Myths',
        description: 'Debunking pop psychology',
        weight: 0.25,
        examples: ['Learning styles are fake', 'Left brain/right brain myth', 'We use 100% of our brain']
      }
    ]
  },
  science: {
    categories: [
      {
        id: 'everyday_science',
        name: 'Everyday Science',
        description: 'Science behind daily life',
        weight: 0.25,
        examples: ['Why ice is slippery', 'How microwaves work', 'Why the sky is blue']
      },
      {
        id: 'science_myths',
        name: 'Science Myths',
        description: 'Debunking scientific misconceptions',
        weight: 0.25,
        examples: ['5 second rule is false', 'Lightning strikes twice', 'Goldfish memory myth']
      },
      {
        id: 'space_facts',
        name: 'Space Facts',
        description: 'Mind-blowing space content',
        weight: 0.25,
        examples: ['A day on Venus', 'Space smells like steak', 'Neutron star density']
      },
      {
        id: 'human_body',
        name: 'Human Body',
        description: 'Fascinating body facts',
        weight: 0.25,
        examples: ['Your body replaces itself', 'Stomach acid strength', 'Eyes see upside down']
      }
    ]
  }
};

async function addNiche(niche: string) {
  const config = NICHE_CONFIGS[niche.toLowerCase()];

  if (!config) {
    console.log(`\n❌ Unknown niche: "${niche}"`);
    console.log('\nAvailable niches:');
    Object.keys(NICHE_CONFIGS).forEach(n => console.log(`  - ${n}`));
    console.log('\nOr add a custom niche by editing this script.\n');
    return;
  }

  console.log(`\n📚 Adding niche: ${niche}\n`);

  const client = await pool.connect();
  try {
    for (const cat of config.categories) {
      await client.query(`
        INSERT INTO topic_categories (id, niche, name, description, weight, examples)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          weight = EXCLUDED.weight,
          examples = EXCLUDED.examples,
          updated_at = NOW()
      `, [
        `${niche}_${cat.id}`,
        niche,
        cat.name,
        cat.description,
        cat.weight,
        cat.examples
      ]);
      console.log(`  ✓ Added category: ${cat.name}`);
    }

    console.log(`\n✅ Niche "${niche}" added with ${config.categories.length} categories\n`);
    console.log('Usage:');
    console.log(`  qualityLoop.execute({ topic, niche: '${niche}' })\n`);

  } finally {
    client.release();
    await pool.end();
  }
}

// Get niche from command line
const niche = process.argv[2];
if (!niche) {
  console.log('\nUsage: npx tsx scripts/add-niche.ts <niche>\n');
  console.log('Available niches:');
  Object.keys(NICHE_CONFIGS).forEach(n => console.log(`  - ${n}`));
  console.log('');
  process.exit(1);
}

addNiche(niche);
