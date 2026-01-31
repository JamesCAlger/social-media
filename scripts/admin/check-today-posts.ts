import dotenv from 'dotenv';
import { Database } from '../src/core/database';

dotenv.config();

async function check() {
  const db = new Database();
  const client = await db.getClient();

  try {
    const result = await client.query(`
      SELECT c.id, c.status, c.created_at, pp.platform, pp.post_id, pp.posted_at
      FROM content c
      LEFT JOIN platform_posts pp ON c.id = pp.content_id
      WHERE c.created_at >= CURRENT_DATE
      ORDER BY c.created_at DESC
      LIMIT 10
    `);
    console.log("Today's content:");
    if (result.rows.length === 0) {
      console.log('No content created today.');
    } else {
      result.rows.forEach(row => {
        const id = row.id.slice(0, 8);
        console.log(`- ID: ${id}... | Status: ${row.status} | Created: ${row.created_at} | Platform: ${row.platform || 'N/A'} | Posted: ${row.posted_at || 'N/A'}`);
      });
    }

    // Also check recent posts
    const recent = await client.query(`
      SELECT c.id, c.status, c.created_at, pp.platform, pp.posted_at
      FROM content c
      LEFT JOIN platform_posts pp ON c.id = pp.content_id
      ORDER BY c.created_at DESC
      LIMIT 5
    `);
    console.log('\nMost recent content (any date):');
    recent.rows.forEach(row => {
      const id = row.id.slice(0, 8);
      console.log(`- ID: ${id}... | Status: ${row.status} | Created: ${row.created_at} | Posted: ${row.posted_at || 'N/A'}`);
    });

  } catch (e) {
    console.error('Error:', e);
  } finally {
    client.release();
    await db.close();
  }
}
check();
