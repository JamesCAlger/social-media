import 'dotenv/config';
import { Database } from '../src/core/database';

async function updateToken() {
  const newToken = process.argv[2];

  if (!newToken) {
    console.error('Usage: npx tsx scripts/update-instagram-token.ts <token>');
    process.exit(1);
  }

  const db = new Database();
  const client = await db.getClient();

  // Token expires in 60 days
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const tokenInfo = {
    access_token: newToken,
    expires_at: expiresAt,
  };

  try {
    // Update or insert the token info
    await client.query(`
      INSERT INTO config (key, value)
      VALUES ('instagram_token_info', $1)
      ON CONFLICT (key) DO UPDATE SET value = $1
    `, [JSON.stringify(tokenInfo)]);

    console.log('Token updated successfully!');
    console.log('Expires at:', expiresAt);
  } finally {
    client.release();
    await db.close();
  }
}

updateToken();
