import 'dotenv/config';
import { Database } from '../src/core/database';

async function fixAccountIds() {
  const db = new Database();

  // Update cute.fruits.asmr with correct ID
  const cuteAccount = await db.accounts.getAccountBySlug('cutting_fruits_asmr');
  if (cuteAccount) {
    await db.accounts.updateAccount(cuteAccount.id, {
      platforms: {
        ...cuteAccount.platforms,
        instagram: {
          ...cuteAccount.platforms?.instagram,
          businessAccountId: '17841478818271966'
        }
      }
    });
    console.log('✅ Updated cute.fruits.asmr: 17841478818271966');
  }

  // Update .env reference for sm00th.asmr (already correct: 17841478034786957)
  console.log('✅ sm00th.asmr uses .env: 17841478034786957');

  console.log('\nAccount IDs fixed!');
  await db.close();
}

fixAccountIds();
