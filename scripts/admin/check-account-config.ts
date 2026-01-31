import dotenv from 'dotenv';
dotenv.config();
import { Database } from '../src/core/database';

async function check() {
  const db = new Database();
  const client = await db.getClient();

  // Check the content's account_id
  const content = await client.query("SELECT id, account_id, idea FROM content WHERE id = '63ed6bb8-dda1-4beb-9106-e17df4553d2c'");
  console.log('Content account_id:', content.rows[0]?.account_id || 'NULL');
  console.log('Idea:', content.rows[0]?.idea?.substring(0, 80));

  // Check accounts table structure
  const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'accounts'");
  console.log('\nAccounts table columns:', cols.rows.map(r => r.column_name).join(', '));

  // Check all accounts
  const accounts = await client.query('SELECT * FROM accounts');
  console.log('\nAll accounts:');
  console.log(JSON.stringify(accounts.rows, null, 2));

  // Check env variable
  console.log('\nENV INSTAGRAM_BUSINESS_ACCOUNT_ID:', process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID);

  client.release();
  await db.close();
}
check();
