import dotenv from 'dotenv';
import { Database } from '../src/core/database';

dotenv.config();

async function checkContent() {
  const database = new Database();

  try {
    console.log('\n📋 Checking recent content...\n');

    const client = await database.getClient();
    const result = await client.query(`
      SELECT
        id,
        status,
        created_at,
        LEFT(idea, 60) as idea_preview,
        final_video_path
      FROM content
      ORDER BY created_at DESC
      LIMIT 5
    `);
    client.release();

    if (result.rows.length === 0) {
      console.log('❌ No content found in database\n');
      process.exit(0);
    }

    console.log('Recent Content:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Created: ${new Date(row.created_at).toLocaleString()}`);
      console.log(`   Idea: ${row.idea_preview}...`);
      console.log(`   Video: ${row.final_video_path || 'Not generated'}`);
      console.log('');
    });

    await database.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await database.close();
    process.exit(1);
  }
}

checkContent();
