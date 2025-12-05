/**
 * Font Setup Script
 * Downloads required fonts for text overlays
 */

import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const FONTS_DIR = path.resolve('./assets/fonts');

// Google Fonts download URL (using GitHub mirror for direct TTF access)
const FONT_URLS: Record<string, string> = {
  'Montserrat-Bold.ttf':
    'https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Bold.ttf',
  'Montserrat-SemiBold.ttf':
    'https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-SemiBold.ttf',
  'Montserrat-Regular.ttf':
    'https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Regular.ttf',
  'Montserrat-Medium.ttf':
    'https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Medium.ttf',
};

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);

    const request = (urlToFetch: string) => {
      https.get(urlToFetch, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            request(redirectUrl);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest).catch(() => {});
        reject(err);
      });
    };

    request(url);
  });
}

async function main() {
  console.log('Setting up fonts for text overlays...\n');

  // Ensure fonts directory exists
  await fs.mkdir(FONTS_DIR, { recursive: true });
  console.log(`Font directory: ${FONTS_DIR}\n`);

  // Download each font
  for (const [filename, url] of Object.entries(FONT_URLS)) {
    const destPath = path.join(FONTS_DIR, filename);

    // Check if already exists
    try {
      await fs.access(destPath);
      console.log(`[SKIP] ${filename} already exists`);
      continue;
    } catch {
      // File doesn't exist, download it
    }

    console.log(`[DOWNLOAD] ${filename}...`);
    try {
      await downloadFile(url, destPath);
      console.log(`[OK] ${filename} downloaded successfully`);
    } catch (error) {
      console.error(`[ERROR] Failed to download ${filename}:`, error);
    }
  }

  console.log('\nFont setup complete!');
  console.log('\nInstalled fonts:');
  const files = await fs.readdir(FONTS_DIR);
  const ttfFiles = files.filter((f) => f.endsWith('.ttf'));
  ttfFiles.forEach((f) => console.log(`  - ${f}`));

  if (ttfFiles.length === 0) {
    console.log('  (no fonts installed)');
    console.log('\nPlease manually download fonts from https://fonts.google.com/specimen/Montserrat');
  }
}

main().catch(console.error);
