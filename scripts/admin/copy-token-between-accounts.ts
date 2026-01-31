/**
 * Copy token from one account to another
 *
 * Usage: npx tsx scripts/copy-token-between-accounts.ts <source-slug> <target-slug>
 */
import 'dotenv/config';
import { Pool } from 'pg';

async function copyToken() {
  const sourceSlug = process.argv[2] || 'cutting_fruits_asmr';
  const targetSlug = process.argv[3] || 'asmr-pottery-test';

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Get source account token
    const sourceResult = await pool.query(
      'SELECT id, name, access_token, token_expires_at FROM accounts WHERE slug = $1',
      [sourceSlug]
    );

    if (sourceResult.rows.length === 0) {
      console.error(`Source account not found: ${sourceSlug}`);
      process.exit(1);
    }

    const source = sourceResult.rows[0];

    if (!source.access_token) {
      console.error(`Source account ${sourceSlug} has no token set`);
      process.exit(1);
    }

    console.log(`Source: ${source.name} (${sourceSlug})`);
    console.log(`  Token: ${source.access_token.substring(0, 20)}...`);
    console.log(`  Expires: ${source.token_expires_at}`);

    // Get target account
    const targetResult = await pool.query(
      'SELECT id, name FROM accounts WHERE slug = $1',
      [targetSlug]
    );

    if (targetResult.rows.length === 0) {
      console.error(`Target account not found: ${targetSlug}`);
      process.exit(1);
    }

    const target = targetResult.rows[0];
    console.log(`\nTarget: ${target.name} (${targetSlug})`);

    // Copy token
    await pool.query(
      'UPDATE accounts SET access_token = $1, token_expires_at = $2 WHERE id = $3',
      [source.access_token, source.token_expires_at, target.id]
    );

    console.log(`\n✅ Token copied successfully!`);
    console.log(`   From: ${source.name}`);
    console.log(`   To: ${target.name}`);

  } finally {
    await pool.end();
  }
}

copyToken();
