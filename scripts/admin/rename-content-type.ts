import { Database } from '../src/core/database';

async function rename() {
  const db = new Database();
  try {
    const account = await db.accounts.getAccountBySlug('cutting_fruits_asmr');
    if (!account) {
      console.error('Account not found');
      process.exit(1);
    }

    if (!account.contentTypes || account.contentTypes.length === 0) {
      console.error('No content types found');
      process.exit(1);
    }

    const contentTypes = account.contentTypes.map(ct => ({
      ...ct,
      name: ct.name === 'glass-fruit-cutting' ? 'kawaii-jelly-fruit' : ct.name
    }));

    await db.accounts.updateAccount(account.id, { contentTypes });
    console.log('Content type renamed to: kawaii-jelly-fruit');
  } finally {
    await db.close();
  }
}

rename().catch(console.error);
