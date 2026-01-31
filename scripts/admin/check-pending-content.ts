import dotenv from 'dotenv';
import { Database } from '../src/core/database';

dotenv.config();

async function check() {
  const db = new Database();
  const client = await db.getClient();

  try {
    const result = await client.query(`
      SELECT c.id, c.status, c.account_id, a.name as account_name,
             CASE WHEN c.r2_url IS NOT NULL THEN 'Yes' ELSE 'No' END as has_r2
      FROM content c
      LEFT JOIN accounts a ON c.account_id = a.id
      WHERE c.status IN ('approved', 'review_pending')
      ORDER BY c.created_at DESC
      LIMIT 5
    `);
    console.log('Pending/Approved content:');
    if (result.rows.length === 0) {
      console.log('None found');
    } else {
      result.rows.forEach(row => {
        console.log(`- ID: ${row.id.slice(0,8)}... | Status: ${row.status} | Account: ${row.account_name || 'NONE'} | Has R2: ${row.has_r2}`);
      });
    }
  } finally {
    client.release();
    await db.close();
  }
}
check();
