/**
 * Copy token from config table to a multi-account
 */
import 'dotenv/config';
import { Pool } from 'pg';

async function copyConfigToken() {
  const targetSlug = process.argv[2] || 'asmr-pottery-test';

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Get token from config table
    const configResult = await pool.query(
      "SELECT value FROM config WHERE key = 'instagram_token_info'"
    );

    if (configResult.rows.length === 0) {
      console.error('No token found in config table');
      process.exit(1);
    }

    const tokenInfo = configResult.rows[0].value;
    console.log('Config table token:');
    console.log('  Token:', tokenInfo.access_token.substring(0, 30) + '...');
    console.log('  Expires:', tokenInfo.expires_at);

    // Get target account
    const targetResult = await pool.query(
      'SELECT id, name, business_account_id FROM accounts WHERE slug = $1',
      [targetSlug]
    );

    if (targetResult.rows.length === 0) {
      console.error(`Target account not found: ${targetSlug}`);
      process.exit(1);
    }

    const target = targetResult.rows[0];
    console.log(`\nTarget: ${target.name} (${targetSlug})`);
    console.log(`  Business Account ID: ${target.business_account_id}`);

    // Copy token
    await pool.query(
      'UPDATE accounts SET access_token = $1, token_expires_at = $2 WHERE id = $3',
      [tokenInfo.access_token, new Date(tokenInfo.expires_at), target.id]
    );

    console.log(`\n✅ Token copied successfully!`);

  } finally {
    await pool.end();
  }
}

copyConfigToken();
