// packages/electron/src/sync-service.ts
// Offline-first sync client for multi-user Pharmacy PMS
// Runs in the Electron main process, syncs local bundled PG with central server

import { app } from 'electron';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export interface SyncConfig {
  serverUrl: string;
  deviceId: string;
  deviceName: string;
  syncIntervalMs: number;
}

export interface SyncChange {
  model: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED';
  record: any;
  version: number;
}

export interface SyncPushResult {
  accepted: number;
  conflicts: number;
  serverTime: string;
}

export interface SyncPullResult {
  changes: SyncChange[];
  serverTime: string;
  count: number;
}

export class SyncService {
  private config: SyncConfig;
  private interval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private lastSyncAt: string = new Date(0).toISOString();
  private onSyncCallbacks: Array<(result: { success: boolean; message: string }) => void> = [];
  private onStatusChange: ((status: 'online' | 'offline' | 'syncing') => void) | null = null;
  private pendingQueue: SyncChange[] = [];
  private queuePath: string;
  private logPath: string;

  constructor(config?: Partial<SyncConfig>) {
    const hostname = os.hostname();
    const deviceId = `PMS-${hostname}-${Date.now().toString(36)}`;
    this.config = {
      serverUrl: config?.serverUrl || (process.env.SYNC_SERVER_URL || 'http://localhost:3001'),
      deviceId: config?.deviceId || deviceId,
      deviceName: config?.deviceName || `Pharmacy-${hostname}`,
      syncIntervalMs: config?.syncIntervalMs || 60000,
    };

    const userDataPath = app?.getPath?.('userData') || process.cwd();
    this.queuePath = path.join(userDataPath, 'sync-queue.json');
    this.logPath = path.join(userDataPath, 'sync-service.log');
    this.loadQueue();
  }

  start(): void {
    console.log(`[Sync] Starting — ${this.config.deviceName} (${this.config.deviceId})`);
    console.log(`[Sync] Server: ${this.config.serverUrl}, Interval: ${this.config.syncIntervalMs}ms`);
    this.log('Started');

    this.registerDevice().catch(() => {});
    this.sync().catch(() => {});
    this.interval = setInterval(() => this.sync(), this.config.syncIntervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.saveQueue();
    console.log('[Sync] Stopped');
    this.log('Stopped');
  }

  onSync(callback: (result: { success: boolean; message: string }) => void): void {
    this.onSyncCallbacks.push(callback);
  }

  onNetworkStatusChange(callback: (status: 'online' | 'offline' | 'syncing') => void): void {
    this.onStatusChange = callback;
  }

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  getPendingCount(): number {
    return this.pendingQueue.length;
  }

  queueChange(change: SyncChange): void {
    this.pendingQueue.push(change);
    this.saveQueue();
    console.log(`[Sync] Queued ${change.action} for ${change.model}/${change.record.id}`);
  }

  async syncNow(): Promise<{ success: boolean; accepted: number; conflicts: number }> {
    const result = await this.sync();
    return { success: true, accepted: result.accepted, conflicts: result.conflicts };
  }

  // ==================== PRIVATE ====================

  private async sync(): Promise<{ accepted: number; conflicts: number; pulled: number }> {
    if (this.isSyncing) return { accepted: 0, conflicts: 0, pulled: 0 };
    this.isSyncing = true;
    this.onStatusChange?.('syncing');

    let accepted = 0, conflicts = 0, pulled = 0;

    try {
      // Push queued changes
      if (this.pendingQueue.length > 0) {
        console.log(`[Sync] Pushing ${this.pendingQueue.length} changes...`);
        const pushResult = await this.pushToServer(this.pendingQueue);
        accepted = pushResult.accepted;
        conflicts = pushResult.conflicts;
        if (accepted > 0) {
          this.pendingQueue = this.pendingQueue.slice(accepted);
          this.saveQueue();
        }
      }

      // Pull remote changes
      console.log('[Sync] Pulling...');
      const pullResult = await this.pullFromServer();
      pulled = pullResult.count;

      this.log(`OK — pushed: ${accepted}, pulled: ${pulled}, conflicts: ${conflicts}`);
      this.onStatusChange?.('online');
      this.notifyCallbacks({
        success: true,
        message: `Synced ${accepted}↑ ${pulled}↓${conflicts > 0 ? ` ⚠${conflicts}` : ''}`,
      });

    } catch (err: any) {
      const isServerReachable = err.message?.includes('fetch failed') || err.message?.includes('ECONNREFUSED');
      const diagnostics = isServerReachable
        ? `. Backend server (${this.config.serverUrl}) is not reachable. Ensure PostgreSQL started and backend is running.`
        : '';
      console.warn(`[Sync] Failed: ${err.message}${diagnostics}`);
      this.log(`FAILED: ${err.message}${diagnostics}`);
      this.onStatusChange?.('offline');
      this.notifyCallbacks({ success: false, message: `${err.message}${diagnostics}` });
    } finally {
      this.isSyncing = false;
    }

    return { accepted, conflicts, pulled };
  }

  private async registerDevice(): Promise<void> {
    try {
      const res = await fetch(`${this.config.serverUrl}/api/sync/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: this.config.deviceId, deviceName: this.config.deviceName }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) console.log(`[Sync] Device registered`);
    } catch {}
  }

  private async pushToServer(changes: SyncChange[]): Promise<SyncPushResult> {
    const res = await fetch(`${this.config.serverUrl}/api/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: this.config.deviceId, lastSyncedAt: this.lastSyncAt, changes }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Push failed: ${res.status}`);
    const data = await res.json();
    this.lastSyncAt = data.serverTime;
    return data;
  }

  private async pullFromServer(): Promise<SyncPullResult> {
    const url = `${this.config.serverUrl}/api/sync/pull?deviceId=${encodeURIComponent(this.config.deviceId)}&lastSyncedAt=${encodeURIComponent(this.lastSyncAt)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
    return res.json();
  }

  private notifyCallbacks(result: { success: boolean; message: string }): void {
    for (const cb of this.onSyncCallbacks) {
      try { cb(result); } catch {}
    }
  }

  private loadQueue(): void {
    try {
      if (fs.existsSync(this.queuePath)) {
        const data = fs.readFileSync(this.queuePath, 'utf-8');
        this.pendingQueue = JSON.parse(data);
        console.log(`[Sync] Loaded ${this.pendingQueue.length} queued changes`);
      }
    } catch {}
  }

  private saveQueue(): void {
    try {
      fs.writeFileSync(this.queuePath, JSON.stringify(this.pendingQueue), 'utf-8');
    } catch {}
  }

  private log(msg: string): void {
    try {
      const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
      fs.appendFileSync(this.logPath, `[${ts}] ${msg}\n`, 'utf-8');
    } catch {}
  }
}
