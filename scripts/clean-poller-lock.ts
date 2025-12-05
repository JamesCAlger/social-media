import fs from 'fs';
import path from 'path';

/**
 * Clean Poller Lock File
 *
 * Removes the Telegram poller lock file.
 * Use this if the poller crashed and left a stale lock file.
 */

const LOCK_FILE = path.join(process.cwd(), '.telegram-poller.lock');

function cleanLockFile() {
  console.log('\n🧹 Cleaning Telegram Poller Lock File...\n');

  if (fs.existsSync(LOCK_FILE)) {
    try {
      // Try to read lock file info first
      const lockContent = fs.readFileSync(LOCK_FILE, 'utf-8');
      const lockData = JSON.parse(lockContent);

      console.log('📄 Lock file found:');
      console.log(`   File: ${LOCK_FILE}`);
      console.log(`   PID: ${lockData.pid}`);
      console.log(`   Started: ${new Date(lockData.startTime).toLocaleString()}`);
      console.log('');

      // Delete the lock file
      fs.unlinkSync(LOCK_FILE);

      console.log('✅ Lock file deleted successfully!\n');
      console.log('You can now start the poller with:');
      console.log('   npm run telegram-poller\n');
    } catch (error) {
      // If we can't read it, just delete it
      try {
        fs.unlinkSync(LOCK_FILE);
        console.log('✅ Corrupted lock file deleted successfully!\n');
      } catch (deleteError) {
        console.error('❌ Failed to delete lock file:', deleteError);
        console.error(`   You may need to manually delete: ${LOCK_FILE}\n`);
        process.exit(1);
      }
    }
  } else {
    console.log('ℹ️  No lock file found at:');
    console.log(`   ${LOCK_FILE}`);
    console.log('\n✅ Nothing to clean!\n');
  }
}

cleanLockFile();
