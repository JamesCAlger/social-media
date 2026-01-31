/**
 * Check all token locations
 */
import 'dotenv/config';
import { Pool } from 'pg';

async function checkTokens() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Check config table
    console.log('=== Config Table (Single-Account System) ===');
    const configResult = await pool.query(
      "SELECT key, value FROM config WHERE key = 'instagram_token_info'"
    );

    if (configResult.rows.length > 0) {
      const tokenInfo = configResult.rows[0].value;
      console.log('Token found in config table:');
      console.log('  Token:', tokenInfo.access_token?.substring(0, 30) + '...');
      console.log('  Expires:', tokenInfo.expires_at);
    } else {
      console.log('No token in config table');
    }

    // Check accounts table
    console.log('\n=== Accounts Table (Multi-Account System) ===');
    const accountsResult = await pool.query(`
      SELECT name, slug,
             CASE WHEN access_token IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as token_status,
             token_expires_at
      FROM accounts
      ORDER BY name
    `);

    for (const row of accountsResult.rows) {
      console.log(`${row.name} (${row.slug}):`);
      console.log(`  Token: ${row.token_status}`);
      console.log(`  Expires: ${row.token_expires_at || 'N/A'}`);
    }

    // Check env var
    console.log('\n=== Environment Variable ===');
    const envToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (envToken) {
      console.log('INSTAGRAM_ACCESS_TOKEN:', envToken.substring(0, 30) + '...');
    } else {
      console.log('INSTAGRAM_ACCESS_TOKEN: NOT SET');
    }

  } finally {
    await pool.end();
  }
}

checkTokens();
