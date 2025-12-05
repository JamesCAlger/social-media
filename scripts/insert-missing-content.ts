import dotenv from 'dotenv';
import { Database } from '../src/core/database';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function insertMissingContent() {
  const contentId = '24ad4a85-c303-4041-a957-cd847a1ff8ff';
  const contentPath = path.join(process.cwd(), 'content', contentId);
  const ideaPath = path.join(contentPath, 'idea.json');
  const compositionPath = path.join(contentPath, 'composition.json');

  console.log('\n🔧 Inserting Missing Content Record\n');
  console.log(`Content ID: ${contentId}\n`);

  if (!fs.existsSync(ideaPath)) {
    console.error('❌ idea.json not found');
    process.exit(1);
  }

  const ideaData = JSON.parse(fs.readFileSync(ideaPath, 'utf-8'));
  const compositionData = fs.existsSync(compositionPath)
    ? JSON.parse(fs.readFileSync(compositionPath, 'utf-8'))
    : null;

  const database = new Database();

  try {
    const client = await database.getClient();

    // Check if already exists
    const checkResult = await client.query(
      'SELECT id FROM content WHERE id = $1',
      [contentId]
    );

    if (checkResult.rows.length > 0) {
      console.log('✅ Content already exists in database\n');
      client.release();
      await database.close();
      return;
    }

    // Insert content record
    await client.query(
      `INSERT INTO content (
        id,
        idea,
        caption,
        cultural_context,
        environment,
        sound_concept,
        status,
        final_video_path,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        contentId,
        ideaData.idea,
        ideaData.caption,
        ideaData.culturalContext,
        ideaData.environment,
        ideaData.soundConcept,
        'review_pending',
        compositionData ? compositionData.finalVideo.storagePath : null,
      ]
    );

    client.release();

    console.log('✅ Content record inserted successfully!\n');
    console.log('Details:');
    console.log(`   ID: ${contentId}`);
    console.log(`   Idea: ${ideaData.idea}`);
    console.log(`   Status: review_pending`);
    console.log('');

    await database.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await database.close();
    process.exit(1);
  }
}

insertMissingContent();
