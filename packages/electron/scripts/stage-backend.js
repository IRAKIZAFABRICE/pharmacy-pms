// scripts/stage-backend.js
// Staging script for electron-builder packaging
// Copies backend dist, frontend dist, prisma, and required node_modules

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const ELECTRON_DIR = path.resolve(__dirname, '..');
const STAGED_DIR = path.join(ELECTRON_DIR, 'staged');
const BACKEND_DIR = path.join(ROOT, 'packages', 'backend');
const FRONTEND_DIR = path.join(ROOT, 'packages', 'frontend');
const FRONTEND_STAGED_DIR = path.join(ELECTRON_DIR, 'resources', 'frontend-dist');

const ROOT_NM = path.join(ROOT, 'node_modules');
const BACKEND_NM = path.join(BACKEND_DIR, 'node_modules');

const DB_NAME = 'pharmacy_prod';
const DB_PORT = 15555;

const EXCLUDE_PACKAGES = new Set([
  'electron', 'electron-builder', 'electron-winstaller', 'electron-publish',
  'app-builder-lib', 'dmg-builder', 'electron-builder-squirrel-windows',
  '@aws-sdk', '@smithy', '@aws', 'typescript', 'ts-node', 'nodemon',
  'node-gyp', 'node-abi', 'node-api-version', '@electron', '@electron-internal',
  '@malept', '@peculiar', '@sindresorhus', '@szmarczak', '@xmldom', 'pkijs',
  'asn1js', 'bytestreamjs', 'webcrypto-core', 'pvtsutils', 'pvutils', 'resedit',
  'pe-library', 'chromium-pickle-js', 'dir-compare', 'ejs', 'jake', 'filelist',
  'proper-lockfile', 'sanitize-filename', 'stat-mode', 'sumchecker', 'unzipper',
  'read-binary-file-arch', 'tiny-async-pool', 'compare-version', 'hosted-git-info',
  'lazy-val', 'lodash.escaperegexp', 'lodash.isequal', 'roarr', 'serialize-error',
  'global-agent', 'globalthis', 'detect-node', 'boolean', 'es6-error', 'matcher',
  'async-exit-hook', 'at-least-node', 'dotenv-expand', 'truncate-utf8-bytes',
  'utf8-byte-length', 'cross-dirname', 'postject', 'pharmacy-electron',
  'backend', 'node-postgres', 'frontend', '.package-lock.json',
]);

function shouldExclude(name) {
  if (EXCLUDE_PACKAGES.has(name)) return true;
  if (name === '@types') return true;
  if (name === '.bin') return true;
  return false;
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`  ⚠️  Source not found: ${src}`);
    return;
  }
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      try {
        const realPath = fs.realpathSync(srcPath);
        if (fs.statSync(realPath).isDirectory()) {
          copyRecursive(realPath, destPath);
        } else {
          fs.copyFileSync(realPath, destPath);
        }
      } catch {
        // skip unresolvable symlinks
      }
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (e) {
        // skip files that can't be copied
      }
    }
  }
}

function copyFrontendAssets() {
  console.log('📁 Staging Frontend UI...');
  const frontendDist = path.join(FRONTEND_DIR, 'dist');
  if (!fs.existsSync(frontendDist)) {
    console.log('   ⚠️  Frontend build directory not found. Building frontend...');
    try {
      execSync('npm run build', { cwd: FRONTEND_DIR, stdio: 'inherit' });
    } catch (e) {
      console.error('   ❌ Failed to build frontend UI.');
      return;
    }
  }
  if (fs.existsSync(FRONTEND_STAGED_DIR)) {
    fs.rmSync(FRONTEND_STAGED_DIR, { recursive: true, force: true });
  }
  copyRecursive(frontendDist, FRONTEND_STAGED_DIR);
  console.log('   ✅ Frontend UI successfully staged to: resources/frontend-dist');
}

function copyAllNodeModules(backendStaged) {
  console.log('📁 Copying node_modules (direct copy with exclusions)...');
  const nmStaged = path.join(backendStaged, 'node_modules');

  if (fs.existsSync(BACKEND_NM)) {
    console.log('   Copying from backend/node_modules...');
    copyRecursive(BACKEND_NM, nmStaged);
  }

  if (fs.existsSync(ROOT_NM)) {
    console.log('   Copying from root/node_modules...');
    const entries = fs.readdirSync(ROOT_NM, { withFileTypes: true });
    for (const entry of entries) {
      if (shouldExclude(entry.name)) continue;
      if (entry.isSymbolicLink()) continue;
      const srcPath = path.join(ROOT_NM, entry.name);
      const destPath = path.join(nmStaged, entry.name);
      if (!fs.existsSync(destPath)) {
        if (entry.isDirectory()) {
          copyRecursive(srcPath, destPath);
        } else {
          try {
            fs.copyFileSync(srcPath, destPath);
          } catch (e) {
            // skip
          }
        }
      }
    }
  }

  const prismaGenSources = [
    path.join(BACKEND_NM, '.prisma'),
    path.join(ROOT_NM, '.prisma'),
  ];
  for (const src of prismaGenSources) {
    if (fs.existsSync(src)) {
      copyRecursive(src, path.join(nmStaged, '.prisma'));
      console.log('   ✅ Prisma generated client copied');
      break;
    }
  }

  const binSources = [BACKEND_NM, ROOT_NM];
  for (const source of binSources) {
    const binSrc = path.join(source, '.bin');
    if (!fs.existsSync(binSrc)) continue;
    const binDest = path.join(nmStaged, '.bin');
    fs.mkdirSync(binDest, { recursive: true });
    const binFiles = fs.readdirSync(binSrc);
    let binCopied = 0;
    for (const file of binFiles) {
      if (file.includes('prisma')) {
        try {
          fs.copyFileSync(path.join(binSrc, file), path.join(binDest, file));
          binCopied++;
        } catch (e) {
          try {
            const target = fs.readlinkSync(path.join(binSrc, file));
            fs.copyFileSync(target, path.join(binDest, file));
            binCopied++;
          } catch (e2) { /* ignore */ }
        }
      }
    }
    if (binCopied > 0) {
      console.log(`   ✅ .bin/ copied (${binCopied} Prisma executables)`);
      break;
    }
  }

  console.log('   ✅ node_modules copied');
}

