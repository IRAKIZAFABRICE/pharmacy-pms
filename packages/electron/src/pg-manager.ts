// packages/electron/src/pg-manager.ts
// Manages embedded PostgreSQL 18.4 lifecycle for the Pharmacy PMS Electron app

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { execSync, ChildProcess, spawn } from 'child_process';

export interface PGConfig {
  dataDir: string;
  port: number;
  binariesDir: string;
  password: string;
  database: string;
  username: string;
  databaseOwner: string;
}

/**
 * Derives a safe PostgreSQL identifier from a Windows username.
 * Replaces special chars, lowercases, max 63 chars.
 */
function sanitizeDbIdentifier(username: string): string {
  return username
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 63);
}

export class PGManager {
  private process: ChildProcess | null = null;
  private config: PGConfig;
  private isStarting: boolean = false;
  private startPromise: Promise<void> | null = null;
  private setupDone: boolean = false;

  constructor() {
    const appDataDir = path.join(app.getPath('appData'), 'pharmacy-pms');
    const dataDir = path.join(appDataDir, 'pgdata');
    let binariesDir: string;
    if (app.isPackaged) {
      binariesDir = path.join(process.resourcesPath, 'pgsql', 'bin');
    } else {
      binariesDir = path.join(app.getAppPath(), '..', '..', 'postgresql-18.4-2-windows-x64-binaries', 'pgsql', 'bin');
    }

    const windowsUser = process.env.USERNAME || 'default';
    const safeUser = sanitizeDbIdentifier(windowsUser);

    this.config = {
      dataDir,
      port: 15555,
      binariesDir,
      password: 'Admin@123',
      database: `pharmacy_db_${safeUser}`,
      username: 'postgres',
      databaseOwner: safeUser,
    };
  }

  getBinPath(tool: string): string {
    return path.join(this.config.binariesDir, `${tool}.exe`);
  }

  getConfig(): PGConfig {
    return this.config;
  }

