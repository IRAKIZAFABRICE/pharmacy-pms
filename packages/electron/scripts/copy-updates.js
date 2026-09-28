// scripts/copy-updates.js
// Copies build artifacts to the local update server folder
const fs = require('fs');
const path = require('path');

const RELEASE_DIR = path.join(__dirname, '..', 'release');
const UPDATES_DIR = 'C:\\updates\\pharmacy-pms\\win';

console.log('========================================');
console.log('  Copying Updates to Local Server');
console.log('========================================\n');

// Create updates directory if it doesn't exist
if (!fs.existsSync(UPDATES_DIR)) {
  fs.mkdirSync(UPDATES_DIR, { recursive: true });
  console.log(`📁 Created updates directory: ${UPDATES_DIR}`);
}

// Check if release directory exists
if (!fs.existsSync(RELEASE_DIR)) {
  console.error('❌ Release directory not found. Run "npm run dist" or "npm run pack" first.');
  process.exit(1);
}

// Get all files in release directory
const files = fs.readdirSync(RELEASE_DIR);

// Files to copy
let copied = 0;

for (const file of files) {
  // Copy all .exe, .yml, .blockmap files
  if (file.endsWith('.exe') || file.endsWith('.yml') || file.endsWith('.blockmap')) {
    const srcPath = path.join(RELEASE_DIR, file);
    const destPath = path.join(UPDATES_DIR, file);
    
    // Skip if it's the uninstaller
    if (file.includes('uninstaller')) {
      continue;
    }

    fs.copyFileSync(srcPath, destPath);
    copied++;
    
    const stats = fs.statSync(srcPath);
    const size = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✅ Copied: ${file} (${size} MB)`);

    // Also copy to root updates folder for easier access
    if (file.endsWith('.exe') && !file.includes('uninstaller')) {
      const rootDest = path.join('C:\\updates', file);
      fs.copyFileSync(srcPath, rootDest);
    }
  }
}

console.log(`\n✅ ${copied} files copied successfully!`);
console.log(`📁 Updates available at: ${UPDATES_DIR}`);
console.log('🌐 Server URL: http://localhost:3000/updates/');
console.log('');