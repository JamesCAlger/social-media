/**
 * Initialize Instagram Token for a Multi-Account
 *
 * Usage:
 *   npx tsx scripts/init-account-token.ts <account-slug>
 *   npx tsx scripts/init-account-token.ts <account-slug> <token>
 *
 * If no token is provided, uses INSTAGRAM_ACCESS_TOKEN from .env
 */
import 'dotenv/config';
import axios from 'axios';
import { Pool } from 'pg';

async function initAccountToken() {
  const slug = process.argv[2];
  let token = process.argv[3];

  if (!slug) {
    console.error('Usage: npx tsx scripts/init-account-token.ts <account-slug> [token]');
    console.error('\nIf no token is provided, uses INSTAGRAM_ACCESS_TOKEN from .env');
    process.exit(1);
  }

  // Use env token if not provided
  if (!token) {
    token = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!token) {
      console.error('Error: No token provided and INSTAGRAM_ACCESS_TOKEN not set in .env');
      process.exit(1);
    }
    console.log('Using token from INSTAGRAM_ACCESS_TOKEN env var');
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    console.error('Error: FACEBOOK_APP_ID and FACEBOOK_APP_SECRET must be set in .env');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Get account
    const accountResult = await pool.query(
      'SELECT id, name, slug, business_account_id FROM accounts WHERE slug = $1',
      [slug]
    );

    if (accountResult.rows.length === 0) {
      console.error(`Account not found: ${slug}`);
      process.exit(1);
    }

    const account = accountResult.rows[0];
    console.log(`\nInitializing token for account: ${account.name} (${account.slug})`);
    console.log(`Business Account ID: ${account.business_account_id}`);

    // Exchange for long-lived token
    console.log('\nExchanging for long-lived token...');
    const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: token,
      },
    });

    const newToken = response.data.access_token;
    const expiresIn = response.data.expires_in; // seconds

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    // Update account in database
    await pool.query(
      `UPDATE accounts SET access_token = $1, token_expires_at = $2 WHERE id = $3`,
      [newToken, expiresAt, account.id]
    );

    console.log('\n✅ Token initialized successfully!');
    console.log(`   Account: ${account.name}`);
    console.log(`   Expires: ${expiresAt.toLocaleString()}`);
    console.log(`   Days remaining: ${Math.floor(expiresIn / 86400)}`);
    console.log('\n   The token will auto-refresh when < 7 days remaining.');

    // Verify the token works with this business account
    console.log('\nVerifying token permissions...');
    try {
      const verifyResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${account.business_account_id}`,
        {
          params: {
            fields: 'id,username,name',
            access_token: newToken,
          },
        }
      );
      console.log(`✅ Token verified for @${verifyResponse.data.username}`);
    } catch (verifyError: any) {
      console.error(`⚠️  Warning: Could not verify token for this business account`);
      console.error(`   ${verifyError.response?.data?.error?.message || verifyError.message}`);
      console.error(`   The token may not have permissions for this Instagram account.`);
    }

  } catch (error: any) {
    if (error.response?.data?.error) {
      console.error('\nError:', error.response.data.error.message);
    } else {
      console.error('\nError:', error.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initAccountToken();
