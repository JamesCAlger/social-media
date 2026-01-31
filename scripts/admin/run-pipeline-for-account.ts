import 'dotenv/config';
import { MultiAccountOrchestrator } from '../src/core/multi-account-orchestrator';

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error('Usage: npx tsx scripts/run-pipeline-for-account.ts <account-slug>');
    process.exit(1);
  }

  console.log(`\n🚀 Running pipeline for account: ${slug}\n`);

  const orchestrator = new MultiAccountOrchestrator();

  try {
    const result = await orchestrator.runForAccountBySlug(slug);

    if (result.success) {
      console.log('\n✅ Pipeline completed successfully!');
      console.log('   Content ID:', result.contentId);
      console.log('   Duration:', Math.round(result.duration / 1000), 'seconds');
      if (result.cost) {
        console.log('   Cost: $' + result.cost.toFixed(2));
      }
    } else {
      console.error('\n❌ Pipeline failed:', result.error);
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
