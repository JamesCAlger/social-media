import dotenv from 'dotenv';
import { Database } from '../src/core/database';

dotenv.config();

async function checkInteractions() {
  const database = new Database();

  try {
    const client = await database.getClient();

    console.log('\n📊 Recent Telegram Interactions:\n');

    const result = await client.query(`
      SELECT
        id,
        content_id,
        action,
        username,
        user_id,
        processed_at,
        callback_data
      FROM telegram_interactions
      ORDER BY processed_at DESC
      LIMIT 10
    `);

    client.release();

    if (result.rows.length === 0) {
      console.log('❌ No interactions found\n');
    } else {
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. Action: ${row.action}`);
        console.log(`   Content ID: ${row.content_id}`);
        console.log(`   User: ${row.username} (${row.user_id})`);
        console.log(`   Time: ${row.processed_at}`);
        console.log(`   Callback: ${row.callback_data}`);
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

checkInteractions();
