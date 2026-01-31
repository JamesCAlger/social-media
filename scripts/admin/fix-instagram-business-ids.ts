import 'dotenv/config';
import { Database } from '../src/core/database';

async function fixBusinessIds() {
  const db = new Database();

  try {
    // Fix cute.fruits.asmr (cutting_fruits_asmr)
    const cuteAccount = await db.accounts.getBySlug('cutting_fruits_asmr');
    if (cuteAccount) {
      const updatedCreds = {
        ...cuteAccount.platformCredentials,
        instagram: {
          ...cuteAccount.platformCredentials?.instagram,
          businessAccountId: '17841478818271966'
        }
      };
      await db.accounts.update(cuteAccount.id, { platformCredentials: updatedCreds });
      console.log('Updated cute.fruits.asmr to businessAccountId: 17841478818271966');
    }

    // Fix sm00th.asmr (asmr-pottery-test)
    const smoothAccount = await db.accounts.getBySlug('asmr-pottery-test');
    if (smoothAccount) {
      const updatedCreds = {
        ...smoothAccount.platformCredentials,
        instagram: {
          ...smoothAccount.platformCredentials?.instagram,
          businessAccountId: '17841478034786957'
        }
      };
      await db.accounts.update(smoothAccount.id, { platformCredentials: updatedCreds });
      console.log('Updated sm00th.asmr to businessAccountId: 17841478034786957');
    }

    // Verify
    const cute = await db.accounts.getBySlug('cutting_fruits_asmr');
    const smooth = await db.accounts.getBySlug('asmr-pottery-test');
    console.log('\nVerification:');
    console.log('cute.fruits.asmr:', cute?.platformCredentials?.instagram?.businessAccountId);
    console.log('sm00th.asmr:', smooth?.platformCredentials?.instagram?.businessAccountId);

  } finally {
    await db.close();
  }
}

fixBusinessIds();
