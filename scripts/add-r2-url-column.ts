import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addR2UrlColumn() {
  const client = await pool.connect();

  try {
    console.log('Adding r2_url column to content table...');

    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'content' AND column_name = 'r2_url';
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ r2_url column already exists!');
      return;
    }

    // Add r2_url column
    await client.query(`
      ALTER TABLE content ADD COLUMN r2_url TEXT;
    `);

    console.log('✅ r2_url column added successfully!');
  } catch (error) {
    console.error('❌ Error adding r2_url column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addR2UrlColumn();
