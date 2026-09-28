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
export declare class SyncService {
    private config;
    private interval;
    private isSyncing;
    private lastSyncAt;
    private onSyncCallbacks;
    private onStatusChange;
    private pendingQueue;
    private queuePath;
    private logPath;
    constructor(config?: Partial<SyncConfig>);
    start(): void;
    stop(): void;
    onSync(callback: (result: {
        success: boolean;
        message: string;
    }) => void): void;
    onNetworkStatusChange(callback: (status: 'online' | 'offline' | 'syncing') => void): void;
    getConfig(): SyncConfig;
    getPendingCount(): number;
    queueChange(change: SyncChange): void;
    syncNow(): Promise<{
        success: boolean;
        accepted: number;
        conflicts: number;
    }>;
    private sync;
    private registerDevice;
    private pushToServer;
    private pullFromServer;
    private notifyCallbacks;
    private loadQueue;
    private saveQueue;
    private log;
}
//# sourceMappingURL=sync-service.d.ts.map