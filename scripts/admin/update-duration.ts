import 'dotenv/config';
import { Database } from '../src/core/database';

async function updateDuration() {
  const db = new Database();
  try {
    const account = await db.accounts.getAccountBySlug('cutting_fruits_asmr');
    if (!account) {
      console.error('Account not found');
      process.exit(1);
    }

    console.log('Current strategy:', JSON.stringify(account.contentStrategy, null, 2));

    const updatedStrategy = {
      ...account.contentStrategy,
      segmentCount: 1,
      segmentDuration: 10,
      videoLength: 10,
    };

    await db.accounts.updateAccount(account.id, { contentStrategy: updatedStrategy });
    console.log('\nUpdated to: 1 segment, 5 seconds');
  } finally {
    await db.close();
  }
}

updateDuration().catch(console.error);