function verifyPrismaInstallation(backendStaged) {
  console.log('📁 Verifying Prisma and Database driver installation...');
  const nmStaged = path.join(backendStaged, 'node_modules');
  const checks = [
    { path: path.join(nmStaged, 'prisma'), name: 'prisma package' },
    { path: path.join(nmStaged, '@prisma', 'client'), name: '@prisma/client' },
    { path: path.join(nmStaged, '@prisma', 'engines'), name: '@prisma/engines' },
    { path: path.join(nmStaged, '.bin', 'prisma.cmd'), name: 'prisma.cmd' },
    { path: path.join(nmStaged, '.bin', 'prisma'), name: 'prisma executable' },
    { path: path.join(nmStaged, 'pg'), name: 'pg driver' },
    { path: path.join(nmStaged, 'express'), name: 'express' },
    { path: path.join(nmStaged, 'depd'), name: 'depd (transitive)' },
    { path: path.join(nmStaged, 'body-parser'), name: 'body-parser' },
    { path: path.join(nmStaged, 'cors'), name: 'cors' },
  ];
  let allFound = true;
  for (const check of checks) {
    if (fs.existsSync(check.path)) {
      console.log(`   ✅ ${check.name} verified`);
    } else {
      console.warn(`   ⚠️  ${check.name} not found`);
      allFound = false;
    }
  }
  return allFound;
}

console.log('========================================');
console.log('  Staging Backend & Frontend for Electron');
console.log('========================================\n');

if (fs.existsSync(STAGED_DIR)) {
  console.log('🧹 Cleaning staged directory...');
  try {
    fs.rmSync(STAGED_DIR, { recursive: true, force: true });
  } catch (e) {
    console.log('   fs.rmSync failed, trying rmdir...');
    try {
      execSync(`rmdir /s /q "${STAGED_DIR}"`, { stdio: 'ignore' });
    } catch (e2) {
      console.warn('   ⚠️  Could not clean staged directory, continuing anyway...');
    }
  }
}

const backendStaged = path.join(STAGED_DIR, 'backend');
fs.mkdirSync(backendStaged, { recursive: true });

console.log('📁 Copying backend dist...');
const distSrc = path.join(BACKEND_DIR, 'dist');
if (fs.existsSync(distSrc)) {
  copyRecursive(distSrc, path.join(backendStaged, 'dist'));
  console.log('   ✅ dist/ copied');
} else {
  console.warn('   ⚠️  dist/ not found — run npm run build --workspace=backend first');
}

console.log('📁 Copying package.json...');
const pkgSrc = path.join(BACKEND_DIR, 'package.json');
if (fs.existsSync(pkgSrc)) {
  fs.copyFileSync(pkgSrc, path.join(backendStaged, 'package.json'));
  console.log('   ✅ package.json copied');
}

console.log('📁 Copying prisma schema and migrations...');
const prismaSrc = path.join(BACKEND_DIR, 'prisma');
if (fs.existsSync(prismaSrc)) {
  copyRecursive(prismaSrc, path.join(backendStaged, 'prisma'));
  console.log('   ✅ prisma/ copied');
}

copyAllNodeModules(backendStaged);
copyFrontendAssets();

const verified = verifyPrismaInstallation(backendStaged);

console.log('📁 Creating Prisma config for production...');
const prismaConfigContent = `// prisma.config.ts - Production config for Pharmacy PMS
import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    db: {
      provider: 'postgresql',
      url: process.env.DATABASE_URL || 'postgresql://postgres:Admin@123@localhost:${DB_PORT}/${DB_NAME}',
    },
  },
});
`;
fs.writeFileSync(path.join(backendStaged, 'prisma.config.ts'), prismaConfigContent);
console.log('   ✅ prisma.config.ts created');

console.log('📁 Creating Prisma version file...');
fs.writeFileSync(path.join(backendStaged, '.prisma-version'), '5.22.0');
console.log('   ✅ .prisma-version created');

console.log('📁 Creating .env file...');
const envContent = `DATABASE_URL=postgresql://postgres:Admin@123@localhost:${DB_PORT}/${DB_NAME}
PORT=3001
NODE_ENV=production
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
`;
fs.writeFileSync(path.join(backendStaged, '.env'), envContent);
console.log('   ✅ .env created');

console.log('\n✅ Staging complete!');
console.log(`   Staged at: ${STAGED_DIR}`);
console.log(`   Prisma & DB driver installed: ${verified ? '✅ YES' : '⚠️  INCOMPLETE'}`);
console.log('');
