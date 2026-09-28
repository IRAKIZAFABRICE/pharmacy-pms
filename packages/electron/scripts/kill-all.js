// scripts/kill-all.js
// Force-kills all Pharmacy PMS background processes (app, backend, PostgreSQL, Electron)
// WITHOUT killing the current npm/node process tree that's running this script.
//
// Usage: node scripts/kill-all.js
// This is called automatically before builds via the "kill:all" npm script.

const { execSync } = require('child_process');

// ========== 1. Kill app-specific processes ==========
// These are safe to kill by image name — they are never the build process.
const appProcesses = ['Pharmacy PMS.exe', 'postgres.exe', 'electron.exe'];
for (const name of appProcesses) {
  try {
    execSync(`taskkill /F /T /IM "${name}" 2>nul`, { stdio: 'ignore' });
    console.log(`  ✅ Killed ${name}`);
  } catch {
    // Process not running — fine
  }
}

// ========== 2. Kill orphaned node.exe processes ==========
// We must NOT kill the current process tree (npm → this script).
// Only kill node.exe processes that are NOT ancestors of this script.
function getAncestorPids(pid) {
  const ancestors = new Set([pid]);
  let current = pid;
  for (let i = 0; i < 10; i++) {
    try {
      // Use PowerShell to get parent PID (wmic is deprecated on Windows 11)
      const result = execSync(
        `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=${current}').ParentProcessId"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      const parentPid = parseInt(result.trim(), 10);
      if (!parentPid || parentPid <= 0 || ancestors.has(parentPid)) break;
      ancestors.add(parentPid);
      current = parentPid;
    } catch {
      break;
    }
  }
  return ancestors;
}

try {
  const protectedPids = getAncestorPids(process.pid);
  console.log(`  🔒 Protected PIDs (current process tree): ${[...protectedPids].join(', ')}`);

  // Find all node.exe processes using tasklist (universally available)
  const result = execSync(
    'tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH',
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
  );
  const lines = result.split('\n').filter((l) => l.trim());
  const pids = [];
  for (const line of lines) {
    // CSV format: "node.exe","1234","Console","1","12,345 K"
    const match = line.match(/"node\.exe","(\d+)"/);
    if (match) {
      const pid = parseInt(match[1], 10);
      if (!protectedPids.has(pid)) {
        pids.push(pid);
      }
    }
  }

  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid} /T`, { stdio: 'ignore' });
      console.log(`  ✅ Killed orphaned node.exe (PID ${pid})`);
    } catch {
      // Already dead
    }
  }
  if (pids.length === 0) {
    console.log('  ℹ️  No orphaned node.exe processes found');
  }
} catch (e) {
  console.log('  ⚠️  Could not enumerate node.exe processes, skipping');
}

console.log('✅ kill:all complete');