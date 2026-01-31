import 'dotenv/config';
import { Pool } from 'pg';

async function setupSmoothAsmr() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Update the asmr-pottery-test account with sm00th.asmr details
    const result = await pool.query(`
      UPDATE accounts
      SET
        business_account_id = $1,
        is_active = true,
        name = $2
      WHERE slug = $3
      RETURNING id, name, slug, business_account_id, is_active
    `, ['17841478034786957', 'sm00th.asmr', 'asmr-pottery-test']);

    if (result.rows.length === 0) {
      console.error('Account not found!');
      return;
    }

    const account = result.rows[0];
    console.log('✅ Updated account:');
    console.log('   ID:', account.id);
    console.log('   Name:', account.name);
    console.log('   Slug:', account.slug);
    console.log('   Business Account ID:', account.business_account_id);
    console.log('   Active:', account.is_active);

  } finally {
    await pool.end();
  }
}

setupSmoothAsmr();
