import { Database } from '../src/core/database';

async function checkApproval() {
  const db = new Database();

  try {
    const contentId = '09226cd6-3444-4a2e-815f-b74e39649205';

    const content = await db.getContent(contentId);

    if (content) {
      console.log('\n✅ Content Found in Database:\n');
      console.log(`ID: ${content.id}`);
      console.log(`Status: ${content.status}`);
      console.log(`Reviewed By: ${content.reviewed_by || 'N/A'}`);
      console.log(`Reviewed At: ${content.reviewed_at || 'N/A'}\n`);

      if (content.status === 'approved') {
        console.log('🎉 APPROVAL SUCCESSFUL! Content is ready for distribution.\n');
      }
    } else {
      console.log('❌ Content not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.close();
  }
}

checkApproval();
