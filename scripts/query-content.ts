import dotenv from 'dotenv';
import { Database } from '../src/core/database';

dotenv.config();

async function queryContent() {
  const database = new Database();

  try {
    const client = await database.getClient();

    console.log('\n📋 All Content in Database:\n');

    const result = await client.query(`
      SELECT
        id,
        status,
        created_at,
        idea,
        final_video_path
      FROM content
      ORDER BY created_at DESC
    `);

    client.release();

    if (result.rows.length === 0) {
      console.log('❌ No content found\n');
    } else {
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id}`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Created: ${row.created_at}`);
        console.log(`   Video: ${row.final_video_path || 'None'}`);
        console.log('');
      });
    }

    await database.close();
  } catch (error) {
    console.error('Error:', error);
    await database.close();
    process.exit(1);
  }
}

queryContent();
