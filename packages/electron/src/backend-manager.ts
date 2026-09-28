// packages/electron/src/backend-manager.ts
// Manages backend server lifecycle for the Pharmacy PMS Electron app

import { spawn, ChildProcess, execSync } from 'child_process';
import path from 'path';
import net from 'net';
import { app, dialog } from 'electron';
import { pgManager } from './pg-manager';
import fs from 'fs';

function killProcessOnPort(port: number): void {
  try {
    const result = execSync(`netstat -ano | findstr ":${port}" | findstr "LISTENING"`, { encoding: 'utf8' });
    const lines = result.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(Number(pid))) {
        execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' });
      }
    }
  } catch (e) {
    // port is free or no process found
  }
}

function killAllNode(): void {
  try {
    execSync(`taskkill /F /IM node.exe /T`, { stdio: 'ignore' });
  } catch {}
}

export class BackendManager {
  private process: ChildProcess | null = null;
  private isStarting: boolean = false;

  async start(): Promise<void> {
    if (this.isStarting) return;
    this.isStarting = true;

    try {
      console.log('[Backend] Checking for zombie on port 3001...');
      killProcessOnPort(3001);
      await new Promise(r => setTimeout(r, 1500));

      if (await this.isRunning()) {
        console.log('[Backend] Already running');
        return;
      }

      console.log('[Backend] Waiting for PostgreSQL...');
      await pgManager.waitForReady();

      const targetPort = app.isPackaged ? 15555 : 5432;
      const isPgUp = await this.checkPgPort(targetPort);
      if (!isPgUp) throw new Error(`PostgreSQL failed to start on port ${targetPort}`);

      await this.ensureDatabaseExists();
      await this.runMigrations();
      await this.startBackendProcess();

    } catch (error: any) {
      console.error('[Backend] Startup failed:', error.message);
      dialog.showErrorBox('Startup Failed', error.message);
      app.quit();
      throw error;
    } finally {
      this.isStarting = false;
    }
  }

  private async ensureDatabaseExists(): Promise<void> {
    const dbName = app.isPackaged ? 'pharmacy_prod' : 'pharmacy_dev';
    const pg = require('pg');
    const client = new pg.Client({
      host: 'localhost',
      port: app.isPackaged ? 15555 : 5432,
      user: 'postgres',
      password: app.isPackaged ? 'Admin@123' : 'postgres',
      database: 'postgres'
    });
    try {
      await client.connect();
      const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
      if (res.rowCount === 0) {
        console.log(`[Backend] Creating database: ${dbName}`);
        await client.query(`CREATE DATABASE "${dbName}"`);
      }
    } finally {
      await client.end();
    }
  }

  private async checkPgPort(port: number): Promise<boolean> {
    const pg = require('pg');
    const client = new pg.Client({
      host: 'localhost',
      port,
      user: 'postgres',
      password: app.isPackaged ? 'Admin@123' : 'postgres',
      database: 'postgres',
      connectionTimeoutMillis: 1000
    });
    try {
      await client.connect();
      await client.end();
      return true;
    } catch {
      return false;
    }
  }