  private logToFile(message: string): void {
    try {
      const logPath = path.join(this.config.dataDir, 'pg_manager.log');
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, 'utf-8');
    } catch {
      // ignore
    }
  }

  private cleanStaleLockFiles(): void {
    const { dataDir } = this.config;
    const files = ['postmaster.pid', 'postmaster.opts'];
    for (const file of files) {
      const fp = path.join(dataDir, file);
      if (!fs.existsSync(fp)) continue;
      try {
        const content = fs.readFileSync(fp, 'utf-8');
        const pid = parseInt(content.split('\n')[0], 10);
        let alive = false;
        try {
          execSync(`tasklist /FI "PID eq ${pid}" /NH 2>nul | findstr /R "${pid}"`, {
            stdio: 'pipe',
            timeout: 1000,
          });
          alive = true;
        } catch {
          alive = false;
        }
        if (!alive) {
          fs.unlinkSync(fp);
          console.log(`[PG-Manager] Removed stale ${file} (PID ${pid} dead)`);
        } else {
          console.log(`[PG-Manager] Killing active PID ${pid}`);
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe', timeout: 1000 });
          } catch { /* ignore */ }
          fs.unlinkSync(fp);
        }
      } catch {
        // ignore malformed files
      }
    }
  }

  async init(): Promise<void> {
    const { dataDir, binariesDir, port, username } = this.config;
    console.log(`[PG-Manager] Initializing PostgreSQL...`);
    console.log(`[PG-Manager]   Data dir: ${dataDir}`);
    console.log(`[PG-Manager]   Binaries: ${binariesDir}`);
    console.log(`[PG-Manager]   Port: ${port}`);
    this.logToFile(`init() — Data dir: ${dataDir}, Port: ${port}`);

    const parentDir = path.dirname(dataDir);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const pgHbaPath = path.join(dataDir, 'pg_hba.conf');
    if (fs.existsSync(pgHbaPath)) {
      console.log(`[PG-Manager] Data directory already initialized at ${dataDir}`);
      this.updateConfigFiles('trust');
      return;
    }

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const initdbPath = this.getBinPath('initdb');
    try {
      execSync(
        `"${initdbPath}" -D "${dataDir}" --encoding=UTF8 --locale=en-US --username=${username} --auth=trust`,
        { stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 }
      );
      console.log(`[PG-Manager] initdb completed`);
    } catch (err: any) {
      throw new Error(`initdb failed: ${err.stderr?.toString() || err.message}`);
    }

    this.updateConfigFiles('trust');
    console.log(`[PG-Manager] init() complete`);
  }

  private updateConfigFiles(hbaMode: 'trust' | 'md5' = 'trust'): void {
    const { dataDir, port } = this.config;
    const confPath = path.join(dataDir, 'postgresql.conf');
    const hbaPath = path.join(dataDir, 'pg_hba.conf');

    if (fs.existsSync(confPath)) {
      let conf = fs.readFileSync(confPath, 'utf-8');
      conf = conf.replace(/^#?port\s*=\s*\d+/m, `port = ${port}`);
      if (!conf.includes('port =')) conf += `\nport = ${port}`;
      conf = conf.replace(/^#?listen_addresses\s*=.*/m, `listen_addresses = '*'`);
      if (!conf.includes('listen_addresses')) conf += `\nlisten_addresses = '*'`;
      conf = conf.replace(/^#?logging_collector\s*=.*/m, `logging_collector = off`);
      if (!conf.includes('logging_collector')) conf += `\nlogging_collector = off`;
      conf = conf.replace(/^#?fsync\s*=.*/m, `fsync = off`);
      fs.writeFileSync(confPath, conf, 'utf-8');
      console.log(`[PG-Manager] postgresql.conf: port=${port}`);
    }

    if (fs.existsSync(hbaPath)) {
      let hba = fs.readFileSync(hbaPath, 'utf-8');
      if (hbaMode === 'md5') {
        hba = hba.replace(/^(local\s+all\s+all\s+)trust/m, '$1md5');
        hba = hba.replace(/^(host\s+all\s+all\s+127\.0\.0\.1\/32\s+)trust/m, '$1md5');
        hba = hba.replace(/^(host\s+all\s+all\s+::1\/128\s+)trust/m, '$1md5');
      } else if (hbaMode === 'trust') {
        hba = hba.replace(/^(local\s+all\s+all\s+)md5/m, '$1trust');
        hba = hba.replace(/^(host\s+all\s+all\s+127\.0\.0\.1\/32\s+)md5/m, '$1trust');
        hba = hba.replace(/^(host\s+all\s+all\s+::1\/128\s+)md5/m, '$1trust');
      }
      fs.writeFileSync(hbaPath, hba, 'utf-8');
    }
  }

  /**
   * Start PostgreSQL in the background without waiting for readiness.
   * Returns quickly so the UI can load immediately.
   */
  async startBackground(): Promise<void> {
    if (this.isStarting) {
      return this.startPromise || Promise.resolve();
    }

    if (this.isRunning()) {
      console.log('[PG-Manager] Already running');
      return;
    }

    this.isStarting = true;
    this.startPromise = this.startPostgresWithoutLog();
    try {
      await this.startPromise;
    } finally {
      this.isStarting = false;
      this.startPromise = null;
    }
  }

  /**
   * Start PostgreSQL and wait for it to be ready, then set up the database.
   */
  async start(): Promise<void> {
    await this.startBackground();
    await this.waitForReady();
  }

  private async startPostgresWithoutLog(): Promise<void> {
    const { dataDir } = this.config;
    const pgCtlPath = this.getBinPath('pg_ctl');

    try {
      execSync('taskkill /F /IM postgres.exe 2>nul', { stdio: 'pipe', timeout: 2000 });
    } catch { /* ignore */ }

    this.cleanStaleLockFiles();

    const args = [
      '-D', dataDir,
      'start',
      '-o', '-c logging_collector=off -c log_destination=stderr -c fsync=off'
    ];

    this.process = spawn(pgCtlPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let output = '';
    let hasStarted = false;

    if (this.process.stdout) {
      this.process.stdout.on('data', (data) => {
        const msg = data.toString();
        output += msg;
        if (msg.includes('server started') || msg.includes('LOG:')) {
          hasStarted = true;
        }
      });
    }

    if (this.process.stderr) {
      this.process.stderr.on('data', (data) => {
        const msg = data.toString();
        output += msg;
        if (msg.includes('server started') || msg.includes('LOG:')) {
          hasStarted = true;
        }
      });
    }

    this.process.on('error', () => { /* ignore — will detect via isRunning */ });

    this.process.on('close', () => {
      if (output.includes('server is running') || output.includes('already running')) {
        return;
      }
      if (hasStarted || output.includes('server started')) {
        return;
      }
      console.warn(`[PG-Manager] pg_ctl output: ${output.substring(0, 200)}`);
    });

    // Quick fallback: if pg_ctl doesn't report in 10s, check if PG is actually running
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          if (this.isRunning()) {
            console.log('[PG-Manager] PostgreSQL is running');
            this.process.kill();
          }
        }
        resolve();
      }, 10000);
    });
  }

  /**
   * Wait for PostgreSQL to be ready, then run database setup (password + database creation).
   */
  async waitForReady(): Promise<void> {
    if (this.setupDone && this.isRunning()) {
      console.log('[PG-Manager] PostgreSQL already ready');
      return;
    }

    const isReadyPath = this.getBinPath('pg_isready');
    const { port } = this.config;
    let ready = false;

    for (let i = 0; i < 15; i++) {
      try {
        execSync(`"${isReadyPath}" -h localhost -p ${port} -q`, {
          stdio: 'pipe',
          timeout: 1000,
        });
        console.log('[PG-Manager] PostgreSQL ready');
        ready = true;
        break;
      } catch {
        // not ready yet
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!ready) {
      // Fallback: try direct psql connection
      try {
        const psqlPath = this.getBinPath('psql');
        execSync(
          `"${psqlPath}" -h localhost -p ${port} -U postgres -c "SELECT 1"`,
          { stdio: 'pipe', timeout: 2000 }
        );
        console.log('[PG-Manager] PostgreSQL ready (fallback)');
        ready = true;
      } catch {
        // Still not ready
      }
    }

    if (!ready) {
      throw new Error(`PostgreSQL not ready within 15s on port ${port}`);
    }

    // Setup database only once
    if (!this.setupDone) {
      await this.setupDatabase();
      this.setupDone = true;
    }
  }

  private async setupDatabase(): Promise<void> {
    const { port, password, dataDir } = this.config;
    const psqlPath = this.getBinPath('psql');
    const pgCtlPath = this.getBinPath('pg_ctl');

    try {
      // Check if already configured
      try {
        execSync(
          `set PGPASSWORD=${password} && "${psqlPath}" -h localhost -p ${port} -U postgres -c "SELECT 1"`,
          { stdio: 'pipe', timeout: 3000 }
        );
        console.log('[PG-Manager] Password already set');
      } catch {
        // Set password (pg_hba is trust at this point, so no password needed)
        execSync(
          `"${psqlPath}" -h localhost -p ${port} -U postgres -c "ALTER USER postgres WITH PASSWORD '${password}';"`,
          { stdio: 'pipe', timeout: 5000 }
        );
        console.log('[PG-Manager] Password set');

        // Switch to md5 and reload
        this.updateConfigFiles('md5');
        execSync(`"${pgCtlPath}" -D "${dataDir}" reload`, { stdio: 'pipe', timeout: 3000 });
        console.log('[PG-Manager] md5 auth active');
      }

      // Check if database exists
      try {
        execSync(
          `set PGPASSWORD=${password} && "${psqlPath}" -h localhost -p ${port} -U postgres -l | findstr "${this.config.database}"`,
          { stdio: 'pipe', timeout: 3000 }
        );
        console.log(`[PG-Manager] Database '${this.config.database}' already exists`);
      } catch {
        execSync(
          `set PGPASSWORD=${password} && "${psqlPath}" -h localhost -p ${port} -U postgres -c "CREATE DATABASE ${this.config.database}"`,
          { stdio: 'pipe', timeout: 10000 }
        );
        console.log(`[PG-Manager] Database '${this.config.database}' created`);
      }
    } catch (err: any) {
      const stderr = err.stderr?.toString() || '';
      if (!stderr.includes('already exists')) {
        console.warn(`[PG-Manager] Setup warning: ${stderr || err.message}`);
      }
    }
  }

  async stop(): Promise<void> {
    if (!this.process && !this.isRunning()) return;
    const { dataDir } = this.config;
    const pgCtlPath = this.getBinPath('pg_ctl');

    // 1. Try graceful shutdown first (fast mode)
    try {
      execSync(`"${pgCtlPath}" -D "${dataDir}" stop -m fast`, {
        stdio: 'pipe',
        timeout: 5000,
      });
      console.log('[PG-Manager] Stopped gracefully');
    } catch (err: any) {
      console.warn(`[PG-Manager] Graceful stop failed: ${err.stderr?.toString() || err.message}`);
    }

    // 2. Wait briefly for graceful shutdown to take effect
    await new Promise((r) => setTimeout(r, 500));

    // 3. Force-kill any remaining postgres processes
    try {
      execSync('taskkill /F /IM postgres.exe /T', { stdio: 'ignore', timeout: 3000 });
      console.log('[PG-Manager] Force-killed remaining postgres.exe processes');
    } catch {
      // Nothing left running — good
    }

    // 4. Clean up stale lock files if the server is down
    if (!this.isRunning()) {
      this.cleanStaleLockFiles();
    }

    this.process = null;
    this.setupDone = false;
  }

  isRunning(): boolean {
    const { port } = this.config;
    try {
      const isReadyPath = this.getBinPath('pg_isready');
      execSync(`"${isReadyPath}" -h localhost -p ${port} -q`, {
        stdio: 'pipe',
        timeout: 1000,
      });
      return true;
    } catch {
      return false;
    }
  }

  getConnectionString(): string {
    const { port, database, password, username } = this.config;
    return `postgresql://${username}:${encodeURIComponent(password)}@localhost:${port}/${database}`;
  }

  private copyDirectoryRecursive(src: string, dest: string): void {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, entry.name);
      const d = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this.copyDirectoryRecursive(s, d);
      } else {
        fs.copyFileSync(s, d);
      }
    }
  }
}

export const pgManager = new PGManager();
