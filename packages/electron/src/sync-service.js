"use strict";
// packages/electron/src/sync-service.ts
// Offline-first sync client for multi-user Pharmacy PMS
// Runs in the Electron main process, syncs local bundled PG with central server
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const electron_1 = require("electron");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class SyncService {
    config;
    interval = null;
    isSyncing = false;
    lastSyncAt = new Date(0).toISOString();
    onSyncCallbacks = [];
    onStatusChange = null;
    pendingQueue = [];
    queuePath;
    logPath;
    constructor(config) {
        const hostname = os.hostname();
        const deviceId = `PMS-${hostname}-${Date.now().toString(36)}`;
        this.config = {
            serverUrl: config?.serverUrl || (process.env.SYNC_SERVER_URL || 'http://localhost:3001'),
            deviceId: config?.deviceId || deviceId,
            deviceName: config?.deviceName || `Pharmacy-${hostname}`,
            syncIntervalMs: config?.syncIntervalMs || 60000,
        };
        const userDataPath = electron_1.app?.getPath?.('userData') || process.cwd();
        this.queuePath = path.join(userDataPath, 'sync-queue.json');
        this.logPath = path.join(userDataPath, 'sync-service.log');
        this.loadQueue();
    }
    start() {
        console.log(`[Sync] Starting — ${this.config.deviceName} (${this.config.deviceId})`);
        console.log(`[Sync] Server: ${this.config.serverUrl}, Interval: ${this.config.syncIntervalMs}ms`);
        this.log('Started');
        this.registerDevice().catch(() => { });
        this.sync().catch(() => { });
        this.interval = setInterval(() => this.sync(), this.config.syncIntervalMs);
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.saveQueue();
        console.log('[Sync] Stopped');
        this.log('Stopped');
    }
    onSync(callback) {
        this.onSyncCallbacks.push(callback);
    }
    onNetworkStatusChange(callback) {
        this.onStatusChange = callback;
    }
    getConfig() {
        return { ...this.config };
    }
    getPendingCount() {
        return this.pendingQueue.length;
    }
    queueChange(change) {
        this.pendingQueue.push(change);
        this.saveQueue();
        console.log(`[Sync] Queued ${change.action} for ${change.model}/${change.record.id}`);
    }
    async syncNow() {
        const result = await this.sync();
        return { success: true, accepted: result.accepted, conflicts: result.conflicts };
    }
    // ==================== PRIVATE ====================
    async sync() {
        if (this.isSyncing)
            return { accepted: 0, conflicts: 0, pulled: 0 };
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
        }
        catch (err) {
            const isServerReachable = err.message?.includes('fetch failed') || err.message?.includes('ECONNREFUSED');
            const diagnostics = isServerReachable
                ? `. Backend server (${this.config.serverUrl}) is not reachable. Ensure PostgreSQL started and backend is running.`
                : '';
            console.warn(`[Sync] Failed: ${err.message}${diagnostics}`);
            this.log(`FAILED: ${err.message}${diagnostics}`);
            this.onStatusChange?.('offline');
            this.notifyCallbacks({ success: false, message: `${err.message}${diagnostics}` });
        }
        finally {
            this.isSyncing = false;
        }
        return { accepted, conflicts, pulled };
    }
    async registerDevice() {
        try {
            const res = await fetch(`${this.config.serverUrl}/api/sync/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId: this.config.deviceId, deviceName: this.config.deviceName }),
                signal: AbortSignal.timeout(10000),
            });
            if (res.ok)
                console.log(`[Sync] Device registered`);
        }
        catch { }
    }
    async pushToServer(changes) {
        const res = await fetch(`${this.config.serverUrl}/api/sync/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: this.config.deviceId, lastSyncedAt: this.lastSyncAt, changes }),
            signal: AbortSignal.timeout(30000),
        });
        if (!res.ok)
            throw new Error(`Push failed: ${res.status}`);
        const data = await res.json();
        this.lastSyncAt = data.serverTime;
        return data;
    }
    async pullFromServer() {
        const url = `${this.config.serverUrl}/api/sync/pull?deviceId=${encodeURIComponent(this.config.deviceId)}&lastSyncedAt=${encodeURIComponent(this.lastSyncAt)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!res.ok)
            throw new Error(`Pull failed: ${res.status}`);
        return res.json();
    }
    notifyCallbacks(result) {
        for (const cb of this.onSyncCallbacks) {
            try {
                cb(result);
            }
            catch { }
        }
    }
    loadQueue() {
        try {
            if (fs.existsSync(this.queuePath)) {
                const data = fs.readFileSync(this.queuePath, 'utf-8');
                this.pendingQueue = JSON.parse(data);
                console.log(`[Sync] Loaded ${this.pendingQueue.length} queued changes`);
            }
        }
        catch { }
    }
    saveQueue() {
        try {
            fs.writeFileSync(this.queuePath, JSON.stringify(this.pendingQueue), 'utf-8');
        }
        catch { }
    }
    log(msg) {
        try {
            const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
            fs.appendFileSync(this.logPath, `[${ts}] ${msg}\n`, 'utf-8');
        }
        catch { }
    }
}
exports.SyncService = SyncService;
//# sourceMappingURL=sync-service.js.map