  public async isRunning(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = net.createConnection({ port: 3001, host: 'localhost' });
      req.once('connect', () => {
        req.end();
        resolve(true);
      });
      req.once('error', () => {
        resolve(false);
      });
    });
  }

  private getBackendPaths() {
    if (!app.isPackaged) {
      const backendDir = path.join(__dirname, '..', '..', 'backend');
      return {
        backendPath: path.join(backendDir, 'dist', 'index.js'),
        nodeModulesPath: path.join(backendDir, 'node_modules'),
        backendDir
      };
    } else {
      const backendDir = path.join(process.resourcesPath, 'backend');
      return {
        backendPath: path.join(backendDir, 'dist', 'index.js'),
        nodeModulesPath: path.join(backendDir, 'node_modules'),
        backendDir
      };
    }
  }

  private async runMigrations(): Promise<void> {
    const { backendDir, nodeModulesPath } = this.getBackendPaths();
    const dbName = app.isPackaged ? 'pharmacy_prod' : 'pharmacy_dev';
    console.log('[Backend] Running Prisma migrations...');
    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      DATABASE_URL: `postgresql://postgres:Admin@123@localhost:15555/${dbName}`,
      NODE_PATH: nodeModulesPath,
    };
    const prismaCli = path.join(nodeModulesPath, 'prisma', 'build', 'index.js');
    if (!fs.existsSync(prismaCli)) {
      console.warn('[Backend] Prisma CLI not found, skipping migrations');
      return;
    }
    try {
      const output = execSync(`"${process.execPath}" "${prismaCli}" migrate deploy`, {
        cwd: backendDir,
        env,
        encoding: 'utf8',
        timeout: 60000,
      });
      console.log('[Backend] Migrations output:', output);
      console.log('[Backend] Prisma migrations completed');
    } catch (e: any) {
      console.error('[Backend] Migration failed:', e.message);
    }

    await this.runSeed(env, backendDir);
  }

  private async runSeed(env: NodeJS.ProcessEnv, backendDir: string): Promise<void> {
    const seedJs = path.join(backendDir, 'prisma', 'seed.js');
    const seedTs = path.join(backendDir, 'prisma', 'seed.ts');
    const seedPath = fs.existsSync(seedJs) ? seedJs : (fs.existsSync(seedTs) ? seedTs : null);

    if (!seedPath) {
      console.warn('[Backend] Seed script not found, skipping');
      return;
    }

    console.log('[Backend] Running database seed...');
    try {
      const output = execSync(`"${process.execPath}" "${seedPath}"`, {
        cwd: backendDir,
        env,
        encoding: 'utf8',
        timeout: 60000,
      });
      console.log('[Backend] Seed output:', output);
      console.log('[Backend] Database seed completed');
    } catch (e: any) {
      console.error('[Backend] Seed failed:', e.message);
    }
  }

  private async startBackendProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { backendPath, nodeModulesPath, backendDir } = this.getBackendPaths();
      const dbName = app.isPackaged ? 'pharmacy_prod' : 'pharmacy_dev';

      if (app.isPackaged) {
        (module as any).paths.unshift(nodeModulesPath);
      }

      const env = {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        DATABASE_URL: `postgresql://postgres:Admin@123@localhost:15555/${dbName}`,
        PORT: '3001',
        NODE_ENV: app.isPackaged ? 'production' : 'development',
        NODE_PATH: nodeModulesPath,
      };

      console.log(`[Backend] Starting with DB: ${dbName}`);
      const nodePath = process.execPath;

      this.process = spawn(nodePath, [backendPath], {
        env,
        windowsHide: true,
        cwd: backendDir,
      });

      let resolved = false;
      this.process.stdout?.on('data', (data) => {
        const str = data.toString();
        console.log(`[Backend] ${str}`);
        if (!resolved && str.includes('3001')) {
          resolved = true;
          resolve();
        }
      });
      this.process.stderr?.on('data', (data) => console.error(`[Backend ERR] ${data}`));
      this.process.on('error', (err) => reject(err));
      this.process.on('exit', (code) => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Backend exited with code ${code}`));
        }
      });

      setTimeout(() => { if (!resolved) resolve(); }, 5000);
    });
  }

  async stop(): Promise<void> {
    if (this.process) {
      console.log('[Backend] Stopping...');
      try {
        const pid = this.process.pid;
        if (pid) {
          execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' });
        } else {
          this.process.kill('SIGTERM');
        }
      } catch {
        // Process may already be dead
      }
      this.process = null;
    }
    killProcessOnPort(3001);

    try {
      execSync('taskkill /F /IM "Pharmacy PMS.exe" /T', { stdio: 'ignore' });
    } catch {
      // Already dead
    }
    try {
      execSync('taskkill /F /IM node.exe /T', { stdio: 'ignore' });
    } catch {
      // Already dead
    }
  }
}

export const backendManager = new BackendManager();
